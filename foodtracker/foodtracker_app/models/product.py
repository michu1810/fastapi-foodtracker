from decimal import Decimal

from foodtracker_app.db.database import Base
from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import relationship


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    expiration_date = Column(Date, nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    user_id = Column(Integer, ForeignKey("users.id"))
    external_id = Column(String, nullable=True)

    price = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(10), nullable=False)
    initial_amount = Column(Numeric(10, 2), nullable=False)
    current_amount = Column(Numeric(10, 2), nullable=False)

    wasted_amount = Column(
        Numeric(10, 2), nullable=False, server_default="0.00", default=Decimal("0.00")
    )

    user = relationship("User", back_populates="products")

    __table_args__ = (
        CheckConstraint(
            "current_amount >= 0", name="check_current_amount_non_negative"
        ),
        CheckConstraint("wasted_amount >= 0", name="check_wasted_amount_non_negative"),
        CheckConstraint(
            "current_amount + wasted_amount <= initial_amount",
            name="check_amounts_lte_initial",
        ),
    )
