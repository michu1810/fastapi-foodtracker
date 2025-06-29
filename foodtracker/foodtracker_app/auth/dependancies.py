from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from foodtracker_app.auth.utils import decode_token
from foodtracker_app.db.database import get_async_session
from foodtracker_app.models import User, Pantry, Product, PantryUser
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class TokenData(BaseModel):
    email: str | None = None


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_async_session)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def get_pantry_for_user(
    pantry_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_user),
) -> Pantry:
    """
    Pobiera konkretną spiżarnię, od razu weryfikując dostęp użytkownika.
    Używa "eager loading" dla relacji, aby uniknąć problemów z lazy loading.
    """
    stmt = (
        select(Pantry)
        .join(Pantry.member_associations)
        .where(Pantry.id == pantry_id, PantryUser.user_id == user.id)
        .options(
            selectinload(Pantry.products).selectinload(Product.category),
            selectinload(Pantry.member_associations).selectinload(PantryUser.user),
        )
    )
    result = await db.execute(stmt)
    pantry = result.scalar_one_or_none()

    if not pantry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spiżarnia nie znaleziona lub brak dostępu.",
        )

    return pantry


async def require_pantry_owner(
    pantry: Pantry = Depends(get_pantry_for_user),
    user: User = Depends(get_current_user),
) -> Pantry:
    """
    Zależność, która najpierw pobiera spiżarnię i sprawdza przynależność
    użytkownika (za pomocą get_pantry_for_user), a następnie weryfikuje,
    czy zalogowany użytkownik jest jej właścicielem.
    """
    if pantry.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie masz uprawnień do wykonania tej operacji. Wymagane uprawnienia właściciela.",
        )
    return pantry
