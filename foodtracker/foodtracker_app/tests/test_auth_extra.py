from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta, timezone, date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.future import select

from foodtracker_app.auth.utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
)
from foodtracker_app.models.user import User
from foodtracker_app.settings import settings
from foodtracker_app.tests.conftest import TestingSessionLocal
import random


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
async def test_register_incomplete_data(client: AsyncClient):
    """Testuje rejestrację z brakującymi danymi (np. brak recaptcha_token)."""
    res = await client.post(
        "/auth/register",
        json={
            "email": "incomplete@example.com",
            "password": "pwd",
            # brak recaptcha_token
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Incomplete registration data"


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


@pytest.mark.asyncio
async def test_register_existing_password_user(client: AsyncClient, mocker):
    """Testuje rejestrację z istniejącym użytkownikiem zalogowanym przez hasło."""
    mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=True),
    )
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="existing_pwd@example.com",
                hashed_password=hash_password("x"),
                social_provider="password",
                is_verified=True,
            )
        )
        await db.commit()
    res = await client.post(
        "/auth/register",
        json={
            "email": "existing_pwd@example.com",
            "password": "irrelevant",
            "recaptcha_token": "token",
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, mocker):
    """Testuje pomyślną rejestrację i wywołanie wysyłki emaila weryfikacyjnego."""
    mock_verify_recaptcha = mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=True),
    )
    mock_trigger_verification_email = mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    email = "new_user@example.com"
    password = "secure_password"
    recaptcha_token = "valid-recaptcha-token"

    res = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "recaptcha_token": recaptcha_token,
        },
    )
    assert res.status_code == 200
    assert (
        res.json()["message"]
        == "User created successfully. Sprawdź email, by aktywować konto."
    )
    mock_verify_recaptcha.assert_called_once_with(recaptcha_token)
    mock_trigger_verification_email.assert_called_once()

    async with TestingSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        new_user = result.scalar_one_or_none()
        assert new_user is not None
        assert new_user.email == email
        assert new_user.social_provider == "password"
        assert new_user.hashed_password is not None
        assert not new_user.is_verified


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
                token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
        )
        await db.commit()
    # pierwsze kliknięcie
    res1 = await client.get("/auth/verify", params={"token": token})
    assert res1.json() == {"status": "success"}

    # drugie kliknięcie
    res2 = await client.get("/auth/verify", params={"token": token})
    assert res2.json() == {"status": "used"}


@pytest.mark.asyncio
async def test_verify_account_expired_token(client: AsyncClient):
    """Testuje weryfikację konta z wygasłym tokenem."""
    token = str(uuid.uuid4())
    async with TestingSessionLocal() as db:
        user = User(
            email="expired@example.com",
            hashed_password=hash_password("pwd"),
            verification_token=token,
            token_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        db.add(user)
        await db.commit()
    res = await client.get("/auth/verify", params={"token": token})
    assert res.json() == {"status": "expired"}


@pytest.mark.asyncio
async def test_verify_account_invalid_token(client: AsyncClient):
    """Testuje weryfikację konta z nieistniejącym/nieprawidłowym tokenem."""
    res = await client.get("/auth/verify", params={"token": "non-existent-token"})
    assert res.json() == {"status": "invalid"}


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
async def test_resend_verification_email_missing_email(client: AsyncClient):
    """Testuje ponowne wysłanie emaila weryfikacyjnego bez podania emaila."""
    res = await client.post("/auth/resend-verification", json={})
    assert res.status_code == 400
    assert res.json()["detail"] == "Email is required."


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
async def test_resend_verification_email_already_verified(
    authenticated_client_factory,
):
    client = await authenticated_client_factory(
        "reuser_verified@example.com", "x", is_verified=True
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "reuser_verified@example.com"}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Account already verified"


@pytest.mark.asyncio
async def test_resend_verification_email_too_soon(authenticated_client_factory, mocker):
    """Testuje ponowne wysłanie emaila weryfikacyjnego zbyt szybko po poprzednim."""
    mock_trigger_verification_email = mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    user_email = "resend_too_soon@example.com"
    async with TestingSessionLocal() as db:
        user = User(
            email=user_email,
            hashed_password=hash_password("x"),
            is_verified=False,
            token_expires_at=datetime.now(timezone.utc) + timedelta(seconds=59),
        )
        db.add(user)
        await db.commit()
    # Nie musimy logować użytkownika, to jest endpoint publiczny
    client = await authenticated_client_factory(
        user_email, "x", is_verified=False, login=False
    )

    res = await client.post("/auth/resend-verification", json={"email": user_email})
    assert res.status_code == 429
    assert res.json()["detail"] == "Odczekaj minutę przed ponownym wysłaniem."
    mock_trigger_verification_email.assert_not_called()


# ─────────────────────────  login  ─────────────────────────


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Testuje logowanie z nieprawidłowymi danymi."""
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="wrongpass@example.com",
                hashed_password=hash_password("correct_password"),
            )
        )
        await db.commit()
    res = await client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrong_password"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials"

    res = await client.post(
        "/auth/login",
        json={"email": "nonexistent@example.com", "password": "any_password"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_unverified_account(authenticated_client_factory):
    """Testuje logowanie niezweryfikowanego konta."""
    client = await authenticated_client_factory(
        "unverified@example.com", "pwd", is_verified=False, login=False
    )
    res = await client.post(
        "/auth/login", json={"email": "unverified@example.com", "password": "pwd"}
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Zweryfikuj email przed zalogowaniem"


@pytest.mark.asyncio
async def test_login_success(authenticated_client_factory):
    """Testuje pomyślne logowanie i sprawdza ciasteczka."""
    client = await authenticated_client_factory(
        "verified@example.com", "pwd", is_verified=True, login=False
    )
    res = await client.post(
        "/auth/login", json={"email": "verified@example.com", "password": "pwd"}
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert "refresh_token" in res.cookies
    assert res.cookies["refresh_token"].startswith("eyJ")


# ─────────────────────────  logout  ─────────────────────────


@pytest.mark.asyncio
async def test_logout_success(authenticated_client: AsyncClient):
    """Testuje pomyślne wylogowanie i usunięcie ciasteczka."""
    res = await authenticated_client.post("/auth/logout")
    cookie_hdr = res.headers["Set-Cookie"]
    assert 'refresh_token=""' in cookie_hdr
    assert "Max-Age=0" in cookie_hdr


# ─────────────────────────  avatar upload  ─────────────────────────


@pytest.mark.asyncio
async def test_upload_avatar_valid(authenticated_client):
    """--- ZMIANA --- Testuje pomyślny upload z mockowaniem Cloudinary."""
    mock_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    file = {"file": ("avatar.png", io.BytesIO(mock_content), "image/png")}

    # Mockujemy funkcję upload_image, aby nie łączyła się z prawdziwym Cloudinary
    with patch(
        "foodtracker_app.auth.routes.upload_image",
        return_value="http://fake-cloudinary.com/avatar.png",
    ) as mock_upload, patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)

    assert response.status_code == 200
    assert response.json()["avatar_url"] == "http://fake-cloudinary.com/avatar.png"
    mock_upload.assert_called_once()


@pytest.mark.asyncio
async def test_upload_avatar_no_file(authenticated_client: AsyncClient):
    """Testuje upload avatara bez pliku."""
    response = await authenticated_client.post("/auth/me/avatar")
    assert response.status_code == 422
    assert "Field required" in response.json()["detail"][0]["msg"]


@pytest.mark.asyncio
async def test_upload_avatar_file_too_large(authenticated_client: AsyncClient):
    """Testuje upload avatara z plikiem zbyt dużym."""
    mock_content = b"\x00" * (5 * 1024 * 1024 + 1)  # 5MB + 1 bajt
    file = {"file": ("large.png", io.BytesIO(mock_content), "image/png")}
    with patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)
    assert response.status_code == 413
    assert "Plik jest za duży." in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_avatar_invalid_mime_type(authenticated_client: AsyncClient):
    """Testuje upload avatara z niepoprawnym typem MIME."""
    mock_content = b"not an image"
    file = {"file": ("document.txt", io.BytesIO(mock_content), "text/plain")}
    with patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="text/plain"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)
    assert response.status_code == 400
    assert "Niepoprawny typ MIME." in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_avatar_success_with_db_update(authenticated_client_factory):
    """--- ZMIANA --- Testuje pomyślny upload i aktualizację URL z mockowaniem Cloudinary."""
    user_email = "avatar_user_db@example.com"
    client = await authenticated_client_factory(user_email, "pwd")
    mock_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    file = {"file": ("avatar.png", io.BytesIO(mock_content), "image/png")}
    fake_url = f"http://fake-cloudinary.com/{user_email}.png"

    # Mockujemy funkcję upload_image, aby nie łączyła się z prawdziwym Cloudinary
    with patch(
        "foodtracker_app.auth.routes.upload_image", return_value=fake_url
    ) as mock_upload, patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await client.post("/auth/me/avatar", files=file)

    assert response.status_code == 200
    assert response.json()["avatar_url"] == fake_url
    mock_upload.assert_called_once()

    # Sprawdzenie, czy URL avatara został zapisany w bazie
    async with TestingSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.avatar_url == fake_url


# ─────────────────────────  request-password-reset  ─────────────────────────


@pytest.mark.asyncio
async def test_request_password_reset_success(mocker, authenticated_client_factory):
    """Testuje pomyślne żądanie resetu hasła dla istniejącego użytkownika."""
    mocker.patch(
        "foodtracker_app.auth.routes.send_reset_password_email", new=AsyncMock()
    )
    # Fabryka utworzy użytkownika, a `login=False` sprawi, że nie będzie zalogowany.
    client = await authenticated_client_factory(
        "reset_success@example.com", "x", login=False
    )

    res = await client.post(
        "/auth/request-password-reset", json={"email": "reset_success@example.com"}
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_request_password_reset_missing_email(client: AsyncClient):
    """Testuje żądanie resetu hasła bez podania emaila."""
    res = await client.post("/auth/request-password-reset", json={})
    assert res.status_code == 400
    assert res.json()["detail"] == "Email jest wymagany"


@pytest.mark.asyncio
async def test_request_password_reset_non_existent_email(client: AsyncClient, mocker):
    """Testuje żądanie resetu hasła dla nieistniejącego emaila."""
    mock_send_email = mocker.patch(
        "foodtracker_app.auth.routes.send_reset_password_email", new=AsyncMock()
    )
    res = await client.post(
        "/auth/request-password-reset",
        json={"email": "nonexistent_reset@example.com"},
    )
    assert res.status_code == 200
    assert (
        res.json()["message"]
        == "Jeśli konto o podanym adresie email istnieje, wysłano link do resetu hasła."
    )
    mock_send_email.assert_not_called()


# ─────────────────────────  reset-password  ─────────────────────────


@pytest.mark.asyncio
async def test_reset_password_success(client):
    async with TestingSessionLocal() as session:
        user = User(
            email="reset.success_token@example.com",
            hashed_password=hash_password("oldpwd"),
            reset_password_token="valid-token",
            reset_password_expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=15),
        )
        session.add(user)
        await session.commit()
    res = await client.post(
        "/auth/reset-password",
        json={"token": "valid-token", "new_password": "newpwd"},
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_missing_data(client: AsyncClient):
    """Testuje reset hasła z brakującymi danymi."""
    res = await client.post("/auth/reset-password", json={"token": "some-token"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Token i nowe hasło są wymagane"

    res = await client.post("/auth/reset-password", json={"new_password": "newpwd"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Token i nowe hasło są wymagane"


@pytest.mark.asyncio
async def test_reset_password_expired_token(client: AsyncClient):
    """Testuje reset hasła z wygasłym tokenem."""
    expired_token = str(uuid.uuid4())
    async with TestingSessionLocal() as session:
        user = User(
            email="expired_reset_token@example.com",
            hashed_password=hash_password("oldpwd"),
            reset_password_token=expired_token,
            reset_password_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        session.add(user)
        await session.commit()
    res = await client.post(
        "/auth/reset-password",
        json={"token": expired_token, "new_password": "newpwd"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Token wygasł"


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


@pytest.mark.asyncio
async def test_change_password_social_user(authenticated_client_factory, mocker):
    """Testuje zmianę hasła dla użytkownika zalogowanego przez social media."""
    user_email = "socialchange_test@example.com"
    social_provider = "google"

    async with TestingSessionLocal() as db:
        user = User(
            email=user_email,
            hashed_password=hash_password("not_applicable"),
            social_provider=social_provider,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    client_for_test = await authenticated_client_factory(
        user_email, "some_dummy_password", is_verified=True, login=False
    )

    access_token_for_mock_user = create_access_token(
        {"sub": user_email, "provider": social_provider}
    )
    client_for_test.headers["Authorization"] = f"Bearer {access_token_for_mock_user}"

    with patch(
        "foodtracker_app.auth.routes.get_current_user",
        new=AsyncMock(return_value=user),
    ):
        res = await client_for_test.post(
            "/auth/change-password",
            json={"old_password": "any_password", "new_password": "new_pwd"},
        )
    assert res.status_code == 400
    assert (
        "Użytkownicy zalogowani przez konta społecznościowe nie mogą zmieniać hasła."
        in res.json()["detail"]
    )


# ─────────────────────────  refresh-token  ─────────────────────────


@pytest.mark.asyncio
async def test_refresh_token_missing_cookie(client: AsyncClient):
    res = await client.post("/auth/refresh")
    assert res.status_code == 401
    assert res.json()["detail"] == "Brak refresh tokena"


@pytest.mark.asyncio
async def test_refresh_token_happy_path(authenticated_client_factory):
    cli = await authenticated_client_factory("rt2_test@example.com", "secret")
    old_token = cli.headers["Authorization"].split()[1]

    refresh = create_refresh_token(
        {"sub": "rt2_test@example.com", "provider": "password"}
    )
    # W tym teście `cli.cookies.set` działa poprawnie, więc możemy go zostawić
    # dla demonstracji obu podejść.
    cli.cookies.set(
        "refresh_token",
        refresh,
        domain="test",
        path="/",
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
    assert payload["sub"] == "rt2_test@example.com"


@pytest.mark.asyncio
async def test_refresh_token_invalid_jwt_error(client: AsyncClient):
    """Testuje odświeżenie tokena z nieprawidłowym (uszkodzonym) tokenem JWT."""
    invalid_refresh_token = "invalid.jwt.token.malformed"
    # ZMIANA: Przekazujemy ciasteczko bezpośrednio w zapytaniu
    res = await client.post(
        "/auth/refresh", cookies={"refresh_token": invalid_refresh_token}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Refresh token niepoprawny"


@pytest.mark.asyncio
async def test_refresh_token_no_sub_in_payload(client: AsyncClient):
    """Testuje odświeżenie tokena, gdy payload nie zawiera 'sub'."""
    refresh_token_no_sub = create_refresh_token({"some_other_key": "value"})
    # ZMIANA: Przekazujemy ciasteczko bezpośrednio w zapytaniu
    res = await client.post(
        "/auth/refresh", cookies={"refresh_token": refresh_token_no_sub}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Brak sub w refresh tokenie"


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


@pytest.mark.asyncio
async def test_request_password_reset_for_social_account(client: AsyncClient):
    """Testuje, czy żądanie resetu hasła jest blokowane dla konta social."""
    email = "social.user.for.reset@example.com"
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                hashed_password="social",  # Placeholder
                social_provider="google",
                is_verified=True,
            )
        )
        await db.commit()

    res = await client.post("/auth/request-password-reset", json={"email": email})

    assert res.status_code == 400
    assert "To konto nie używa hasła" in res.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_success(authenticated_client_factory):
    """Testuje pomyślną zmianę hasła."""
    user_email = "change_pass_success@example.com"
    old_password = "old_password_123"
    new_password = "new_password_456"

    client = await authenticated_client_factory(user_email, old_password)

    res = await client.post(
        "/auth/change-password",
        json={"old_password": old_password, "new_password": new_password},
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Hasło zostało zmienione pomyślnie"

    new_client = await authenticated_client_factory(
        user_email, new_password, login=False
    )
    login_res = await new_client.post(
        "/auth/login", json={"email": user_email, "password": new_password}
    )
    assert login_res.status_code == 200, login_res.text


@pytest.mark.asyncio
async def test_delete_account_success(authenticated_client_factory):
    """Testuje pomyślne usunięcie konta."""
    user_email = "to_be_deleted@example.com"
    password = "password123"
    client = await authenticated_client_factory(user_email, password)

    delete_res = await client.delete("/auth/delete-account")
    assert delete_res.status_code == 200
    assert delete_res.json()["message"] == "Konto zostało usunięte"

    async with TestingSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == user_email))
        assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_create_product_with_past_date(authenticated_client):
    """Testuje walidację - data ważności nie może być z przeszłości."""
    payload = {
        "name": "Przeterminowany produkt",
        "expiration_date": str(date.today() - timedelta(days=1)),
        "price": 5.0,
        "unit": "szt.",
        "initial_amount": 1,
        "is_fresh_product": False,
    }
    response = await authenticated_client.post("/products/create", json=payload)
    assert response.status_code == 422
    assert "Data ważności nie może być z przeszłości" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_fresh_product_without_purchase_date(authenticated_client):
    """Testuje walidację - świeży produkt musi mieć datę zakupu."""
    payload = {
        "name": "Świeży kurczak",
        "price": 20.0,
        "unit": "kg",
        "initial_amount": 1.5,
        "is_fresh_product": True,
        "shelf_life_days": 3,
        # Celowy brak purchase_date
    }
    response = await authenticated_client.post("/products/create", json=payload)
    assert response.status_code == 422
    assert "Brakuje daty zakupu dla świeżego produktu" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_non_existent_product_by_id(authenticated_client):
    """Testuje próbę pobrania nieistniejącego produktu."""
    response = await authenticated_client.get("/products/get/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_use_product_not_found(authenticated_client):
    """Testuje próbę zużycia nieistniejącego produktu."""
    response = await authenticated_client.post(
        "/products/use/99999", json={"amount": 1}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_waste_product_not_found(authenticated_client):
    """Testuje próbę wyrzucenia nieistniejącego produktu."""
    response = await authenticated_client.post(
        "/products/waste/99999", json={"amount": 1}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_product_with_zero_price_fails(authenticated_client_factory):
    """Testuje, czy walidacja Pydantic blokuje stworzenie produktu z ceną 0."""
    client = await authenticated_client_factory("zeroprice@example.com", "password")
    create_payload = {
        "name": "Produkt darmowy",
        "expiration_date": str(date.today() + timedelta(days=5)),
        "price": 0.0,
        "unit": "szt.",
        "initial_amount": 1,
        "is_fresh_product": False,
    }
    create_res = await client.post("/products/create", json=create_payload)

    assert create_res.status_code == 422
    assert "Input should be greater than 0" in str(create_res.json()["detail"])


@pytest.mark.asyncio
async def test_get_expiring_products_logic(authenticated_client_factory):
    """Testuje endpoint /expiring-soon, pokrywając dużą część nieprzetestowanego kodu."""
    client = await authenticated_client_factory("expiring@example.com", "password")
    today = date.today()

    # Ten produkt powinien się pojawić
    await client.post(
        "/products/create",
        json={
            "name": "Zaraz się zepsuje",
            "expiration_date": str(today + timedelta(days=3)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
            "is_fresh_product": False,
        },
    )
    # Ten produkt też (na granicy)
    await client.post(
        "/products/create",
        json={
            "name": "Na granicy",
            "expiration_date": str(today + timedelta(days=7)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
            "is_fresh_product": False,
        },
    )
    # Ten produkt nie
    await client.post(
        "/products/create",
        json={
            "name": "Długa data",
            "expiration_date": str(today + timedelta(days=8)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
            "is_fresh_product": False,
        },
    )
    # Ten produkt nie (już zużyty)
    res = await client.post(
        "/products/create",
        json={
            "name": "Już zjedzony",
            "expiration_date": str(today + timedelta(days=1)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
            "is_fresh_product": False,
        },
    )
    product_id = res.json()["id"]
    await client.post(f"/products/use/{product_id}", json={"amount": 1})

    # Sprawdź endpoint z domyślnym progiem 7 dni
    response = await client.get("/products/expiring-soon")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert {p["name"] for p in data} == {"Zaraz się zepsuje", "Na granicy"}

    # Sprawdź z progiem 2 dni
    response_2 = await client.get("/products/expiring-soon?days=2")
    assert response_2.status_code == 200
    assert len(response_2.json()) == 0  # "Zaraz się zepsuje" ma 3 dni ważności


@pytest.mark.asyncio
async def test_update_product_success(authenticated_client_factory, fixed_date):
    """Testuje poprawna aktualizacje istniejacego produktu."""
    client = await authenticated_client_factory("update.test@example.com", "x")

    create_res = await client.post(
        "/products/create",
        json={
            "name": "Ser",
            "expiration_date": str(fixed_date),
            "price": 12.0,
            "unit": "szt.",
            "initial_amount": 1,
            "is_fresh_product": False,
        },
    )
    assert create_res.status_code == 201
    product = create_res.json()
    product_id = product["id"]

    new_name = f"Zmieniony Ser {random.randint(1000, 9999)}"
    new_date = str(date.today() + timedelta(days=20))

    update_res = await client.put(
        f"/products/update/{product_id}",
        json={
            "name": new_name,
            "expiration_date": new_date,
            "price": product["price"],
            "unit": product["unit"],
            "initial_amount": product["initial_amount"],
            "is_fresh_product": False,
        },
    )

    assert update_res.status_code == 200
    assert update_res.json()["name"] == new_name
    assert update_res.json()["expiration_date"].startswith(new_date)

    get_res = await client.get(f"/products/get/{product_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == new_name
