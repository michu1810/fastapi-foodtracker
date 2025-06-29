from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship
from foodtracker_app.db.database import Base


class PantryUser(Base):
    __tablename__ = "pantry_users"

    pantry_id = Column(ForeignKey("pantries.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String, nullable=False, default="member")

    pantry = relationship("Pantry", back_populates="member_associations")
    user = relationship("User", back_populates="pantry_associations")
