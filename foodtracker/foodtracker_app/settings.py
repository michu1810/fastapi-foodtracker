import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str

    RECAPTCHA_SECRET_KEY: str
    CORS_ORIGINS: list[str] = []

    FRONTEND_URL: str
    BACKEND_URL: str
    REDIS_URL: str
    UPLOADS_DIR: str = "uploads"

    SKIP_REDIS: bool = False
    TESTING: bool = os.getenv("TESTING", "false").lower() == "true"

    IS_PRODUCTION: bool = os.getenv("IS_PRODUCTION", "false").lower() == "true"

    model_config = SettingsConfigDict(
        extra="allow",
    )


settings = Settings()
