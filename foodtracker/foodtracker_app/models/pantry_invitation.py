import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from foodtracker_app.db.database import Base


class PantryInvitation(Base):
    __tablename__ = "pantry_invitations"

    id = Column(Integer, primary_key=True, index=True)
    pantry_id = Column(
        Integer, ForeignKey("pantries.id", ondelete="CASCADE"), nullable=False
    )
    token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
