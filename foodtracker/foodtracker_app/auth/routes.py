import uuid
from datetime import UTC, date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List
from zoneinfo import ZoneInfo

import magic
from fastapi import APIRouter, Body, Cookie, Depends, File, HTTPException
from fastapi import Query, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse
from foodtracker_app.auth.dependancies import get_current_user, get_pantry_for_user
from foodtracker_app.schemas.pantry import PantryCreate
from foodtracker_app.auth.schemas import (
    Achievement,
    ChangePasswordRequest,
    FinancialStatsOut,
    ProductActionRequest,
    ProductActionResponse,
    ProductCreate,
    ProductExpiringSoon,
    ProductOut,
    ProductStats,
    TrendData,
    UserCreate,
    UserProfile,
    UserSettingsUpdate,
)
from foodtracker_app.auth.utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    send_reset_password_email,
    trigger_verification_email,
    verify_password,
)
from foodtracker_app.db.database import get_async_session
from foodtracker_app.models import User, Product, Pantry, FinancialStat
from foodtracker_app.services import (
    achievement_service,
    pantry_service,
    product_service,
    statistics_service,
)
from foodtracker_app.services.cloudinary_service import upload_image
from foodtracker_app.schemas.statistics import CategoryWasteStat, MostWastedProductStat
from foodtracker_app.settings import settings
from foodtracker_app.utils.recaptcha import verify_recaptcha
from rate_limiter import limiter
from sqlalchemy import Date, case, cast, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql.functions import coalesce

auth_router = APIRouter()
product_router = APIRouter()


@auth_router.post("/me/avatar", tags=["Auth"])
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    MAX_FILE_SIZE = 5 * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(413, "Plik jest za duży. Maksymalny rozmiar to 5MB.")

    mime_type = magic.from_buffer(file_content, mime=True)
    if mime_type not in {"image/png", "image/jpeg"}:
        raise HTTPException(400, "Niepoprawny typ MIME. Dozwolone: PNG, JPG.")

    public_id = f"user_{user.id}"

    avatar_url = upload_image(file_content, public_id)

    if not avatar_url:
        raise HTTPException(status_code=500, detail="Nie udało się wgrać obrazka.")

    user.avatar_url = avatar_url
    await db.commit()

    return {"avatar_url": user.avatar_url}


@limiter.limit("5/day")
@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request, payload: dict, db: AsyncSession = Depends(get_async_session)
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
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=email, hashed_password=hash_password(password), social_provider="password"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    default_pantry_data = PantryCreate(name="Moja Spiżarnia")
    await pantry_service.create_pantry(
        db=db, user=new_user, pantry_data=default_pantry_data
    )

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
async def resend_verification_email(
    payload: dict = Body(...), db: AsyncSession = Depends(get_async_session)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified")
    if user.token_expires_at and user.token_expires_at > datetime.now(UTC) - timedelta(
        seconds=60
    ):
        raise HTTPException(
            status_code=429, detail="Odczekaj minutę przed ponownym wysłaniem."
        )
    await trigger_verification_email(user, db)
    return {"message": "Verification email resent."}


@auth_router.post("/login", tags=["Auth"])
async def login(
    user_credentials: UserCreate, db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(User).where(User.email == user_credentials.email))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(
        user_credentials.password, db_user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not db_user.is_verified:
        raise HTTPException(
            status_code=403, detail="Zweryfikuj email przed zalogowaniem"
        )

    user_provider_value = (
        db_user.social_provider if db_user.social_provider else "password"
    )

    access_token = create_access_token(
        {"sub": db_user.email, "provider": user_provider_value}
    )
    refresh_token = create_refresh_token(
        {"sub": db_user.email, "provider": user_provider_value}
    )

    response = JSONResponse(
        content={"access_token": access_token, "token_type": "bearer"}
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.IS_PRODUCTION,
        samesite="strict",
        path="/auth",
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
        "send_expiration_notifications": user.send_expiration_notifications,  # <<< DODAJ TĘ LINIĘ
    }


@auth_router.patch("/me/settings", response_model=UserProfile, tags=["Auth"])
async def update_user_settings(
    settings_data: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Aktualizuje ustawienia powiadomień dla zalogowanego użytkownika.
    """
    user.send_expiration_notifications = settings_data.send_expiration_notifications
    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "createdAt": user.created_at,
        "avatar_url": user.avatar_url,
        "provider": user.social_provider if user.social_provider else "password",
        "send_expiration_notifications": user.send_expiration_notifications,
    }


async def _handle_product_action(
    action_type: str,
    product: Product,
    amount: Decimal,
    db: AsyncSession,
    user: User,
):
    stats_result = await db.execute(
        select(FinancialStat).where(FinancialStat.pantry_id == product.pantry_id)
    )
    financial_stat = stats_result.scalar_one_or_none()
    if not financial_stat:
        financial_stat = FinancialStat(pantry_id=product.pantry_id)
        db.add(financial_stat)
        await db.flush()

    achievements_before = await achievement_service.get_user_achievements(db, user)
    achieved_before_ids = {ach.id for ach in achievements_before if ach.achieved}

    if product.initial_amount > 0:
        price_per_unit = product.price / product.initial_amount
        value_of_action = price_per_unit * amount
        if action_type == "use":
            financial_stat.saved_value += value_of_action
        else:
            financial_stat.wasted_value += value_of_action

    product.current_amount -= amount
    if action_type == "waste":
        product.wasted_amount += amount

    await db.commit()
    await db.refresh(product)
    await db.refresh(financial_stat)

    achievements_after = await achievement_service.get_user_achievements(db, user)
    newly_unlocked = [
        ach
        for ach in achievements_after
        if ach.achieved and ach.id not in achieved_before_ids
    ]
    return {"product": product, "unlocked_achievements": newly_unlocked}


@product_router.post(
    "/create", response_model=ProductOut, tags=["Products"], status_code=201
)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_async_session),
    pantry: Pantry = Depends(get_pantry_for_user),
    user: User = Depends(get_current_user),
):
    """
    Tworzy nowy produkt w podanej spiżarni.
    Cała logika została przeniesiona do warstwy serwisowej.
    """
    new_product = await product_service.create_product(
        db=db, pantry_id=pantry.id, product_data=product_data
    )
    return new_product


async def _handle_product_action(
    action_type: str,
    product: Product,
    financial_stat: FinancialStat,
    amount: Decimal,
    user: User,
    db: AsyncSession,
):
    achievements_before = await achievement_service.get_user_achievements(db, user)
    achieved_before_ids = {ach.id for ach in achievements_before if ach.achieved}

    if product.initial_amount > 0:
        price_per_unit = product.price / product.initial_amount
        value_of_action = price_per_unit * amount
        if action_type == "use":
            financial_stat.saved_value += value_of_action
        else:
            financial_stat.wasted_value += value_of_action

    product.current_amount -= amount
    if action_type == "waste":
        product.wasted_amount += amount

    await db.commit()
    await db.refresh(product)
    await db.refresh(financial_stat)

    achievements_after = await achievement_service.get_user_achievements(db, user)

    newly_unlocked = [
        ach
        for ach in achievements_after
        if ach.achieved and ach.id not in achieved_before_ids
    ]

    return {"product": product, "unlocked_achievements": newly_unlocked}


@product_router.post("/use/{product_id}", response_model=ProductActionResponse)
async def use_product(
    product_id: int,
    action_request: ProductActionRequest,
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
):
    product_to_use = await db.get(Product, product_id)
    if not product_to_use or product_to_use.pantry_id != pantry.id:
        raise HTTPException(
            status_code=404, detail="Produkt nie znaleziony w tej spiżarni"
        )

    amount_to_use = Decimal(str(action_request.amount))
    if product_to_use.current_amount < amount_to_use:
        raise HTTPException(status_code=400, detail="Nie możesz zużyć więcej niż masz.")

    financial_stat = await db.scalar(
        select(FinancialStat).where(FinancialStat.pantry_id == pantry.id)
    )

    if not financial_stat:
        financial_stat = FinancialStat(pantry_id=pantry.id)
        db.add(financial_stat)
        await db.commit()
        await db.refresh(financial_stat)
    return await _handle_product_action(
        "use", product_to_use, financial_stat, amount_to_use, user, db
    )


@product_router.post("/waste/{product_id}", response_model=ProductActionResponse)
async def waste_product(
    product_id: int,
    action_request: ProductActionRequest,
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
):
    product_to_waste = await db.get(Product, product_id)
    if not product_to_waste or product_to_waste.pantry_id != pantry.id:
        raise HTTPException(
            status_code=404, detail="Produkt nie znaleziony w tej spiżarni"
        )

    amount_to_waste = Decimal(str(action_request.amount))
    if product_to_waste.current_amount < amount_to_waste:
        raise HTTPException(
            status_code=400, detail="Nie możesz wyrzucić więcej niż masz."
        )

    financial_stat = await db.scalar(
        select(FinancialStat).where(FinancialStat.pantry_id == pantry.id)
    )

    if not financial_stat:
        financial_stat = FinancialStat(pantry_id=pantry.id)
        db.add(financial_stat)
        await db.commit()
        await db.refresh(financial_stat)
    if not financial_stat:
        raise HTTPException(
            status_code=500, detail="Brak danych finansowych dla tej spiżarni"
        )

    return await _handle_product_action(
        "waste", product_to_waste, financial_stat, amount_to_waste, user, db
    )


@product_router.get("/get", response_model=List[ProductOut])
async def get_products(
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Zwraca listę wszystkich produktów dla autoryzowanej spiżarni.
    Używa jawnego zapytania dla maksymalnej niezawodności.
    """
    stmt = (
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.pantry_id == pantry.id)
        .order_by(Product.expiration_date.asc())
    )
    result = await db.execute(stmt)
    products = result.scalars().all()
    return products


@product_router.delete("/delete/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
):
    product = await db.get(Product, product_id)
    if not product or product.pantry_id != pantry.id:
        raise HTTPException(
            status_code=404, detail="Produkt nie znaleziony w tej spiżarni"
        )

    await db.delete(product)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@product_router.put("/update/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    updated_data: ProductCreate,
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
):
    product = await db.get(Product, product_id)
    if not product or product.pantry_id != pantry.id:
        raise HTTPException(
            status_code=404, detail="Produkt nie znaleziony w tej spiżarni"
        )
    product_data = updated_data.model_dump(exclude_unset=True)

    if "current_amount" in product_data:
        new_amount = Decimal(str(product_data["current_amount"]))

        if new_amount < product.current_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Ilość produktu nie może być mniejsza niż aktualna ({product.current_amount}).",
            )

        if new_amount > product.current_amount:
            product_data["initial_amount"] = new_amount

    for key, value in product_data.items():
        if hasattr(product, key):
            setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return product


@product_router.get("/get/{product_id}", response_model=ProductOut)
async def get_product_by_id(
    product_id: int, pantry: Pantry = Depends(get_pantry_for_user)
):
    product_to_get = None
    for p in pantry.products:
        if p.id == product_id:
            product_to_get = p
            break

    if not product_to_get:
        raise HTTPException(
            status_code=404, detail="Produkt nie znaleziony w tej spiżarni"
        )
    return product_to_get


@product_router.get(
    "/expiring-soon", response_model=List[ProductExpiringSoon], tags=["Products"]
)
async def get_expiring_products(
    days: int = Query(7, gt=0),
    db: AsyncSession = Depends(get_async_session),
    pantry: Pantry = Depends(get_pantry_for_user),
):
    today = date.today()
    deadline = today + timedelta(days=days)

    result = await db.execute(
        select(Product)
        .where(
            Product.pantry_id == pantry.id,
            Product.expiration_date <= deadline,
            Product.expiration_date >= today,
            Product.current_amount > 0,
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
            unit=p.unit,
        )
        for p in products_from_db
    ]
    return products_to_return


@product_router.get("/stats/financial", response_model=FinancialStatsOut)
async def get_financial_stats(
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
):
    stats = await db.scalar(
        select(FinancialStat).where(FinancialStat.pantry_id == pantry.id)
    )

    if not stats:
        return FinancialStatsOut(saved=0, wasted=0)

    return FinancialStatsOut(
        saved=float(stats.saved_value), wasted=float(stats.wasted_value)
    )


@product_router.get("/stats", response_model=ProductStats, tags=["Products"])
async def get_product_stats(
    db: AsyncSession = Depends(get_async_session),
    pantry: Pantry = Depends(get_pantry_for_user),
):
    query = select(
        func.sum(case((Product.unit == "szt.", Product.initial_amount), else_=1)).label(
            "total"
        ),
        func.sum(
            case(
                (
                    Product.unit == "szt.",
                    Product.initial_amount
                    - Product.current_amount
                    - Product.wasted_amount,
                ),
                else_=case(
                    (
                        and_(
                            Product.current_amount == 0,
                            2 * Product.wasted_amount <= Product.initial_amount,
                        ),
                        1,
                    ),
                    else_=0,
                ),
            )
        ).label("used"),
        func.sum(
            case(
                (Product.unit == "szt.", Product.wasted_amount),
                else_=case(
                    (
                        and_(
                            Product.current_amount == 0,
                            2 * Product.wasted_amount > Product.initial_amount,
                        ),
                        1,
                    ),
                    else_=0,
                ),
            )
        ).label("wasted"),
    ).where(Product.pantry_id == pantry.id)

    res = await db.execute(query)
    row = res.one_or_none()

    if not row or row.total is None:
        return ProductStats(total=0, used=0, wasted=0, active=0)

    total = int(row.total)
    used = int(row.used or 0)
    wasted = int(row.wasted or 0)

    active = total - used - wasted

    return ProductStats(total=total, used=used, wasted=wasted, active=active)


@product_router.get("/stats/trends", response_model=List[TrendData], tags=["Products"])
async def get_product_trends(
    range_days: int = Query(30, gt=0),
    db: AsyncSession = Depends(get_async_session),
    pantry: Pantry = Depends(get_pantry_for_user),
):
    """
    Zwraca dzienne trendy dodawania produktów, poprawnie obsługując
    jednostki (sztuki vs. waga/objętość) oraz strefy czasowe.
    """
    warsaw_tz = ZoneInfo("Europe/Warsaw")
    end_date = datetime.now(warsaw_tz).date()
    start_date = end_date - timedelta(days=range_days - 1)

    local_created_at = func.timezone("Europe/Warsaw", Product.created_at)

    query = (
        select(
            cast(local_created_at, Date).label("day"),
            coalesce(
                func.sum(
                    case(
                        (Product.unit == "szt.", Product.initial_amount),
                        else_=1,
                    )
                ),
                0,
            ).label("total_items"),
        )
        .where(Product.pantry_id == pantry.id)
        .where(cast(local_created_at, Date) >= start_date)
        .group_by(cast(local_created_at, Date))
        .order_by(cast(local_created_at, Date))
    )

    result = await db.execute(query)
    db_data = {row.day: row.total_items for row in result.all()}

    trends: List[TrendData] = []
    for i in range(range_days):
        current_date = start_date + timedelta(days=i)
        items_added = db_data.get(current_date, 0)

        trends.append(
            TrendData(
                period=current_date.strftime("%d.%m"),
                added=int(items_added),
                used=0,
                wasted=0,
            )
        )

    return trends


@product_router.get(
    "/stats/category-waste",
    response_model=List[CategoryWasteStat],
    summary="Pobierz statystyki zużycia i marnotrawstwa wg. kategorii",
    tags=["Products", "Statistics"],
)
async def get_category_waste_statistics(
    pantry_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
):
    """
    Zwraca listę statystyk dla konkretnej spiżarni, do której użytkownik ma dostęp.
    """
    user_pantry_ids = {
        pantry_association.pantry_id for pantry_association in user.pantry_associations
    }
    if pantry_id not in user_pantry_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Brak dostępu do tej spiżarni",
        )

    stats = await statistics_service.get_category_waste_stats(
        db=db, pantry_id=pantry_id
    )
    return stats


@product_router.get(
    "/stats/most-wasted-products",
    response_model=List[MostWastedProductStat],
    summary="Pobierz produkty o największej wartości, które zostały wyrzucone",
    tags=["Products", "Statistics"],
)
async def get_most_wasted_products_stats(
    pantry_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
):
    """
    Zwraca listę 3 produktów, które wygenerowały ndajwiększe straty finansowe.
    """
    user_pantry_ids = {
        pantry_association.pantry_id for pantry_association in user.pantry_associations
    }
    if pantry_id not in user_pantry_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Brak dostępu do tej spiżarni",
        )

    stats = await statistics_service.get_most_expensive_wasted_products(
        db=db, pantry_id=pantry_id
    )
    return stats


@product_router.get(
    "/achievements", response_model=List[Achievement], tags=["Products"]
)
async def get_achievements(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
):
    return await achievement_service.get_user_achievements(db, user)


@auth_router.post("/request-password-reset", tags=["Auth"])
async def request_password_reset(
    payload: dict = Body(...), db: AsyncSession = Depends(get_async_session)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email jest wymagany")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return {
            "message": "Jeśli konto o podanym adresie email istnieje, wysłano link do resetu hasła."
        }
    if not user.hashed_password or user.hashed_password == "social":
        raise HTTPException(
            status_code=400,
            detail="To konto nie używa hasła. Zaloguj się przez Google lub GitHub.",
        )
    token = str(uuid.uuid4())
    user.reset_password_token = token
    user.reset_password_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.commit()
    await send_reset_password_email(user.email, token)
    return {"message": "Jeśli konto istnieje, sprawdź email ze linkiem resetu."}


@auth_router.post("/reset-password", tags=["Auth"])
async def reset_password(
    payload: dict = Body(...), db: AsyncSession = Depends(get_async_session)
):
    token = payload.get("token")
    new_password = payload.get("new_password")
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token i nowe hasło są wymagane")

    result = await db.execute(select(User).where(User.reset_password_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Token nieprawidłowy lub wygasł")

    if user.reset_password_expires_at and user.reset_password_expires_at < datetime.now(
        timezone.utc
    ):
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
    user: User = Depends(get_current_user),
):
    if user.social_provider and user.social_provider != "password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Użytkownicy zalogowani przez konta społecznościowe nie mogą zmieniać hasła.",
        )

    if not verify_password(payload.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Stare hasło jest nieprawidłowe")

    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"message": "Hasło zostało zmienione pomyślnie"}


@auth_router.delete(
    "/delete-account", tags=["Auth"], status_code=status.HTTP_204_NO_CONTENT
)
async def delete_account(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
):
    """
    Niezawodnie usuwa konto użytkownika wraz ze wszystkimi jego zależnościami.
    """
    owned_pantries_result = await db.execute(
        select(Pantry).where(Pantry.owner_id == user.id)
    )
    owned_pantries = owned_pantries_result.scalars().all()

    for pantry in owned_pantries:
        await db.delete(pantry)

    await db.delete(user)

    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@auth_router.post("/refresh", tags=["Auth"])
async def refresh_token(refresh_token: str = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Brak refresh tokena")

    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token niepoprawny")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Brak sub w refresh tokenie")

    new_access_token = create_access_token({"sub": email})
    return {"access_token": new_access_token, "token_type": "bearer"}
