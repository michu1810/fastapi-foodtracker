import pytest
from unittest.mock import patch, AsyncMock
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from foodtracker_app.notifications.tasks import _run_notification_logic_async
from foodtracker_app.models import User, Pantry, PantryUser, Product

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def pantry_with_users(db: AsyncSession):
    user_ok = User(
        email="notify_me@example.com",
        hashed_password="pwd",
        is_verified=True,
        send_expiration_notifications=True,
    )
    user_no_notify = User(
        email="dont_notify_me@example.com",
        hashed_password="pwd",
        is_verified=True,
        send_expiration_notifications=False,
    )
    db.add_all([user_ok, user_no_notify])
    await db.commit()

    pantry = Pantry(name="Test Pantry", owner_id=user_ok.id)
    db.add(pantry)
    await db.commit()

    pantry_id = pantry.id

    link1 = PantryUser(user_id=user_ok.id, pantry_id=pantry.id, role="owner")
    link2 = PantryUser(user_id=user_no_notify.id, pantry_id=pantry.id, role="member")
    db.add_all([link1, link2])
    await db.commit()

    db.expire_all()

    return {
        "db": db,
        "pantry_id": pantry_id,
        "user_ok": user_ok,
    }


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
@patch("foodtracker_app.notifications.tasks.render_template", new_callable=AsyncMock)
async def test_notify_expiring_products_sends_to_correct_user(
    mock_render, mock_send, pantry_with_users
):
    db = pantry_with_users["db"]
    user_ok = pantry_with_users["user_ok"]
    pantry_id = pantry_with_users["pantry_id"]

    expiring_product = Product(
        name="Mleko",
        pantry_id=pantry_id,
        expiration_date=date.today() + timedelta(days=3),
        price=Decimal("3.50"),
        unit="l",
        initial_amount=Decimal("1.0"),
        current_amount=Decimal("1.0"),
    )
    db.add(expiring_product)
    await db.commit()
    db.expire_all()

    await _run_notification_logic_async(db=db)

    mock_send.assert_awaited_once()
    _args, kwargs = mock_send.await_args
    assert kwargs["to_email"] == user_ok.email


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
async def test_notify_no_expiring_products_does_nothing(mock_send, db: AsyncSession):
    await _run_notification_logic_async(db=db)
    mock_send.assert_not_awaited()


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.render_template", new_callable=AsyncMock)
@patch("foodtracker_app.notifications.tasks.logger")
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
async def test_notify_email_send_failure_is_logged(
    mock_send, mock_logger, mock_render, pantry_with_users
):
    db = pantry_with_users["db"]
    mock_render.return_value = "<html>dummy</html>"
    pantry_id = pantry_with_users["pantry_id"]

    product = Product(
        name="Ser",
        pantry_id=pantry_id,
        expiration_date=date.today() + timedelta(days=1),
        price=Decimal("10.0"),
        unit="szt.",  # <-- To jest pole, którego brakowało
        initial_amount=Decimal("1.0"),
        current_amount=Decimal("1.0"),
    )
    db.add(product)
    await db.commit()
    db.expire_all()

    mock_send.side_effect = Exception("SMTP server is down")

    await _run_notification_logic_async(db=db)

    mock_logger.error.assert_called_once()
    log_msg, *_ = mock_logger.error.call_args[0]
    assert "Nie udało się wysłać emaila" in log_msg


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.logger")
async def test_notify_general_failure_is_logged(mock_logger):
    mock_session = AsyncMock()
    mock_session.execute.side_effect = Exception("Critical DB Error")

    await _run_notification_logic_async(db=mock_session)

    mock_logger.error.assert_called_once()
    args, kwargs = mock_logger.error.call_args
    assert "Wystąpił krytyczny błąd podczas zadania" in args[0]
    assert kwargs.get("exc_info") is True
