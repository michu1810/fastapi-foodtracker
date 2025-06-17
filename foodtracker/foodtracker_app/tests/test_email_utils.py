import pytest
from unittest.mock import AsyncMock
from foodtracker_app.utils import email_utils


@pytest.mark.asyncio
async def test_send_email_async_demo_mode(monkeypatch):
    monkeypatch.setattr(email_utils.settings, "DEMO_MODE", True)
    await email_utils.send_email_async("test@example.com", "Temat", "Treść")
    # Nie powinno być żadnego błędu – tylko print
    assert True


@pytest.mark.asyncio
async def test_send_email_async_real(monkeypatch):
    monkeypatch.setattr(email_utils.settings, "DEMO_MODE", False)

    mock_smtp = AsyncMock()
    monkeypatch.setattr(email_utils, "SMTP", lambda *args, **kwargs: mock_smtp)

    await email_utils.send_email_async(
        "real@example.com", "Temat", "Body testowy", html="<b>HTML</b>"
    )

    mock_smtp.connect.assert_called_once()
    mock_smtp.login.assert_called_once()
    mock_smtp.send_message.assert_called_once()
    mock_smtp.quit.assert_called_once()
