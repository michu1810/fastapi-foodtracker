import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone

from foodtracker_app.notifications.tasks import _notify_expiring_products


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.async_session_maker")
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
@patch("foodtracker_app.notifications.tasks.render_template", new_callable=AsyncMock)
async def test_notify_expiring_products_success(
    mock_render, mock_send, mock_session_maker
):
    class DummyProduct:
        def __init__(self):
            self.name = "Mleko"
            self.expiration_date = datetime.now(timezone.utc).date() + timedelta(days=2)
            self.current_amount = 1
            self.unit = "l"

    class DummyUser:
        def __init__(self):
            self.email = "test@example.com"
            self.products = [DummyProduct()]

    mock_session = AsyncMock()
    mock_session.__aenter__.return_value = mock_session

    mock_execute_result = MagicMock()
    mock_scalars = MagicMock()
    mock_unique = MagicMock()

    mock_unique.all.return_value = [DummyUser()]
    mock_scalars.unique.return_value = mock_unique
    mock_execute_result.scalars.return_value = mock_scalars
    mock_session.execute.return_value = mock_execute_result

    mock_session_maker.return_value = mock_session
    mock_render.return_value = "<html>mock</html>"

    await _notify_expiring_products()

    mock_send.assert_awaited_once()
