from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timedelta, timezone

from foodtracker_app.models import User, Pantry, PantryUser, PantryInvitation
from foodtracker_app.schemas.pantry import PantryCreate, PantryUpdate


async def create_pantry(
    db: AsyncSession, user: User, pantry_data: PantryCreate
) -> Pantry:
    """
    Tworzy nową spiżarnię, ustawiając danego użytkownika jako jej właściciela.
    """
    new_pantry = Pantry(name=pantry_data.name, owner_id=user.id)
    pantry_association = PantryUser(user=user, pantry=new_pantry, role="owner")
    db.add(new_pantry)
    db.add(pantry_association)
    await db.commit()
    await db.refresh(new_pantry)
    return new_pantry


async def get_user_pantries(db: AsyncSession, user: User) -> List[Pantry]:
    """
    Pobiera listę wszystkich spiżarni, do których należy dany użytkownik,
    z zachłannym ładowaniem członków i ich danych.
    """
    stmt = (
        select(Pantry)
        .join(Pantry.member_associations)
        .where(PantryUser.user_id == user.id)
        .options(selectinload(Pantry.member_associations).selectinload(PantryUser.user))
        .order_by(Pantry.created_at)
    )
    result = await db.execute(stmt)
    return result.unique().scalars().all()


async def update_pantry_name(
    db: AsyncSession, pantry: Pantry, pantry_data: PantryUpdate
) -> Pantry:
    pantry.name = pantry_data.name
    db.add(pantry)
    await db.commit()
    await db.refresh(pantry)
    return pantry


async def delete_pantry_member(db: AsyncSession, pantry: Pantry, member_id: int):
    if pantry.owner_id == member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Właściciel nie może zostać usunięty ze spiżarni.",
        )

    result = await db.execute(
        select(PantryUser).filter_by(pantry_id=pantry.id, user_id=member_id)
    )
    pantry_user_link = result.scalars().first()

    if not pantry_user_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie jest członkiem tej spiżarni.",
        )

    await db.delete(pantry_user_link)
    await db.commit()
    return {"detail": "Użytkownik usunięty ze spiżarni."}


async def leave_pantry(db: AsyncSession, pantry: Pantry, user: User):
    if pantry.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Właściciel nie może opuścić swojej spiżarni. Może ją usunąć lub przekazać własność.",
        )

    result = await db.execute(
        select(PantryUser).filter_by(pantry_id=pantry.id, user_id=user.id)
    )
    pantry_user_link = result.scalars().first()

    if not pantry_user_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie jesteś członkiem tej spiżarni.",
        )

    await db.delete(pantry_user_link)
    await db.commit()
    return {"detail": "Opuściłeś spiżarnię."}


async def delete_pantry(db: AsyncSession, pantry: Pantry):
    await db.delete(pantry)
    await db.commit()
    return {"detail": "Spiżarnia została usunięta."}


async def create_invitation(
    db: AsyncSession, pantry: Pantry, frontend_url: str
) -> dict:
    expires_delta = timedelta(minutes=15)
    invitation = PantryInvitation(
        pantry_id=pantry.id, expires_at=datetime.now(timezone.utc) + expires_delta
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    invite_link = f"{frontend_url}/join-pantry/{invitation.token}"
    return {"invite_link": invite_link}


async def accept_invitation(db: AsyncSession, token: str, user: User) -> Pantry:
    result = await db.execute(select(PantryInvitation).filter_by(token=token))
    invitation = result.scalars().first()

    if not invitation or invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie jest nieprawidłowe lub wygasło.",
        )

    result = await db.execute(
        select(PantryUser).filter_by(pantry_id=invitation.pantry_id, user_id=user.id)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jesteś już członkiem tej spiżarni.",
        )

    pantry_user_link = PantryUser(
        pantry_id=invitation.pantry_id, user_id=user.id, role="member"
    )
    db.add(pantry_user_link)
    await db.delete(invitation)
    await db.commit()

    # Zwracamy spiżarnię z załadowanymi członkami
    stmt = (
        select(Pantry)
        .options(selectinload(Pantry.member_associations).selectinload(PantryUser.user))
        .where(Pantry.id == invitation.pantry_id)
    )
    result = await db.execute(stmt)
    pantry = result.scalars().first()
    return pantry
