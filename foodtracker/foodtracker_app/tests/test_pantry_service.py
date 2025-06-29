import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from datetime import datetime, date, timezone

from foodtracker_app.services import pantry_service
from foodtracker_app.models import User, Pantry, PantryUser, PantryInvitation
from foodtracker_app.schemas.pantry import PantryCreate, PantryUpdate

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def owner_user(db: AsyncSession) -> User:
    user = User(email="owner@example.com", hashed_password="pwd", is_verified=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def member_user(db: AsyncSession) -> User:
    user = User(email="member@example.com", hashed_password="pwd", is_verified=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def test_pantry(db: AsyncSession, owner_user: User) -> Pantry:
    return await pantry_service.create_pantry(
        db, owner_user, PantryCreate(name="Wspólna Spiżarnia")
    )


@pytest.fixture
async def pantry_with_member(
    db: AsyncSession, test_pantry: Pantry, member_user: User
) -> Pantry:
    pantry_user_link = PantryUser(
        pantry_id=test_pantry.id, user_id=member_user.id, role="member"
    )
    db.add(pantry_user_link)
    await db.commit()
    await db.refresh(test_pantry)
    return test_pantry


async def test_create_pantry(db: AsyncSession, owner_user: User):
    pantry_data = PantryCreate(name="Nowa Spiżarnia")
    pantry = await pantry_service.create_pantry(db, owner_user, pantry_data)
    assert pantry.name == "Nowa Spiżarnia"
    assert pantry.owner_id == owner_user.id


async def test_create_pantry_fails_if_name_exists(db: AsyncSession, owner_user: User):
    pantry_name = "Ta sama nazwa"
    await pantry_service.create_pantry(db, owner_user, PantryCreate(name=pantry_name))
    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.create_pantry(
            db, owner_user, PantryCreate(name=pantry_name)
        )
    assert excinfo.value.status_code == 409


async def test_create_pantry_fails_if_limit_exceeded(
    db: AsyncSession, owner_user: User
):
    await pantry_service.create_pantry(db, owner_user, PantryCreate(name="Spiżarnia 1"))
    await pantry_service.create_pantry(db, owner_user, PantryCreate(name="Spiżarnia 2"))
    await pantry_service.create_pantry(db, owner_user, PantryCreate(name="Spiżarnia 3"))
    with pytest.raises(HTTPException) as excinfo:
        await pantry_service.create_pantry(
            db, owner_user, PantryCreate(name="Spiżarnia 4")
        )
    assert excinfo.value.status_code == 403


async def test_get_user_pantries(
    db: AsyncSession, pantry_with_member: Pantry, owner_user: User, member_user: User
):
    owner_pantries = await pantry_service.get_user_pantries(db, owner_user)
    assert len(owner_pantries) == 1
    member_pantries = await pantry_service.get_user_pantries(db, member_user)
    assert len(member_pantries) == 1


async def test_update_pantry_name(db: AsyncSession, test_pantry: Pantry):
    updated_pantry = await pantry_service.update_pantry_name(
        db, test_pantry, PantryUpdate(name="Nowa Nazwa")
    )
    assert updated_pantry.name == "Nowa Nazwa"


async def test_delete_pantry_member_success(
    db: AsyncSession, pantry_with_member: Pantry, member_user: User
):
    await pantry_service.delete_pantry_member(db, pantry_with_member, member_user.id)
    link_res = await db.execute(
        select(PantryUser).where(PantryUser.user_id == member_user.id)
    )
    assert link_res.scalar_one_or_none() is None


async def test_delete_pantry_member_owner_fails(
    db: AsyncSession, pantry_with_member: Pantry, owner_user: User
):
    with pytest.raises(HTTPException, match="Właściciel nie może zostać usunięty"):
        await pantry_service.delete_pantry_member(db, pantry_with_member, owner_user.id)


async def test_delete_pantry_member_not_a_member_fails(
    db: AsyncSession, test_pantry: Pantry
):
    with pytest.raises(HTTPException, match="Użytkownik nie jest członkiem"):
        await pantry_service.delete_pantry_member(db, test_pantry, 999)


async def test_leave_pantry_success(
    db: AsyncSession, pantry_with_member: Pantry, member_user: User
):
    await pantry_service.leave_pantry(db, pantry_with_member, member_user)
    link_res = await db.execute(
        select(PantryUser).where(PantryUser.user_id == member_user.id)
    )
    assert link_res.scalar_one_or_none() is None


async def test_leave_pantry_owner_fails(
    db: AsyncSession, test_pantry: Pantry, owner_user: User
):
    with pytest.raises(HTTPException, match="Właściciel nie może opuścić"):
        await pantry_service.leave_pantry(db, test_pantry, owner_user)


async def test_delete_pantry(db: AsyncSession, test_pantry: Pantry):
    pantry_id = test_pantry.id
    await pantry_service.delete_pantry(db, test_pantry)
    pantry_res = await db.get(Pantry, pantry_id)
    assert pantry_res is None


@pytest.mark.asyncio
async def test_create_and_accept_invitation(
    db: AsyncSession,
    test_pantry: Pantry,
    member_user: User,
    fixed_date: date,
):
    db.add(member_user)
    await db.commit()

    invite = await pantry_service.create_invitation(
        db, test_pantry, "http://frontend.test"
    )
    token = invite["invite_link"].split("/")[-1]

    invitation = (
        await db.execute(
            select(PantryInvitation).where(PantryInvitation.token == token)
        )
    ).scalar_one()
    invitation.expires_at = datetime.combine(
        fixed_date, datetime.min.time(), tzinfo=timezone.utc
    )
    await db.commit()

    await pantry_service.accept_invitation(db, token, member_user)

    links = (
        (
            await db.execute(
                select(PantryUser).where(PantryUser.pantry_id == test_pantry.id)
            )
        )
        .scalars()
        .all()
    )
    member_ids = {link.user_id for link in links}

    assert member_user.id in member_ids
    assert test_pantry.owner_id in member_ids
    assert len(member_ids) == 2


@pytest.mark.asyncio
async def test_accept_invitation_invalid_token(db: AsyncSession, member_user: User):
    with pytest.raises(HTTPException, match="nieprawidłowe lub wygasło"):
        await pantry_service.accept_invitation(db, "nieistniejacy-token", member_user)


@pytest.mark.asyncio
async def test_accept_invitation_already_member(
    db: AsyncSession, pantry_with_member: Pantry, member_user: User, fixed_date: date
):
    invite = await pantry_service.create_invitation(
        db, pantry_with_member, "http://frontend.test"
    )
    token = invite["invite_link"].split("/")[-1]

    res = await db.execute(
        select(PantryInvitation).where(PantryInvitation.token == token)
    )
    invitation: PantryInvitation = res.scalar_one()
    invitation.expires_at = datetime.combine(fixed_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    await db.commit()

    with pytest.raises(HTTPException, match="Jesteś już członkiem"):
        await pantry_service.accept_invitation(db, token, member_user)
