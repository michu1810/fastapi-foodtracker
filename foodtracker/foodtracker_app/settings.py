from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path
import os

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

    FRONTEND_URL: str
    REDIS_URL: str

    SKIP_REDIS: bool = False
    TESTING: bool = bool(os.getenv("TESTING", False))

    IS_PRODUCTION: bool = os.getenv("IS_PRODUCTION", "false").lower() == "true"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="allow",
    )


settings = Settings()

