import pytest
from unittest.mock import AsyncMock
from contextlib import asynccontextmanager

from foodtracker_app.notifications import tasks


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
