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


@pytest.mark.asyncio
@patch(
    "foodtracker_app.notifications.tasks.send_email_reminder", new_callable=AsyncMock
)
@patch("foodtracker_app.notifications.tasks.async_session_maker")
async def test_sync_check_and_notify(mock_session_maker, mock_send_reminder):
    from foodtracker_app.notifications.tasks import sync_check_and_notify
    from datetime import date, timedelta

    today = date.today()
    soon = today + timedelta(days=2)

    class DummyProduct:
        def __init__(self, name, expiration_date, current_amount):
            self.name = name
            self.expiration_date = expiration_date
            self.current_amount = current_amount
            self.unit = "szt"

    class DummyUser:
        def __init__(self, email):
            self.email = email

    dummy_user = DummyUser("test@example.com")
    dummy_product = DummyProduct("Jajka", soon, 2)
    expired_product = DummyProduct("Stare mleko", today - timedelta(days=1), 1)
    zero_amount_product = DummyProduct("Puste masło", soon, 0)

    # W bazie mamy kilka produktów przypisanych do użytkownika
    rows = [
        (dummy_product, dummy_user),
        (expired_product, dummy_user),
        (zero_amount_product, dummy_user),
    ]

    # Mock sesji DB
    mock_session = AsyncMock()
    mock_session.__aenter__.return_value = mock_session
    mock_execute_result = AsyncMock()
    mock_execute_result.all = AsyncMock(return_value=rows)
    mock_session.execute.return_value = mock_execute_result
    mock_session_maker.return_value = mock_session

    await sync_check_and_notify()

    # Tylko jeden produkt powinien przejść filtr
    mock_send_reminder.assert_awaited_once()
    args, _ = mock_send_reminder.await_args
    assert args[0] == "test@example.com"
    assert len(args[1]) == 1
    assert args[1][0].name == "Jajka"
