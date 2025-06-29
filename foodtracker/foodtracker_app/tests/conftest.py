import os
import pytest
import pytest_asyncio
from datetime import date, timedelta
from httpx import ASGITransport, AsyncClient
from typing import Callable, Coroutine, Tuple, AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

os.environ["TESTING"] = "True"
os.environ["SKIP_REDIS"] = "True"
os.environ["BACKEND_URL"] = "http://test"
os.environ["CLOUDINARY_API_SECRET"] = "SECRET"
os.environ["CLOUDINARY_CLOUD_NAME"] = "NAMETEST"
os.environ["CLOUDINARY_API_KEY"] = "TEST"

from foodtracker_app.auth.utils import hash_password  # noqa : E402
from foodtracker_app.db.database import Base, get_async_session  # noqa : E402
from foodtracker_app.main import app  # noqa : E402
from foodtracker_app.models import User, Pantry, PantryUser  # noqa : E402

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./test.db?cache=shared"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def override_get_async_session():
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncClient:
    app.dependency_overrides[get_async_session] = override_get_async_session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
def authenticated_client_factory(
    client: AsyncClient,
) -> Callable[..., Coroutine[any, any, Tuple[AsyncClient, Pantry]]]:
    """
    Fabryka do tworzenia autoryzowanych klientów.
    Zwraca krotkę (klient, obiekt spiżarni).
    """

    # POPRAWKA: Dodajemy argument `login`, aby móc tworzyć użytkowników bez logowania
    async def _factory(
        email: str, password: str, is_verified: bool = True, login: bool = True
    ) -> Tuple[AsyncClient, Pantry]:
        async with TestingSessionLocal() as session:
            user_result = await session.execute(select(User).where(User.email == email))
            user = user_result.scalar_one_or_none()
            if not user:
                user = User(
                    email=email,
                    hashed_password=hash_password(password),
                    is_verified=is_verified,
                    send_expiration_notifications=True,
                )
                session.add(user)
                await session.flush()

            pantry_result = await session.execute(
                select(Pantry).where(Pantry.owner_id == user.id)
            )
            pantry = pantry_result.scalar_one_or_none()
            if not pantry:
                pantry = Pantry(name=f"Spiżarnia {user.email}", owner_id=user.id)
                session.add(pantry)
                await session.flush()

            link_result = await session.execute(
                select(PantryUser).where(
                    PantryUser.user_id == user.id, PantryUser.pantry_id == pantry.id
                )
            )
            if not link_result.scalar_one_or_none():
                session.add(PantryUser(user_id=user.id, pantry_id=pantry.id))

            await session.commit()
            await session.refresh(pantry)

        # POPRAWKA: Logujemy klienta tylko jeśli `login` jest True
        if login:
            res = await client.post(
                "/auth/login",
                json={"email": email, "password": password},
            )
            assert res.status_code == 200, f"Logowanie nie powiodło się: {res.text}"
            token = res.json()["access_token"]
            client.headers["Authorization"] = f"Bearer {token}"

        return client, pantry

    return _factory


@pytest_asyncio.fixture
async def authenticated_client(
    authenticated_client_factory: Callable[
        ..., Coroutine[any, any, Tuple[AsyncClient, Pantry]]
    ],
) -> AsyncClient:
    client, pantry = await authenticated_client_factory(
        "default.user@example.com", "password123"
    )
    setattr(client, "pantry", pantry)
    return client


@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Fikstura tworząca czystą bazę danych i dostarczająca sesję
    do bezpośredniego użytku w testach.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session  # Udostępnia sesję do testu

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def fixed_date() -> date:
    return date.today() + timedelta(days=30)
