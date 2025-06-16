from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone, UTC
from jose import jwt, JWTError, ExpiredSignatureError
from foodtracker_app.settings import settings
from foodtracker_app.models.user import User
from foodtracker_app.utils.email_utils import send_email_async
from foodtracker_app.utils.template_utils import render_template
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from fastapi import HTTPException

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.jwt_algorithm

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
	to_encode = data.copy()
	now = datetime.now(UTC)

	if expires_delta:
		expire = now + expires_delta
	else:
		expire = now + timedelta(minutes=settings.access_token_expire_minutes)

	to_encode.update({
		"exp": expire,
		"iat": now,
		"iss": "foodtracker-api",
		"aud": "foodtracker-user",
		"jti": str(uuid4())
	})
	return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta = timedelta(days=7)) -> str:
	to_encode = data.copy()
	now = datetime.now(UTC)
	expire = now + expires_delta

	to_encode.update({
		"exp": expire,
		"iat": now,
		"iss": "foodtracker-api",
		"aud": "foodtracker-user",
		"jti": str(uuid4())
	})
	return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
	try:
		payload = jwt.decode(
			token,
			SECRET_KEY,
			algorithms=[ALGORITHM],
			audience="foodtracker-user",
			issuer="foodtracker-api"
		)
		return payload
	except ExpiredSignatureError:
		raise HTTPException(status_code=401, detail="Token has expired")
	except JWTError as e:
		raise HTTPException(status_code=401, detail=f"Could not validate credentials: {e}")


def generate_verification_token() -> str:
	return str(uuid4())


async def trigger_verification_email(user: User, db: AsyncSession):
	token = generate_verification_token()
	user.verification_token = token
	user.token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

	db.add(user)
	await db.commit()

	verification_url = f"{settings.FRONTEND_URL}/verify?token={token}"
	subject = "Zweryfikuj swoje konto w FoodTracker"

	html_body = await render_template(
		"verify_email.html",
		verification_link=verification_url,
		email=user.email,
		now=datetime.now(timezone.utc)
	)

	await send_email_async(
		to_email=user.email,
		subject=subject,
		body="Kliknij w link, by aktywować konto.",
		html=html_body
	)


async def send_reset_password_email(email: str, token: str):
	reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
	html = await render_template("reset_password_email.html", reset_url=reset_link)

	await send_email_async(
		to_email=email,
		subject="🔒 FoodTracker - Reset hasła",
		body="Kliknij przycisk w wiadomości, aby ustawić nowe hasło",
		html=html
	)


class TokenData(BaseModel):
	email: str | None = None