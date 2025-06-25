from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from foodtracker_app.auth.utils import create_access_token, create_refresh_token
from foodtracker_app.db.database import get_async_session
from foodtracker_app.models.user import User
from foodtracker_app.settings import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from starlette.responses import RedirectResponse
import urllib.parse

router = APIRouter()

oauth = OAuth()

# Google
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# GitHub
oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "user:email"},
)


async def get_or_create_user(db: AsyncSession, email: str, provider: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        if user.social_provider == "password":
            if not user.is_verified:
                user.is_verified = True
                await db.commit()
                await db.refresh(user)
            return user

        if user.social_provider not in [provider, None, ""]:
            raise HTTPException(
                status_code=400,
                detail=f"Ten adres e-mail jest już zarejestrowany poprzez {user.social_provider.capitalize()}. Zaloguj się, używając tej samej metody.",
            )

        if not user.social_provider:
            user.social_provider = provider
            user.is_verified = True
            await db.commit()
            await db.refresh(user)

    else:
        user = User(
            email=email,
            hashed_password="social",
            social_provider=provider,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def resolve_user_data(response) -> dict:
    try:
        return await response.json()
    except Exception:
        try:
            return response.json()
        except Exception:
            pass
    if isinstance(response, dict):
        return response
    raise TypeError(f"Nieobsługiwany typ odpowiedzi: {type(response)}")


@router.get("/google/login")
async def google_login(request: Request):
    path = router.url_path_for("google_callback")
    redirect_url = f"{settings.BACKEND_URL}{path}"
    return await oauth.google.authorize_redirect(request, redirect_url)


@router.get("/google/callback")
async def google_callback(
    request: Request, db: AsyncSession = Depends(get_async_session)
):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = await oauth.google.userinfo(token=token)
        email = user_info.get("email")

        if not email:
            raise HTTPException(
                status_code=400,
                detail="Nie odnaleziono adresu e-mail w odpowiedzi od Google.",
            )

        try:
            user = await get_or_create_user(db, email, provider="google")
        except HTTPException as e:
            if e.status_code == 400 and "połączone z dostawcą" in e.detail:
                provider_name = e.detail.split(": ")[-1]
                error_detail = f"Ten e-mail jest już zarejestrowany przez {provider_name.capitalize()}. Użyj tej samej metody logowania."
                encoded_error = urllib.parse.quote(error_detail)
                return RedirectResponse(
                    url=f"{settings.FRONTEND_URL}/login?error={encoded_error}"
                )
            raise

        access_token = create_access_token(
            {"sub": user.email, "provider": user.social_provider}
        )
        refresh_token = create_refresh_token(
            {"sub": user.email, "provider": user.social_provider}
        )

        response = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/google/callback?token={access_token}"
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.IS_PRODUCTION,
            samesite="strict",
            path="/auth",
        )
        return response

    except Exception as e:
        encoded_error = urllib.parse.quote(
            "Wystąpił nieoczekiwany błąd podczas logowania przez Google."
        )
        print(f"Google Callback Error: {e}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={encoded_error}"
        )


@router.get("/github/login")
async def github_login(request: Request):
    path = router.url_path_for("github_callback")
    redirect_url = f"{settings.BACKEND_URL}{path}"
    return await oauth.github.authorize_redirect(request, redirect_url)


@router.get("/github/callback")
async def github_callback(
    request: Request, db: AsyncSession = Depends(get_async_session)
):
    try:
        token_response = await oauth.github.authorize_access_token(request)
        user_resp = await oauth.github.get("user", token=token_response)
        user_data = await resolve_user_data(user_resp)
        email = user_data.get("email")

        if not email:
            emails_resp = await oauth.github.get("user/emails", token=token_response)
            emails_data = await resolve_user_data(emails_resp)
            email = next(
                (
                    e["email"]
                    for e in emails_data
                    if e.get("primary") and e.get("verified")
                ),
                None,
            )

        if not email:
            raise HTTPException(
                status_code=400,
                detail="Nie odnaleziono adresu e-mail w odpowiedzi od GitHub.",
            )

        try:
            user = await get_or_create_user(db, email, provider="github")
        except HTTPException as e:
            if e.status_code == 400 and "połączone z dostawcą" in e.detail:
                provider_name = e.detail.split(": ")[-1]
                error_detail = f"Ten e-mail jest już zarejestrowany przez {provider_name.capitalize()}. Użyj tej samej metody logowania."
                encoded_error = urllib.parse.quote(error_detail)
                return RedirectResponse(
                    url=f"{settings.FRONTEND_URL}/login?error={encoded_error}"
                )
            raise

        access_token = create_access_token(
            {"sub": user.email, "provider": user.social_provider}
        )
        refresh_token = create_refresh_token(
            {"sub": user.email, "provider": user.social_provider}
        )

        response = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/github/callback?token={access_token}"
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.IS_PRODUCTION,
            samesite="strict",
            path="/auth",
        )
        return response

    except Exception as e:
        encoded_error = urllib.parse.quote(
            "Wystąpił nieoczekiwany błąd podczas logowania przez GitHub."
        )
        print(f"GitHub Callback Error: {e}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={encoded_error}"
        )
