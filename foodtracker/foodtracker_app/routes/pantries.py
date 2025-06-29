from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from foodtracker_app.db.database import get_async_session
from foodtracker_app.models import User, Pantry
from foodtracker_app.schemas.pantry import (
    PantryCreate,
    PantryRead,
    PantryUpdate,
    PantryInvitationLink,
)
from foodtracker_app.auth.dependancies import (
    get_current_user,
    get_pantry_for_user,
    require_pantry_owner,
)
from foodtracker_app.services import pantry_service
from foodtracker_app.settings import settings

router = APIRouter()


@router.post(
    "",
    response_model=PantryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Stwórz nową spiżarnię",
)
async def create_new_pantry(
    pantry_data: PantryCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    new_pantry = await pantry_service.create_pantry(
        db=db, user=current_user, pantry_data=pantry_data
    )
    return new_pantry


@router.get(
    "", response_model=List[PantryRead], summary="Pobierz spiżarnie użytkownika"
)
async def get_all_user_pantries(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    pantries = await pantry_service.get_user_pantries(db=db, user=current_user)
    return pantries


@router.put("/{pantry_id}", response_model=PantryRead, summary="Zmień nazwę spiżarni")
async def update_pantry(
    pantry_data: PantryUpdate,
    pantry: Pantry = Depends(require_pantry_owner),
    db: AsyncSession = Depends(get_async_session),
):
    return await pantry_service.update_pantry_name(db, pantry, pantry_data)


@router.delete(
    "/{pantry_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Usuń członka ze spiżarni",
)
async def remove_pantry_member(
    member_id: int,
    pantry: Pantry = Depends(require_pantry_owner),
    db: AsyncSession = Depends(get_async_session),
):
    await pantry_service.delete_pantry_member(db, pantry, member_id)
    return


@router.post(
    "/{pantry_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Opuść spiżarnię",
)
async def leave_pantry_endpoint(
    user: User = Depends(get_current_user),
    pantry: Pantry = Depends(get_pantry_for_user),
    db: AsyncSession = Depends(get_async_session),
):
    await pantry_service.leave_pantry(db, pantry, user)
    return


@router.delete(
    "/{pantry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Usuń spiżarnię"
)
async def delete_pantry_endpoint(
    pantry: Pantry = Depends(require_pantry_owner),
    db: AsyncSession = Depends(get_async_session),
):
    await pantry_service.delete_pantry(db, pantry)
    return


@router.post(
    "/{pantry_id}/invitations",
    response_model=PantryInvitationLink,
    summary="Stwórz link zaproszeniowy",
)
async def create_pantry_invitation(
    pantry: Pantry = Depends(require_pantry_owner),
    db: AsyncSession = Depends(get_async_session),
):
    return await pantry_service.create_invitation(db, pantry, settings.FRONTEND_URL)
