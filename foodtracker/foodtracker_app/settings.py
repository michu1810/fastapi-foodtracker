import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    USE_LOCALHOST_SERVICES: bool = False
    SQL_ECHO: bool = False
    DEMO_MODE: bool
    ALLOWED_IPS: list[str] = Field(default_factory=list)
    SECRET_KEY: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    MAIL_FROM: str
    MAIL_FROM_NAME: str
    DATABASE_URL: str
    DATABASE_URL_LOCALHOST: str | None = None

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str

    RECAPTCHA_SECRET_KEY: str
    CORS_ORIGINS: list[str] = []

    EXPIRATION_NOTIFICATION_DAYS: int = 3
    FRONTEND_URL: str
    BACKEND_URL: str
    REDIS_URL: str
    REDIS_URL_LOCALHOST: str | None = None
    CELERY_BROKER_URL: str | None = None
    CELERY_BACKEND_URL: str | None = None
    CELERY_BROKER_URL_LOCALHOST: str | None = None
    CELERY_BACKEND_URL_LOCALHOST: str | None = None

    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    SKIP_REDIS: bool = False
    TESTING: bool = os.getenv("TESTING", "false").lower() == "true"

    IS_PRODUCTION: bool = os.getenv("IS_PRODUCTION", "false").lower() == "true"

    model_config = SettingsConfigDict(
        extra="allow",
    )


settings = Settings()


if settings.USE_LOCALHOST_SERVICES:
    if settings.DATABASE_URL_LOCALHOST:
        settings.DATABASE_URL = settings.DATABASE_URL_LOCALHOST
    if settings.REDIS_URL_LOCALHOST:
        settings.REDIS_URL = settings.REDIS_URL_LOCALHOST
    if settings.CELERY_BROKER_URL_LOCALHOST:
        settings.CELERY_BROKER_URL = settings.CELERY_BROKER_URL_LOCALHOST
    if settings.CELERY_BACKEND_URL_LOCALHOST:
        settings.CELERY_BACKEND_URL = settings.CELERY_BACKEND_URL_LOCALHOST
