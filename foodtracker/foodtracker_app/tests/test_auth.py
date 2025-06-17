from datetime import timedelta

from foodtracker_app.auth.utils import create_access_token


async def test_access_with_expired_token(client):
    """Sprawdzam, czy API poprawnie odrzuca żądanie z wygasłym tokenem."""

    expired_token = create_access_token(
        data={"sub": "test@example.com", "provider": "password"},
        expires_delta=timedelta(minutes=-1),
    )
    headers = {"Authorization": f"Bearer {expired_token}"}

    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    assert "expired" in response.json()["detail"]
