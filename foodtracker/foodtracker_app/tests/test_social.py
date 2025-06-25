import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from unittest.mock import AsyncMock
from sqlalchemy.future import select

from foodtracker_app.auth.social import get_or_create_user, resolve_user_data
from foodtracker_app.auth.utils import hash_password
from foodtracker_app.models.user import User
from foodtracker_app.settings import settings
from foodtracker_app.tests.conftest import TestingSessionLocal

# Stałe z fałszywymi danymi
GOOGLE_USER_INFO = {"email": "test.google@example.com", "name": "Test Google User"}
GITHUB_USER_INFO = {"email": "test.github@example.com", "name": "Test GitHub User"}
GITHUB_USER_EMAILS = [
    {"email": "other@example.com", "primary": False, "verified": True},
    {"email": "primary.github@example.com", "primary": True, "verified": True},
]


@pytest.mark.asyncio
async def test_google_login_redirect(client: AsyncClient):
    response = await client.get("/google/login", follow_redirects=False)
    assert response.status_code == 302


@pytest.mark.asyncio
async def test_google_callback_new_user(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.authorize_access_token",
        new=AsyncMock(return_value={"access_token": "fake-google-token"}),
    )
    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.userinfo",
        new=AsyncMock(return_value=GOOGLE_USER_INFO),
    )

    response = await client.get(
        "/google/callback?code=fakecode", follow_redirects=False
    )

    assert response.status_code == 307
    redirect_url = response.headers["location"]
    assert redirect_url.startswith(f"{settings.FRONTEND_URL}/google/callback?token=")
    assert "refresh_token" in response.cookies

    async with TestingSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == GOOGLE_USER_INFO["email"])
        )
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.social_provider == "google"


@pytest.mark.asyncio
async def test_google_callback_existing_password_user(client: AsyncClient, mocker):
    email = "password.user@example.com"
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                hashed_password=hash_password("pwd"),
                social_provider="password",
            )
        )
        await db.commit()

    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.authorize_access_token",
        new=AsyncMock(return_value={"access_token": "fake-token"}),
    )
    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.userinfo",
        new=AsyncMock(return_value={"email": email, "name": "Test Password User"}),
    )

    response = await client.get(
        "/google/callback?code=fakecode", follow_redirects=False
    )
    assert response.status_code == 307

    async with TestingSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        assert user.social_provider == "password"
        assert user.is_verified is True


@pytest.mark.asyncio
async def test_google_callback_no_email(client: AsyncClient, mocker):
    # POPRAWIONY TEST
    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.authorize_access_token",
        new=AsyncMock(return_value={"access_token": "fake-token"}),
    )
    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.userinfo",
        new=AsyncMock(return_value={"name": "No Email User"}),
    )
    response = await client.get(
        "/google/callback?code=fakecode", follow_redirects=False
    )
    # Sprawdzamy, czy jest przekierowanie z błędem
    assert response.status_code == 307
    assert response.headers["location"].startswith(
        f"{settings.FRONTEND_URL}/login?error="
    )


@pytest.mark.asyncio
async def test_google_callback_auth_error(client: AsyncClient, mocker):
    # POPRAWIONY TEST
    mocker.patch(
        "foodtracker_app.auth.social.oauth.google.authorize_access_token",
        new=AsyncMock(side_effect=Exception("Auth error")),
    )
    response = await client.get(
        "/google/callback?code=fakecode", follow_redirects=False
    )
    # Sprawdzamy, czy jest przekierowanie z błędem
    assert response.status_code == 307
    assert response.headers["location"].startswith(
        f"{settings.FRONTEND_URL}/login?error="
    )


@pytest.mark.asyncio
async def test_github_login_redirect(client: AsyncClient):
    response = await client.get("/github/login", follow_redirects=False)
    assert response.status_code == 302


@pytest.mark.asyncio
async def test_github_callback_primary_email_found(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.authorize_access_token",
        new=AsyncMock(return_value={"access_token": "fake-github-token"}),
    )
    mock_resp = AsyncMock()
    mock_resp.json = AsyncMock(return_value=GITHUB_USER_INFO)
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.get",
        new=AsyncMock(return_value=mock_resp),
    )

    response = await client.get(
        "/github/callback?code=fakecode", follow_redirects=False
    )

    assert response.status_code == 307
    assert "refresh_token" in response.cookies
    async with TestingSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == GITHUB_USER_INFO["email"])
        )
        assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_github_callback_secondary_email_used(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.authorize_access_token",
        new=AsyncMock(return_value={"access_token": "fake-github-token"}),
    )
    mock_resp_user = AsyncMock()
    mock_resp_user.json = AsyncMock(return_value={"name": "GitHub User No-Email"})
    mock_resp_emails = AsyncMock()
    mock_resp_emails.json = AsyncMock(return_value=GITHUB_USER_EMAILS)
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.get",
        new=AsyncMock(side_effect=[mock_resp_user, mock_resp_emails]),
    )

    response = await client.get(
        "/github/callback?code=fakecode", follow_redirects=False
    )
    assert response.status_code == 307

    async with TestingSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "primary.github@example.com")
        )
        assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_github_callback_no_email_at_all(client: AsyncClient, mocker):
    # POPRAWIONY TEST
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.authorize_access_token",
        new=AsyncMock(return_value={"access_token": "fake-github-token"}),
    )
    mock_resp_user = AsyncMock()
    mock_resp_user.json = AsyncMock(return_value={"name": "GitHub User No-Email"})
    mock_resp_emails = AsyncMock()
    mock_resp_emails.json = AsyncMock(return_value=[])
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.get",
        new=AsyncMock(side_effect=[mock_resp_user, mock_resp_emails]),
    )

    response = await client.get(
        "/github/callback?code=fakecode", follow_redirects=False
    )
    # Sprawdzamy, czy jest przekierowanie z błędem
    assert response.status_code == 307
    assert response.headers["location"].startswith(
        f"{settings.FRONTEND_URL}/login?error="
    )


@pytest.mark.asyncio
async def test_get_or_create_user_existing_social_user(client: AsyncClient):
    email = "existing.social@example.com"
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                hashed_password="social",
                social_provider="google",
                is_verified=True,
            )
        )
        await db.commit()

        user = await get_or_create_user(db, email, "google")
        assert user.email == email
        assert user.social_provider == "google"


@pytest.mark.asyncio
async def test_github_callback_auth_error(client: AsyncClient, mocker):
    # POPRAWIONY TEST
    mocker.patch(
        "foodtracker_app.auth.social.oauth.github.authorize_access_token",
        new=AsyncMock(side_effect=Exception("Auth error")),
    )
    response = await client.get(
        "/github/callback?code=fakecode", follow_redirects=False
    )
    # Sprawdzamy, czy jest przekierowanie z błędem
    assert response.status_code == 307
    assert response.headers["location"].startswith(
        f"{settings.FRONTEND_URL}/login?error="
    )


@pytest.mark.asyncio
async def test_resolve_user_data_handles_dict():
    test_dict = {"key": "value"}
    assert await resolve_user_data(test_dict) == test_dict


@pytest.mark.asyncio
async def test_resolve_user_data_handles_bad_type():
    with pytest.raises(TypeError, match="Nieobsługiwany typ odpowiedzi"):
        await resolve_user_data(123)


@pytest.mark.asyncio
async def test_get_or_create_user_conflicting_provider(client: AsyncClient):
    # POPRAWIONY TEST
    email = "conflict@example.com"
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                hashed_password="social",
                social_provider="google",
                is_verified=True,
            )
        )
        await db.commit()

        with pytest.raises(HTTPException) as exc_info:
            await get_or_create_user(db, email, "github")

        assert exc_info.value.status_code == 400
        assert "Ten adres e-mail jest już zarejestrowany" in exc_info.value.detail
        assert "Google" in exc_info.value.detail


@pytest.mark.asyncio
async def test_resolve_user_data_with_json_method(mocker):
    mock_response = mocker.AsyncMock()
    mock_response.json = mocker.AsyncMock(return_value={"data": "z json"})

    result = await resolve_user_data(mock_response)
    assert result == {"data": "z json"}
    mock_response.json.assert_called_once()


@pytest.mark.asyncio
async def test_resolve_user_data_type_error_then_json(mocker):
    mock_response = mocker.Mock()
    mock_response.json = mocker.Mock(
        side_effect=[TypeError, {"data": "z drugiego json"}]
    )

    result = await resolve_user_data(mock_response)
    assert result == {"data": "z drugiego json"}
    assert mock_response.json.call_count == 2


@pytest.mark.asyncio
async def test_resolve_user_data_all_fail(mocker):
    mock_response = mocker.Mock()
    mock_response.json = mocker.Mock(side_effect=AttributeError)
    with pytest.raises(TypeError):
        await resolve_user_data(mock_response)
