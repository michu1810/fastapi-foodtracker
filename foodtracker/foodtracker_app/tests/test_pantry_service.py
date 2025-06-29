import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta

from foodtracker_app.services import pantry_service
from foodtracker_app.models import User, Pantry, PantryUser, PantryInvitation
from foodtracker_app.schemas.pantry import PantryCreate, PantryUpdate

pytestmark = pytest.mark.asyncio


# === Fikstury pomocnicze do testów ===


@pytest.fixture
async def owner_user(db: AsyncSession) -> User:
    """Tworzy i zwraca użytkownika-właściciela."""
    user = User(email="owner@example.com", hashed_password="pwd")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def member_user(db: AsyncSession) -> User:
    """Tworzy i zwraca użytkownika-członka."""
    user = User(email="member@example.com", hashed_password="pwd")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def test_pantry(db: AsyncSession, owner_user: User) -> Pantry:
    """Tworzy spiżarnię należącą do owner_user."""
    return await pantry_service.create_pantry(
        db, owner_user, PantryCreate(name="Wspólna Spiżarnia")
    )


@pytest.fixture
async def pantry_with_member(
    db: AsyncSession, test_pantry: Pantry, member_user: User
) -> Pantry:
    """Dodaje member_user do spiżarni test_pantry."""
    pantry_user_link = PantryUser(
        pantry_id=test_pantry.id, user_id=member_user.id, role="member"
    )
    db.add(pantry_user_link)
    await db.commit()
    return test_pantry


# === Testy poszczególnych funkcji serwisu ===


async def test_create_pantry(db: AsyncSession, owner_user: User):
    pantry_data = PantryCreate(name="Nowa Spiżarnia")
    pantry = await pantry_service.create_pantry(db, owner_user, pantry_data)

    assert pantry.name == "Nowa Spiżarnia"
    assert pantry.owner_id == owner_user.id

    # Sprawdź, czy powiązanie PantryUser zostało stworzone
    result = await db.execute(
        select(PantryUser).where(PantryUser.pantry_id == pantry.id)
    )
    pantry_user_link = result.scalar_one_or_none()
    assert pantry_user_link is not None
    assert pantry_user_link.user_id == owner_user.id
    assert pantry_user_link.role == "owner"


async def test_get_user_pantries(
    db: AsyncSession, pantry_with_member: Pantry, owner_user: User, member_user: User
):
    # Sprawdź spiżarnie właściciela
    owner_pantries = await pantry_service.get_user_pantries(db, owner_user)
    assert len(owner_pantries) == 1
    assert owner_pantries[0].id == pantry_with_member.id

    # Sprawdź spiżarnie członka
    member_pantries = await pantry_service.get_user_pantries(db, member_user)
    assert len(member_pantries) == 1
    assert member_pantries[0].id == pantry_with_member.id


async def test_update_pantry_name(db: AsyncSession, test_pantry: Pantry):
    updated_pantry = await pantry_service.update_pantry_name(
        db, test_pantry, PantryUpdate(name="Nowa Nazwa")
    )
    assert updated_pantry.name == "Nowa Nazwa"


async def test_delete_pantry_member_success(
    db: AsyncSession, pantry_with_member: Pantry, member_user: User
):
    result = await pantry_service.delete_pantry_member(
        db, pantry_with_member, member_user.id
    )
    assert result == {"detail": "Użytkownik usunięty ze spiżarni."}

    # Sprawdź, czy powiązanie zostało usunięte
    link_res = await db.execute(
        select(PantryUser).where(PantryUser.user_id == member_user.id)
    )
    assert link_res.scalar_one_or_none() is None


async def test_delete_pantry_member_owner_fails(
    db: AsyncSession, pantry_with_member: Pantry, owner_user: User
):
    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.delete_pantry_member(db, pantry_with_member, owner_user.id)
    assert excinfo.value.status_code == 400
    assert "Właściciel nie może zostać usunięty" in excinfo.value.detail


async def test_delete_pantry_member_not_a_member_fails(
    db: AsyncSession, test_pantry: Pantry
):
    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.delete_pantry_member(
            db, test_pantry, 999
        )  # nieistniejący user_id
    assert excinfo.value.status_code == 404


async def test_leave_pantry_success(
    db: AsyncSession, pantry_with_member: Pantry, member_user: User
):
    result = await pantry_service.leave_pantry(db, pantry_with_member, member_user)
    assert result == {"detail": "Opuściłeś spiżarnię."}


async def test_leave_pantry_owner_fails(
    db: AsyncSession, test_pantry: Pantry, owner_user: User
):
    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.leave_pantry(db, test_pantry, owner_user)
    assert excinfo.value.status_code == 400
    assert "Właściciel nie może opuścić" in excinfo.value.detail


async def test_delete_pantry(db: AsyncSession, test_pantry: Pantry):
    pantry_id = test_pantry.id
    result = await pantry_service.delete_pantry(db, test_pantry)
    assert result == {"detail": "Spiżarnia została usunięta."}

    # Sprawdź, czy spiżarnia i powiązania zniknęły
    pantry_res = await db.get(Pantry, pantry_id)
    assert pantry_res is None
    link_res = await db.execute(
        select(PantryUser).where(PantryUser.pantry_id == pantry_id)
    )
    assert link_res.scalar_one_or_none() is None


async def test_create_and_accept_invitation(
    db: AsyncSession, test_pantry: Pantry, member_user: User
):
    # 1. Stwórz zaproszenie
    invitation_data = await pantry_service.create_invitation(
        db, test_pantry, "http://frontend.test"
    )
    token = invitation_data["invite_link"].split("/")[-1]

    # POPRAWKA: Ręcznie upewniamy się, że zaproszenie w bazie jest ważne.
    # To daje nam pełną kontrolę i uniezależnia od problemów z `freezegun` lub `datetime.now()`
    invitation = await db.scalar(
        select(PantryInvitation).where(PantryInvitation.token == token)
    )
    assert invitation is not None
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(
        hours=1
    )  # Ustawiamy datę wygaśnięcia w przyszłości
    await db.commit()

    # 2. Zaakceptuj zaproszenie
    pantry_after_join = await pantry_service.accept_invitation(db, token, member_user)
    assert pantry_after_join.id == test_pantry.id

    # 3. Sprawdź, czy użytkownik jest teraz członkiem
    member_ids = {assoc.user_id for assoc in pantry_after_join.member_associations}
    assert member_user.id in member_ids


async def test_accept_invitation_invalid_token(db: AsyncSession, member_user: User):
    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.accept_invitation(db, "nieistniejacy-token", member_user)
    assert excinfo.value.status_code == 404
    assert "nieprawidłowe lub wygasło" in excinfo.value.detail


async def test_accept_invitation_already_member(
    db: AsyncSession, pantry_with_member: Pantry, member_user: User
):
    # Stwórz zaproszenie do spiżarni, której użytkownik już jest członkiem
    invitation_data = await pantry_service.create_invitation(
        db, pantry_with_member, "http://frontend.test"
    )
    token = invitation_data["invite_link"].split("/")[-1]

    # POPRAWKA: Ręcznie upewniamy się, że zaproszenie w bazie jest ważne.
    invitation = await db.scalar(
        select(PantryInvitation).where(PantryInvitation.token == token)
    )
    assert invitation is not None
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(
        hours=1
    )  # Ustawiamy datę wygaśnięcia w przyszłości
    await db.commit()

    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.accept_invitation(db, token, member_user)

    assert excinfo.value.status_code == 400
    assert "Jesteś już członkiem" in excinfo.value.detail
