import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from datetime import date, timedelta

os.environ['SKIP_REDIS'] = 'False'
os.environ['TESTING'] = 'False'

# Teraz import aplikacji jest bezpieczny
from foodtracker_app.main import app
from foodtracker_app.db.database import Base, get_async_session
from foodtracker_app.auth.utils import hash_password
from foodtracker_app.models.user import User


SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    engine, class_=AsyncSession, autocommit=False, autoflush=False, expire_on_commit=False
)


async def override_get_async_session():
    """Nadpisuje zależność get_async_session na czas testów."""

    async with TestingSessionLocal() as session:
       yield session


@pytest.fixture()
async def client():
    app.dependency_overrides[get_async_session] = override_get_async_session

    async with engine.begin() as conn:
       await conn.run_sync(Base.metadata.create_all)

    with TestClient(app) as c:
       yield c

    async with engine.begin() as conn:
       await conn.run_sync(Base.metadata.drop_all)

    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_client_factory(client):
    """
    Zwraca asynchroniczną funkcję (fabrykę) do tworzenia
    i logowania nowych użytkowników na potrzeby testów.
    """
    async def _factory(email, password):
        async with TestingSessionLocal() as session:
            test_user = User(
                email=email,
                hashed_password=hash_password(password),
                is_verified=True
            )
            session.add(test_user)
            await session.commit()


        login_data = {"email": email, "password": password}
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 200, f"Logowanie jako {email} nie powiodło się: {response.text}"
        token = response.json()["access_token"]


        client.headers["Authorization"] = f"Bearer {token}"
        return client

    return _factory


@pytest.fixture
async def authenticated_client(authenticated_client_factory):
    """
    Zwraca klienta uwierzytelnionego jako domyślny użytkownik testowy.
    """
    # Używamy fabryki do stworzenia i zalogowania klienta z domyślnymi danymi
    client = await authenticated_client_factory("default.user@example.com", "password123")
    return client



@pytest.fixture
async def product_in_db(authenticated_client):
    """
    Fixtura tworząca domyślny produkt w bazie danych
    i zwracająca jego dane.
    """
    response = authenticated_client.post(
        "/products/create",
        json={
            "name": "Produkt testowy",
            "expiration_date": str(date.today() + timedelta(days=7)),
            "quantity": 5
        }
    )
    assert response.status_code == 201
    return response.json()