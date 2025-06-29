from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from foodtracker_app.db.database import Base, TZDateTime
from sqlalchemy.ext.associationproxy import association_proxy


class Pantry(Base):
    __tablename__ = "pantries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(TZDateTime, server_default=func.now())

    owner_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    owner = relationship("User")

    products = relationship(
        "Product", back_populates="pantry", cascade="all, delete-orphan"
    )

    member_associations = relationship(
        "PantryUser", back_populates="pantry", cascade="all, delete-orphan"
    )
    members = association_proxy("member_associations", "user")

    financial_stat = relationship(
        "FinancialStat",
        uselist=False,
        back_populates="pantry",
        cascade="all, delete-orphan",
    )
