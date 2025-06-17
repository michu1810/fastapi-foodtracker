import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager
import redis

from foodtracker_app.notifications import tasks
from foodtracker_app.notifications.utils import send_email_reminder
import foodtracker_app.notifications.celery_worker as worker


class _DummyResult:
    """Imituje SQLAlchemy ScalarResult (scalars → unique → all)."""

    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        # Brak użytkowników - brak maili
        return []


class _DummySession:
    async def execute(self, *_args, **_kwargs):
        return _DummyResult()


@asynccontextmanager
async def _dummy_session_cm():
    """Asynchroniczny context-manager zwracający _DummySession."""
    yield _DummySession()


@pytest.mark.asyncio
async def test_notify_expiring_products_sends_mail(mocker):
    """
    Jeśli w bazie nie ma użytkowników z produktami,
    funkcja NIE powinna wysyłać e-maili.
    """
    # Patchujemy fabrykę sesji na nasz context-manager
    mocker.patch(
        "foodtracker_app.notifications.tasks.async_session_maker",
        new=_dummy_session_cm,
    )

    # Patchujemy render_template i send_email_async
    mocker.patch(
        "foodtracker_app.notifications.tasks.render_template",
        new=AsyncMock(return_value="<html>dummy</html>"),
    )
    send_mail = mocker.patch(
        "foodtracker_app.notifications.tasks.send_email_async",
        new=AsyncMock(),
    )

    await tasks._notify_expiring_products()

    # Assert – nic nie powinno zostać wysłane
    send_mail.assert_not_awaited()


@pytest.mark.asyncio
async def test_send_email_reminder_sends_email(mocker):
    mock_send = mocker.patch(
        "foodtracker_app.notifications.utils.send_email_async", new=AsyncMock()
    )
    mock_render = mocker.patch(
        "foodtracker_app.notifications.utils.render_template",
        new=AsyncMock(return_value="<html>dummy</html>"),
    )

    class DummyProduct:
        name = "Masło"
        expiration_date = "2025-06-20"

    await send_email_reminder("test@example.com", [DummyProduct()])

    mock_send.assert_awaited_once()
    mock_render.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_email_reminder_no_products_does_nothing(mocker):
    mock_send = mocker.patch(
        "foodtracker_app.notifications.utils.send_email_async", new=AsyncMock()
    )
    mock_render = mocker.patch(
        "foodtracker_app.notifications.utils.render_template", new=AsyncMock()
    )

    await send_email_reminder("test@example.com", [])

    mock_send.assert_not_awaited()
    mock_render.assert_not_awaited()


@pytest.mark.asyncio
async def test_run_expiration_check_route(authenticated_client):
    with patch(
        "foodtracker_app.notifications.routes.notify_expiring_products.delay"
    ) as mock_delay:
        response = await authenticated_client.post("/notifications/run-check")
        assert response.status_code == 202
        assert response.json() == {"message": "Expiration check task triggered."}
        mock_delay.assert_called_once()


@pytest.mark.asyncio
async def test_send_test_email_route(mocker, authenticated_client):
    mock_send = mocker.patch(
        "foodtracker_app.notifications.routes.send_email_async", new=AsyncMock()
    )
    mock_render = mocker.patch(
        "foodtracker_app.notifications.routes.render_template",
        new=AsyncMock(return_value="<html>dummy</html>"),
    )

    response = await authenticated_client.post("/notifications/send-test")
    assert response.status_code == 200
    assert "Wysłano HTML maila" in response.json()["msg"]
    mock_send.assert_awaited_once()
    mock_render.assert_awaited_once()


# --- Testy do celery_worker.py ---


def test_wait_for_redis_success(monkeypatch):
    mock_redis = MagicMock()
    mock_redis.ping.return_value = True

    monkeypatch.setattr(redis, "StrictRedis", lambda *args, **kwargs: mock_redis)

    # Nie powinien rzucić błędu
    worker.wait_for_redis()


def test_wait_for_redis_skip(monkeypatch):
    monkeypatch.setattr(worker.settings, "SKIP_REDIS", True)
    worker.wait_for_redis()


def test_wait_for_redis_failure(monkeypatch):
    monkeypatch.setattr(
        "foodtracker_app.notifications.celery_worker.settings.SKIP_REDIS", False
    )

    class FailingRedis:
        def ping(self):
            raise redis.exceptions.ConnectionError

    monkeypatch.setattr(redis, "StrictRedis", lambda *args, **kwargs: FailingRedis())

    with pytest.raises(RuntimeError, match="Redis not available after retries"):
        worker.wait_for_redis()
