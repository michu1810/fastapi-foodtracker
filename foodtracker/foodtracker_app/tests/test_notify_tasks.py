import pytest
from unittest.mock import patch, AsyncMock
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from foodtracker_app.notifications.tasks import _notify_expiring_products
from foodtracker_app.models import User, Pantry, PantryUser, Product

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def pantry_with_users(db: AsyncSession):
    """
    NIEZAWODNA FIKSTURA: Tworzy w bazie danych użytkowników, spiżarnię i POPRAWNE
    powiązania między nimi, zwracając wszystko w jednym słowniku.
    """
    # Krok 1: Stwórz użytkowników i zapisz ich, aby dostali swoje ID
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
    await db.refresh(user_ok)
    await db.refresh(user_no_notify)

    # Krok 2: Stwórz spiżarnię i zapisz ją, aby dostała swoje ID
    pantry = Pantry(name="Test Pantry", owner_id=user_ok.id)
    db.add(pantry)
    await db.commit()
    await db.refresh(pantry)

    # Krok 3: Stwórz POWIĄZANIA jawnie, używając ID. Koniec z magią.
    link1 = PantryUser(user_id=user_ok.id, pantry_id=pantry.id, role="owner")
    link2 = PantryUser(user_id=user_no_notify.id, pantry_id=pantry.id, role="member")
    db.add_all([link1, link2])
    await db.commit()

    return {
        "db": db,
        "pantry": pantry,
        "user_ok": user_ok,
        "user_no_notify": user_no_notify,
    }


# === TESTY ===


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
@patch("foodtracker_app.notifications.tasks.render_template", new_callable=AsyncMock)
async def test_notify_expiring_products_sends_to_correct_user(
    mock_render, mock_send, pantry_with_users
):
    db = pantry_with_users["db"]
    pantry = pantry_with_users["pantry"]
    user_ok = pantry_with_users["user_ok"]

    # Dodajemy produkt do poprawnie skonfigurowanej spiżarni
    expiring_product = Product(
        name="Mleko",
        pantry_id=pantry.id,
        expiration_date=date.today() + timedelta(days=3),
        price=3.50,
        initial_amount=1,
        current_amount=1,
        unit="l",
    )
    db.add(expiring_product)
    await db.commit()

    # Wywołujemy funkcję, która teraz zadziała na poprawnych danych
    await _notify_expiring_products(db_session=db)

    # Asercje
    mock_send.assert_awaited_once()
    _args, kwargs = mock_send.await_args
    assert kwargs["to_email"] == user_ok.email


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
async def test_notify_no_expiring_products_does_nothing(mock_send, db: AsyncSession):
    # Wywołujemy na pustej bazie
    await _notify_expiring_products(db_session=db)
    mock_send.assert_not_awaited()


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.render_template", new_callable=AsyncMock)
@patch("foodtracker_app.notifications.tasks.logger")
@patch("foodtracker_app.notifications.tasks.send_email_async", new_callable=AsyncMock)
async def test_notify_email_send_failure_is_logged(
    mock_send: AsyncMock,
    mock_logger,
    mock_render: AsyncMock,
    pantry_with_users,
):
    """
    Powinien zalogować błąd, jeśli wysyłka e-maila się nie powiedzie.
    """

    # ⬇⬇⬇  Zapobiegamy wyjątkom z Jinja2
    mock_render.return_value = "<html>dummy</html>"

    db = pantry_with_users["db"]
    pantry = pantry_with_users["pantry"]

    # dodajemy produkt bliski terminu ważności
    product = Product(
        name="Ser",
        pantry_id=pantry.id,
        expiration_date=date.today() + timedelta(days=1),
        price=10,
        initial_amount=1,
        current_amount=1,
        unit="szt.",
    )
    db.add(product)
    await db.commit()

    # symulujemy awarię SMTP
    mock_send.side_effect = Exception("SMTP server is down")

    # wywołanie testowanej funkcji
    await _notify_expiring_products(db_session=db)

    # asercje
    mock_logger.error.assert_called_once()
    log_msg, *_ = mock_logger.error.call_args[0]
    assert "Nie udało się wysłać emaila" in log_msg


@pytest.mark.asyncio
@patch("foodtracker_app.notifications.tasks.logger")
async def test_notify_general_failure_is_logged(mock_logger, db: AsyncSession, mocker):
    # Symulujemy, że metoda `execute` na obiekcie sesji rzuca błędem
    mocker.patch.object(db, "execute", side_effect=Exception("Critical DB Error"))

    # POPRAWKA: Usuwamy `pytest.raises`, bo funkcja sama łapie ten błąd.
    # My tylko sprawdzamy, czy go poprawnie zalogowała.
    await _notify_expiring_products(db_session=db)

    # Sprawdzamy, czy został zalogowany błąd krytyczny
    mock_logger.error.assert_called_once()
    args, kwargs = mock_logger.error.call_args
    assert "Wystąpił krytyczny błąd" in args[0]
    assert kwargs.get("exc_info") is True
