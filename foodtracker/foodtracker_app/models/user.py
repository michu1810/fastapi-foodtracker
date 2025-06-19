from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from foodtracker_app.db.database import Base, TZDateTime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    token_expires_at = Column(TZDateTime, nullable=True)

    reset_password_token = Column(String, nullable=True)

    reset_password_expires_at = Column(TZDateTime, nullable=True)

    created_at = Column(TZDateTime, server_default=func.now())

    avatar_url = Column(String, nullable=True)
    social_provider = Column(String, nullable=True)

    products = relationship(
        "Product", back_populates="user", cascade="all, delete-orphan"
    )
    financial_stat = relationship(
        "FinancialStat",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )
