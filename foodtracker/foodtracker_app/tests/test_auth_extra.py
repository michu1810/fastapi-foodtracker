from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.future import select  # noqa: F401
from unittest.mock import AsyncMock, patch

from foodtracker_app.auth.utils import create_access_token, hash_password
from foodtracker_app.models.product import Product  # noqa: F401
from foodtracker_app.models.user import User
from foodtracker_app.settings import settings
from foodtracker_app.tests.conftest import TestingSessionLocal
import io


# ─────────────────────────  rejestracja  ─────────────────────────


@pytest.mark.asyncio
async def test_register_bad_recaptcha(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=False),
    )

    res = await client.post(
        "/auth/register",
        json={
            "email": "spam@example.com",
            "password": "pwd",
            "recaptcha_token": "bad-token",
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Invalid reCAPTCHA"


@pytest.mark.asyncio
async def test_register_existing_social_user(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=True),
    )

    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="social@example.com",
                hashed_password=hash_password("x"),
                social_provider="google",
                is_verified=True,
            )
        )
        await db.commit()

    res = await client.post(
        "/auth/register",
        json={
            "email": "social@example.com",
            "password": "irrelevant",
            "recaptcha_token": "token",
        },
    )
    assert res.status_code == 400
    assert "google" in res.json()["detail"]


# ─────────────────────────  weryfikacja konta  ─────────────────────────


@pytest.mark.asyncio
async def test_verify_account_success_and_used(client: AsyncClient):
    token = str(uuid.uuid4())

    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="verify@example.com",
                hashed_password=hash_password("pwd"),
                verification_token=token,
            )
        )
        await db.commit()

    # pierwsze kliknięcie
    res1 = await client.get("/auth/verify", params={"token": token})
    assert res1.json() == {"status": "success"}

    # drugie kliknięcie
    res2 = await client.get("/auth/verify", params={"token": token})
    assert res2.json() == {"status": "used"}


# ─────────────────────────  refresh-token  ─────────────────────────


@pytest.mark.asyncio
async def test_refresh_token_missing_cookie(client: AsyncClient):
    res = await client.post("/auth/refresh")
    assert res.status_code == 401
    assert res.json()["detail"] == "Brak refresh tokena"


@pytest.mark.asyncio
async def test_refresh_token_happy_path(authenticated_client_factory):
    cli = await authenticated_client_factory("rt2@example.com", "secret")
    old_token = cli.headers["Authorization"].split()[1]

    refresh = create_access_token({"sub": "rt2@example.com", "provider": "password"})
    cli.cookies.set(
        "refresh_token",
        refresh,
        domain="testserver",
        path="/auth",
    )
    res = await cli.post("/auth/refresh")

    assert res.status_code == 200
    new_token = res.json()["access_token"]
    assert new_token != old_token
    payload = jwt.decode(
        new_token,
        settings.SECRET_KEY,
        algorithms=["HS256"],
        audience="foodtracker-user",
    )
    assert payload["sub"] == "rt2@example.com"


# ─────────────────────────  zmiana hasła  ─────────────────────────


@pytest.mark.asyncio
async def test_change_password_wrong_old(authenticated_client_factory):
    client = await authenticated_client_factory("pwd@example.com", "old123")
    res = await client.post(
        "/auth/change-password",
        json={"old_password": "WRONG", "new_password": "new123"},
    )
    assert res.status_code == 400
    assert "nieprawidłowe" in res.json()["detail"]


# ─────────────────────────  statystyki finansowe  ─────────────────────────


@pytest.mark.asyncio
async def test_financial_stats_autocreate(authenticated_client_factory):
    client = await authenticated_client_factory("stat@example.com", "x")
    res = await client.get("/products/stats/financial")
    assert res.status_code == 200
    assert res.json() == {"saved": 0.0, "wasted": 0.0}


# ─────────────────────────  świeży produkt  ─────────────────────────


@pytest.mark.asyncio
async def test_create_fresh_product_purchase_date(
    authenticated_client_factory, fixed_date
):
    cli = await authenticated_client_factory("f@example.com", "x")

    res = await cli.post(
        "/products/create",
        json={
            "name": "Filet z kurczaka",
            "price": 10,
            "unit": "kg",
            "initial_amount": 1,
            "is_fresh_product": True,
            "purchase_date": str(fixed_date),
            "shelf_life_days": 4,
        },
    )
    assert res.status_code == 201
    exp = fixed_date + timedelta(days=4)
    assert res.json()["expiration_date"].startswith(str(exp))


# ─────────────────────────  trendy produktów  ─────────────────────────


@pytest.mark.asyncio
async def test_product_trends_returns_full_range(authenticated_client_factory, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.func.timezone",
        new=lambda _tz, col: col,
    )

    cli = await authenticated_client_factory("trend@example.com", "x")
    days = 10
    res = await cli.get(f"/products/stats/trends?range_days={days}")

    assert res.status_code == 200
    assert len(res.json()) == days


# ─────────────────────────  avatar upload  ─────────────────────────


@pytest.mark.asyncio
async def test_upload_avatar_valid(authenticated_client):
    mock_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    file = {"file": ("avatar.png", io.BytesIO(mock_content), "image/png")}
    with patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)
    assert response.status_code == 200
    assert "avatar_url" in response.json()


# ─────────────────────────  resend-verification  ─────────────────────────


@pytest.mark.asyncio
async def test_resend_verification_email_not_found(client, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "notfound@example.com"}
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_resend_verification_email_success(mocker, authenticated_client_factory):
    mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    # użytkownik NIEzweryfikowany, NIE logujemy się
    client = await authenticated_client_factory(
        "reuser@example.com", "x", is_verified=False, login=False
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "reuser@example.com"}
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_resend_verification_email_already_verified(authenticated_client_factory):
    client = await authenticated_client_factory(
        "reuser@example.com", "x", is_verified=True
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "reuser@example.com"}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Account already verified"


# ─────────────────────────  request-password-reset  ─────────────────────────
@pytest.mark.asyncio
async def test_request_password_reset_success(mocker, authenticated_client_factory):
    mocker.patch(
        "foodtracker_app.auth.routes.send_reset_password_email", new=AsyncMock()
    )
    await authenticated_client_factory("reset@example.com", "x")
    client = await authenticated_client_factory("reset@example.com", "x")
    res = await client.post(
        "/auth/request-password-reset", json={"email": "reset@example.com"}
    )
    assert res.status_code == 200


# ─────────────────────────  reset-password  ─────────────────────────


@pytest.mark.asyncio
async def test_reset_password_success(client):
    async with TestingSessionLocal() as session:
        user = User(
            email="reset.success@example.com",
            hashed_password=hash_password("oldpwd"),
            reset_password_token="valid-token",
        )
        session.add(user)
        await session.commit()

    res = await client.post(
        "/auth/reset-password", json={"token": "valid-token", "new_password": "newpwd"}
    )
    assert res.status_code == 200


# ─────────────────────────  delete-account  ─────────────────────────
@pytest.mark.asyncio
async def test_delete_account_success(authenticated_client):
    res = await authenticated_client.delete("/auth/delete-account")
    assert res.status_code == 200
    assert "Konto zostało usunięte" in res.json()["message"]
