from decimal import Decimal

from foodtracker_app.db.database import Base
from sqlalchemy import Column, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship


class FinancialStat(Base):
    __tablename__ = "financial_stats"

    id = Column(Integer, primary_key=True)
    pantry_id = Column(Integer, ForeignKey("pantries.id"), nullable=False, unique=True)

    saved_value = Column(
        Numeric(10, 2), nullable=False, server_default="0.00", default=Decimal("0.00")
    )

    wasted_value = Column(
        Numeric(10, 2), nullable=False, server_default="0.00", default=Decimal("0.00")
    )

    pantry = relationship("Pantry", back_populates="financial_stat")
