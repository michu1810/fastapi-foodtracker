from sqlalchemy import Column, Integer, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from foodtracker_app.db.database import Base
from decimal import Decimal


class FinancialStat(Base):
	__tablename__ = 'financial_stats'

	id = Column(Integer, primary_key=True)
	user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)

	saved_value = Column(Numeric(10, 2), nullable=False, server_default='0.00', default=Decimal('0.00'))

	wasted_value = Column(Numeric(10, 2), nullable=False, server_default='0.00', default=Decimal('0.00'))

	user = relationship("User", back_populates="financial_stat")