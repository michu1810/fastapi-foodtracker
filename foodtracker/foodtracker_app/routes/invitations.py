from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from foodtracker_app.db.database import get_async_session
from foodtracker_app.models import User
from foodtracker_app.schemas.pantry import PantryRead
from foodtracker_app.services import pantry_service
from foodtracker_app.auth.dependancies import get_current_user

router = APIRouter()


@router.post(
    "/invitations/accept/{token}",
    response_model=PantryRead,
    summary="Zaakceptuj zaproszenie do spiżarni",
)
async def accept_invitation_endpoint(
    token: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    return await pantry_service.accept_invitation(db, token, user)
