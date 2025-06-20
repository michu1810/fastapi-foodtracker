import os
from datetime import date, timedelta
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["TESTING"] = "True"
os.environ["SKIP_REDIS"] = "True"

os.environ["BACKEND_URL"] = "http://test"
os.environ["CLOUDINARY_API_SECRET"] = "SECRET"
os.environ["CLOUDINARY_CLOUD_NAME"] = "NAMETEST"
os.environ["CLOUDINARY_API_KEY"] = "TEST"


from foodtracker_app.auth.utils import hash_password  # noqa: E402
from foodtracker_app.db.database import Base, get_async_session  # noqa: E402
from foodtracker_app.main import app  # noqa: E402
from foodtracker_app.models.user import User  # noqa: E402

from foodtracker_app import models  # noqa: F401, E402

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

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


@pytest_asyncio.fixture()
async def client():
    """Główna fixtura testowa z lokalną bazą i nadpisaniem zależności."""
    app.dependency_overrides[get_async_session] = override_get_async_session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    app.dependency_overrides.clear()


@pytest.fixture
async def authenticated_client_factory(client: AsyncClient):
    async def _factory(
        email: str, password: str, is_verified: bool = True, login: bool = True
    ):
        async with TestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user:
                user = User(
                    email=email,
                    hashed_password=hash_password(password),
                    is_verified=is_verified,
                    social_provider="password",
                )
                session.add(user)
                await session.commit()
            else:
                user.is_verified = is_verified
                await session.commit()

        if login:
            resp = await client.post(
                "/auth/login", json={"email": email, "password": password}
            )
            assert resp.status_code == 200, resp.text
            client.headers["Authorization"] = f"Bearer {resp.json()['access_token']}"
        return client

    return _factory


@pytest_asyncio.fixture
async def authenticated_client(authenticated_client_factory):
    return await authenticated_client_factory("default.user@example.com", "password123")


@pytest.fixture
def fixed_date():
    return date.today() + timedelta(days=30)


@pytest_asyncio.fixture
async def product_in_db(authenticated_client: AsyncClient, fixed_date: date):
    payload = {
        "name": "Produkt testowy",
        "expiration_date": str(fixed_date + timedelta(days=7)),
        "price": 9.99,
        "unit": "szt.",
        "initial_amount": 5,
    }
    resp = await authenticated_client.post("/products/create", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()
