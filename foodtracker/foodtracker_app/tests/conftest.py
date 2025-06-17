import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from datetime import date, timedelta

os.environ['TESTING'] = 'True'
os.environ['SKIP_REDIS'] = 'True'

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
	async with TestingSessionLocal() as session:
		yield session


@pytest_asyncio.fixture()
async def client():
	"""Główna fixtura tworząca asynchronicznego klienta i zarządzająca bazą danych."""
	app.dependency_overrides[get_async_session] = override_get_async_session
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)

	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
		yield c

	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.drop_all)
	app.dependency_overrides.clear()


@pytest.fixture
async def authenticated_client_factory(client: AsyncClient):
	"""Zwraca asynchroniczną fabrykę do tworzenia i logowania użytkowników."""

	async def _factory(email, password):
		async with TestingSessionLocal() as session:
			test_user = User(email=email, hashed_password=hash_password(password), is_verified=True)
			session.add(test_user)
			await session.commit()

		login_payload = {"email": email, "password": password}
		# Dodajemy 'await', ponieważ klient jest teraz asynchroniczny
		response = await client.post("/auth/login", json=login_payload)

		assert response.status_code == 200, f"Logowanie w teście jako {email} nie powiodło się: {response.text}"

		token = response.json()["access_token"]
		client.headers["Authorization"] = f"Bearer {token}"
		return client

	return _factory


@pytest_asyncio.fixture
async def authenticated_client(authenticated_client_factory):
	"""Zwraca klienta uwierzytelnionego jako domyślny użytkownik testowy."""
	client = await authenticated_client_factory("default.user@example.com", "password123")
	return client


@pytest.fixture
def fixed_date():
	"""Zwraca stałą datę, aby testy były deterministyczne."""
	return date(2025, 6, 17)


@pytest_asyncio.fixture
async def product_in_db(authenticated_client: AsyncClient, fixed_date: date):
	"""Fixtura tworząca domyślny produkt w bazie danych i zwracająca jego dane."""
	payload = {
		"name": "Produkt testowy",
		"expiration_date": str(fixed_date + timedelta(days=7)),
		"price": 9.99,
		"unit": "szt.",
		"initial_amount": 5
	}
	response = await authenticated_client.post("/products/create", json=payload)
	assert response.status_code == 201, f"Tworzenie produktu w teście nie powiodło się: {response.text}"
	return response.json()