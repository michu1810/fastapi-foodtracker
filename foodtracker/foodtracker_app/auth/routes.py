from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, UploadFile, File, Path as FastAPIPath, \
	Cookie, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from foodtracker_app.utils.recaptcha import verify_recaptcha
from foodtracker_app.db.database import get_async_session
from foodtracker_app.models.user import User
from foodtracker_app.models.product import Product
from foodtracker_app.models.financial_stats import FinancialStat
from foodtracker_app.auth.schemas import UserCreate, ProductCreate, ProductOut, ProductExpiringSoon, \
	UserProfile, ChangePasswordRequest, ProductStats, Achievement, ProductActionRequest, FinancialStatsOut, TrendData, \
	ProductActionResponse
from foodtracker_app.auth.utils import hash_password, verify_password, create_access_token, trigger_verification_email, \
	send_reset_password_email, create_refresh_token, decode_token
from foodtracker_app.services import achievement_service
from foodtracker_app.auth.dependancies import get_current_user
from typing import List
from datetime import date, timedelta, datetime, timezone, UTC
from decimal import Decimal
import uuid
import shutil
from pathlib import Path
from fastapi.responses import JSONResponse
from jose import JWTError
from sqlalchemy import func, case, cast, Date
from foodtracker_app.settings import settings
from rate_limiter import limiter
import magic

MEDIA_DIR = Path(__file__).resolve().parent.parent / "uploads" / "avatars"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_URL = "/uploads/avatars/"

auth_router = APIRouter()
product_router = APIRouter()


@auth_router.post("/me/avatar", tags=["Auth"])
async def upload_avatar(
		file: UploadFile = File(...),
		user: User = Depends(get_current_user),
		db: AsyncSession = Depends(get_async_session),
):
	import magic

	MAX_FILE_SIZE = 5 * 1024 * 1024

	file_content = await file.read()
	await file.seek(0)

	if len(file_content) > MAX_FILE_SIZE:
		raise HTTPException(413, "Plik jest za duży. Maksymalny rozmiar to 5MB.")

	mime_type = magic.from_buffer(file_content, mime=True)
	if mime_type not in {"image/png", "image/jpeg"}:
		raise HTTPException(400, "Niepoprawny typ MIME. Dozwolone: PNG, JPG.")

	extension = ".jpg" if mime_type == "image/jpeg" else ".png"
	filename = f"user_{user.id}{extension}"
	path = MEDIA_DIR / filename

	with open(path, "wb") as out:
		shutil.copyfileobj(file.file, out)

	user.avatar_url = MEDIA_URL + filename
	await db.commit()

	return {"avatar_url": user.avatar_url}


@limiter.limit("5/day")
@auth_router.post("/register", tags=["Auth"])
async def register(
		request: Request,
		payload: dict,
		db: AsyncSession = Depends(get_async_session)
):
	email = payload.get("email")
	password = payload.get("password")
	recaptcha_token = payload.get("recaptcha_token")

	if not all([email, password, recaptcha_token]):
		raise HTTPException(status_code=400, detail="Incomplete registration data")

	is_valid = await verify_recaptcha(recaptcha_token)
	if not is_valid:
		raise HTTPException(status_code=400, detail="Invalid reCAPTCHA")

	result = await db.execute(select(User).where(User.email == email))
	existing_user = result.scalar_one_or_none()
	if existing_user:
		if existing_user.social_provider and existing_user.social_provider != "password":
			raise HTTPException(status_code=400,
			                    detail=f"Ten e-mail jest powiązany z logowaniem przez {existing_user.social_provider}.")
		else:
			raise HTTPException(status_code=400, detail="Email already registered")

	new_user = User(
		email=email,
		hashed_password=hash_password(password),
		social_provider="password"
	)
	db.add(new_user)

	await db.commit()
	await db.refresh(new_user)

	await trigger_verification_email(new_user, db)

	return {"message": "User created successfully. Sprawdź email, by aktywować konto."}


@auth_router.get("/verify", tags=["Auth"])
async def verify_account(token: str, db: AsyncSession = Depends(get_async_session)):
	result = await db.execute(select(User).where(User.verification_token == token))
	user = result.scalar_one_or_none()

	if user:
		if user.token_expires_at and user.token_expires_at < datetime.now(timezone.utc):
			return {"status": "expired"}

		if user.is_verified:
			return {"status": "used"}

		user.is_verified = True
		user.verification_token = f"used:{token}"
		user.token_expires_at = None
		await db.commit()
		return {"status": "success"}

	result = await db.execute(
		select(User).where(User.verification_token == f"used:{token}")
	)
	used_user = result.scalar_one_or_none()

	if used_user:
		return {"status": "used"}

	return {"status": "invalid"}


@auth_router.post("/resend-verification", tags=["Auth"])
async def resend_verification_email(payload: dict = Body(...), db: AsyncSession = Depends(get_async_session)):
	email = payload.get("email")
	if not email:
		raise HTTPException(status_code=400, detail="Email is required.")
	result = await db.execute(select(User).where(User.email == email))
	user = result.scalar_one_or_none()
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	if user.is_verified:
		raise HTTPException(status_code=400, detail="Account already verified")
	if user.token_expires_at and user.token_expires_at > datetime.now(UTC) - timedelta(seconds=60):
		raise HTTPException(status_code=429, detail="Odczekaj minutę przed ponownym wysłaniem.")
	await trigger_verification_email(user, db)
	return {"message": "Verification email resent."}


@auth_router.post("/login", tags=["Auth"])
async def login(user_credentials: UserCreate,
                db: AsyncSession = Depends(get_async_session)):
	result = await db.execute(select(User).where(User.email == user_credentials.email))
	db_user = result.scalar_one_or_none()

	if not db_user or not verify_password(user_credentials.password, db_user.hashed_password):
		raise HTTPException(status_code=401, detail="Invalid credentials")

	if not db_user.is_verified:
		raise HTTPException(status_code=403, detail="Zweryfikuj email przed zalogowaniem")

	user_provider_value = db_user.social_provider if db_user.social_provider else "password"

	access_token = create_access_token({"sub": db_user.email, "provider": user_provider_value})
	refresh_token = create_refresh_token({"sub": db_user.email, "provider": user_provider_value})

	response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
	response.set_cookie(
		key="refresh_token",
		value=refresh_token,
		httponly=True,
		secure=settings.IS_PRODUCTION,
		samesite="strict",
		path="/auth"
	)
	return response


@auth_router.post("/logout", tags=["Auth"])
async def logout(response: Response, user: User = Depends(get_current_user)):
	response.delete_cookie("refresh_token", path="/", domain=None)
	return {"message": f"User {user.email} logged_out"}


@auth_router.get("/me", response_model=UserProfile, tags=["Auth"])
async def get_me(user: User = Depends(get_current_user)):
	return {
		"id": user.id,
		"email": user.email,
		"createdAt": user.created_at,
		"avatar_url": user.avatar_url,
		"provider": user.social_provider if user.social_provider else "password",
	}


@product_router.post("/create", response_model=ProductOut, tags=["Products"], status_code=201)
async def create_product(
		product_data: ProductCreate,
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	final_expiration_date = product_data.expiration_date
	if product_data.is_fresh_product:
		if not product_data.purchase_date:
			raise HTTPException(status_code=422, detail="Brakuje daty zakupu dla świeżego produktu.")
		final_expiration_date = product_data.purchase_date + timedelta(days=product_data.shelf_life_days or 5)

	if not final_expiration_date:
		raise HTTPException(status_code=422, detail="Data ważności jest wymagana dla tego typu produktu.")

	if final_expiration_date < date.today():
		raise HTTPException(status_code=422, detail="Data ważności nie może być z przeszłości.")

	new_product = Product(
		name=product_data.name,
		expiration_date=final_expiration_date,
		user_id=user.id,
		external_id=product_data.external_id,
		price=Decimal(str(product_data.price)),
		unit=product_data.unit,
		initial_amount=Decimal(str(product_data.initial_amount)),
		current_amount=Decimal(str(product_data.initial_amount))
	)
	db.add(new_product)
	await db.commit()
	await db.refresh(new_product)
	return new_product


async def get_product_and_stats(product_id: int, user: User, db: AsyncSession):
	product_result = await db.execute(
		select(Product).where(Product.id == product_id, Product.user_id == user.id)
	)
	product = product_result.scalar_one_or_none()

	if not product:
		return None, None

	stats_result = await db.execute(
		select(FinancialStat).where(FinancialStat.user_id == user.id)
	)
	financial_stat = stats_result.scalar_one_or_none()

	if not financial_stat:
		financial_stat = FinancialStat(user_id=user.id)
		db.add(financial_stat)
		await db.flush()
		await db.refresh(financial_stat)

	return product, financial_stat


async def _handle_product_action(
		action_type: str,
		product: Product,
		financial_stat: FinancialStat,
		amount: Decimal,
		user: User,
		db: AsyncSession
):
	achievements_before = await achievement_service.get_user_achievements(db, user)
	achieved_before_ids = {ach.id for ach in achievements_before if ach.achieved}

	if product.initial_amount > 0:
		price_per_unit = product.price / product.initial_amount
		value_of_action = price_per_unit * amount
		if action_type == 'use':
			financial_stat.saved_value += value_of_action
		else:
			financial_stat.wasted_value += value_of_action

	product.current_amount -= amount
	if action_type == 'waste':
		product.wasted_amount += amount

	await db.commit()
	await db.refresh(product)
	await db.refresh(financial_stat)

	achievements_after = await achievement_service.get_user_achievements(db, user)

	newly_unlocked = [
		ach for ach in achievements_after if ach.achieved and ach.id not in achieved_before_ids
	]

	return {"product": product, "unlocked_achievements": newly_unlocked}


@product_router.post("/use/{product_id}", response_model=ProductActionResponse, tags=["Products"])
async def use_product(
		product_id: int,
		action_request: ProductActionRequest,
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	product, financial_stat = await get_product_and_stats(product_id, user, db)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	if not financial_stat:
		raise HTTPException(status_code=500, detail="Financial stats for user not found.")

	amount_to_use = Decimal(str(action_request.amount))
	if product.current_amount < amount_to_use:
		raise HTTPException(status_code=400, detail=f"Nie możesz zużyć więcej niż masz.")

	return await _handle_product_action("use", product, financial_stat, amount_to_use, user, db)


@product_router.post("/waste/{product_id}", response_model=ProductActionResponse, tags=["Products"])
async def waste_product(
		product_id: int,
		action_request: ProductActionRequest,
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	product, financial_stat = await get_product_and_stats(product_id, user, db)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	if not financial_stat:
		raise HTTPException(status_code=500, detail="Financial stats for user not found.")

	amount_to_waste = Decimal(str(action_request.amount))
	if product.current_amount < amount_to_waste:
		raise HTTPException(status_code=400, detail=f"Nie możesz wyrzucić więcej niż masz.")

	return await _handle_product_action("waste", product, financial_stat, amount_to_waste, user, db)


@product_router.get("/get", response_model=List[ProductOut], tags=["Products"])
async def get_products(db: AsyncSession = Depends(get_async_session), user: User = Depends(get_current_user)):
	result = await db.execute(select(Product).where(Product.user_id == user.id))
	return result.scalars().all()


@product_router.delete("/delete/{product_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Products"])
async def delete_product(
		product_id: int,
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	result = await db.execute(select(Product).where(Product.id == product_id, Product.user_id == user.id))
	product = result.scalar_one_or_none()

	if product is None:
		raise HTTPException(status_code=404, detail="Product not found")

	await db.delete(product)
	await db.commit()


@product_router.put("/update/{product_id}", response_model=ProductOut, tags=["Products"])
async def update_product(
		product_id: int = FastAPIPath(..., gt=0),
		updated_data: ProductCreate = Body(...),
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	result = await db.execute(select(Product).where(Product.id == product_id, Product.user_id == user.id))
	product = result.scalar_one_or_none()

	if product is None:
		raise HTTPException(status_code=404, detail="Product not found")

	product.name = updated_data.name
	if updated_data.expiration_date:
		product.expiration_date = updated_data.expiration_date

	await db.commit()
	await db.refresh(product)
	return product


@product_router.get("/get/{product_id}", response_model=ProductOut, tags=["Products"])
async def get_product_by_id(
		product_id: int,
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	result = await db.execute(select(Product).where(Product.id == product_id, Product.user_id == user.id))
	product = result.scalar_one_or_none()
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	return product


@product_router.get("/expiring-soon", response_model=List[ProductExpiringSoon], tags=["Products"])
async def get_expiring_products(
		days: int = Query(7, gt=0),
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	today = date.today()
	deadline = today + timedelta(days=days)

	result = await db.execute(
		select(Product)
		.where(
			Product.user_id == user.id,
			Product.expiration_date <= deadline,
			Product.expiration_date >= today,
			Product.current_amount > 0
		)
		.order_by(Product.expiration_date)
	)
	products_from_db = result.scalars().all()

	products_to_return = [
		ProductExpiringSoon(
			id=p.id,
			name=p.name,
			expiration_date=p.expiration_date,
			external_id=p.external_id,
			days_left=(p.expiration_date - today).days,
			current_amount=float(p.current_amount),
			unit=p.unit
		) for p in products_from_db
	]
	return products_to_return


@product_router.get("/stats/financial", response_model=FinancialStatsOut, tags=["Products"])
async def get_financial_stats(
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	result = await db.execute(
		select(FinancialStat).where(FinancialStat.user_id == user.id)
	)
	stats = result.scalar_one_or_none()

	if not stats:
		stats = FinancialStat(user_id=user.id)
		db.add(stats)
		await db.commit()
		await db.refresh(stats)

	return FinancialStatsOut(saved=float(stats.saved_value), wasted=float(stats.wasted_value))


@product_router.get("/stats", response_model=ProductStats, tags=["Products"])
async def get_product_stats(
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user),
):
	query = select(
		func.sum(
			case(
				(Product.unit == 'szt.', Product.initial_amount),
				else_=1
			)
		).label("total"),
		func.sum(
			case(
				(Product.unit == 'szt.', Product.initial_amount - Product.current_amount - Product.wasted_amount),
				else_=case(
					(Product.current_amount < Product.initial_amount, 1),
					else_=0
				)
			)
		).label("used"),
		func.sum(
			case(
				(Product.unit == 'szt.', Product.wasted_amount),
				else_=case(
					(Product.wasted_amount > 0, 1),
					else_=0
				)
			)
		).label("wasted")
	).where(Product.user_id == user.id)

	res = await db.execute(query)
	row = res.first()

	if not row:
		return ProductStats(total=0, used=0, wasted=0)

	return ProductStats(
		total=int(row.total or 0),
		used=int(row.used or 0),
		wasted=int(row.wasted or 0),
	)


@product_router.get("/stats/trends", response_model=List[TrendData], tags=["Products"])
async def get_product_trends(
       range_days: int = Query(30, gt=0),
       db: AsyncSession = Depends(get_async_session),
       user: User = Depends(get_current_user)
):
    end_date = datetime.now(timezone(timedelta(hours=2))).date() # Zakładając CEST (UTC+2)
    start_date = end_date - timedelta(days=range_days - 1)

    local_created_at = func.timezone('Europe/Warsaw', Product.created_at)

    query = (
       select(
          cast(local_created_at, Date).label("day"),
          func.count(Product.id).label("added_count")
       )
       .where(Product.user_id == user.id)
       .where(cast(local_created_at, Date) >= start_date)
       .group_by(cast(local_created_at, Date))
       .order_by(cast(local_created_at, Date))
    )

    result = await db.execute(query)
    db_data = {row.day: row.added_count for row in result.all()}

    trends: List[TrendData] = []
    for i in range(range_days):
       current_date = start_date + timedelta(days=i)
       trends.append(
          TrendData(
             period=current_date.strftime("%d.%m"),
             added=db_data.get(current_date, 0),
             used=0, # Można rozbudować tę logikę w przyszłości
             wasted=0 # Można rozbudować tę logikę w przyszłości
          )
       )

    return trends

@product_router.get("/achievements", response_model=List[Achievement], tags=["Products"])
async def get_achievements(
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	return await achievement_service.get_user_achievements(db, user)


@auth_router.post("/request-password-reset", tags=["Auth"])
async def request_password_reset(payload: dict = Body(...), db: AsyncSession = Depends(get_async_session)):
	email = payload.get("email")
	if not email:
		raise HTTPException(status_code=400, detail="Email jest wymagany")

	result = await db.execute(select(User).where(User.email == email))
	user = result.scalar_one_or_none()
	if not user:
		return {"message": "Jeśli konto istnieje, zostanie wysłany link resetu."}

	token = str(uuid.uuid4())
	user.reset_password_token = token
	user.reset_password_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
	await db.commit()
	await send_reset_password_email(user.email, token)
	return {"message": "Jeśli konto istnieje, sprawdź email ze linkiem resetu."}


@auth_router.post("/reset-password", tags=["Auth"])
async def reset_password(payload: dict = Body(...), db: AsyncSession = Depends(get_async_session)):
	token = payload.get("token")
	new_password = payload.get("new_password")
	if not token or not new_password:
		raise HTTPException(status_code=400, detail="Token i nowe hasło są wymagane")

	result = await db.execute(select(User).where(User.reset_password_token == token))
	user = result.scalar_one_or_none()
	if not user:
		raise HTTPException(status_code=400, detail="Token nieprawidłowy lub wygasł")

	if user.reset_password_expires_at and user.reset_password_expires_at < datetime.now(timezone.utc):
		raise HTTPException(status_code=400, detail="Token wygasł")

	user.hashed_password = hash_password(new_password)
	user.reset_password_token = None
	user.reset_password_expires_at = None
	await db.commit()
	return {"message": "Hasło zostało zresetowane pomyślnie"}


@auth_router.post("/change-password", tags=["Auth"])
async def change_password(
		payload: ChangePasswordRequest,
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user)
):
	if user.social_provider and user.social_provider != "password":
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Użytkownicy zalogowani przez konta społecznościowe nie mogą zmieniać hasła."
		)

	if not verify_password(payload.old_password, user.hashed_password):
		raise HTTPException(status_code=400, detail="Stare hasło jest nieprawidłowe")

	user.hashed_password = hash_password(payload.new_password)
	db.add(user)
	await db.commit()
	await db.refresh(user)

	return {"message": "Hasło zostało zmienione pomyślnie"}


@auth_router.delete("/delete-account", tags=["Auth"])
async def delete_account(
		db: AsyncSession = Depends(get_async_session),
		user: User = Depends(get_current_user),
):
	await db.delete(user)
	await db.commit()
	return {"message": "Konto zostało usunięte"}


@auth_router.post("/refresh", tags=["Auth"])
async def refresh_token(refresh_token: str = Cookie(None)):
	if not refresh_token:
		raise HTTPException(status_code=401, detail="Brak refresh tokena")

	try:
		payload = decode_token(refresh_token)
		email = payload.get("sub")
		if not email:
			raise HTTPException(status_code=401, detail="Brak sub w refresh tokenie")
	except JWTError:
		raise HTTPException(status_code=401, detail="Refresh token niepoprawny")

	new_access_token = create_access_token({"sub": email})
	return {"access_token": new_access_token, "token_type": "bearer"}
