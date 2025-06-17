import pytest
from httpx import AsyncClient

from foodtracker_app.auth.utils import (
    create_refresh_token,
    hash_password,
)
from foodtracker_app.models.user import User
from foodtracker_app.tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient, mocker):
    """Dodajemy usera bezpośrednio w DB, logujemy się endpointem."""

    mocker.patch(
        "foodtracker_app.utils.recaptcha.verify_recaptcha",
        new=mocker.AsyncMock(return_value=True),
    )
    mocker.patch(
        "foodtracker_app.auth.utils.trigger_verification_email",
        new=mocker.AsyncMock(),
    )

    email, pwd = "new@example.com", "pass123"

    async with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                hashed_password=hash_password(pwd),
                is_verified=True,
                social_provider="password",
            )
        )
        await db.commit()

    res = await client.post("/auth/login", json={"email": email, "password": pwd})
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_refresh_token_works(authenticated_client_factory):
    """Sprawdza czy endpoint /auth/refresh zwraca NOWY access-token bez warningu httpx."""

    client = await authenticated_client_factory("rt@example.com", "abc123")
    old_access = client.headers["Authorization"].split()[1]

    refresh_cookie = create_refresh_token(
        {"sub": "rt@example.com", "provider": "password"}
    )
    client.cookies.set("refresh_token", refresh_cookie)

    res = await client.post(
        "/auth/refresh"
    )  # bez parametru cookies → brak DeprecationWarning
    assert res.status_code == 200

    new_access = res.json()["access_token"]
    assert new_access != old_access  # powinien być świeży


@pytest.mark.asyncio
async def test_request_password_reset_flow(client: AsyncClient, mocker):
    send_mail = mocker.patch(
        "foodtracker_app.auth.routes.send_reset_password_email",
        new=mocker.AsyncMock(),
    )

    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="reset@example.com",
                hashed_password=hash_password("pwd"),
                is_verified=True,
                social_provider="password",
            )
        )
        await db.commit()

    res = await client.post(
        "/auth/request-password-reset", json={"email": "reset@example.com"}
    )
    assert res.status_code == 200
    send_mail.assert_awaited_once()
