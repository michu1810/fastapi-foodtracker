import asyncio
import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict

from celery import shared_task
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from foodtracker_app.db.database import async_session_maker
from foodtracker_app.models import PantryUser, User, Pantry
from foodtracker_app.utils.email_utils import send_email_async
from foodtracker_app.utils.template_utils import render_template
from foodtracker_app.settings import settings

logger = logging.getLogger(__name__)

EXPIRATION_NOTIFICATION_DAYS = getattr(settings, "EXPIRATION_NOTIFICATION_DAYS", 7)


async def _run_notification_logic_async():
    """
    Prywatna funkcja asynchroniczna zawierająca całą logikę.
    """
    start_time = datetime.now(timezone.utc)
    logger.info(
        f"Uruchamiam wewnętrzną logikę asynchroniczną o {start_time.isoformat()}"
    )

    async with async_session_maker() as db:
        try:
            today_utc_date = start_time.date()
            expiration_threshold_date = today_utc_date + timedelta(
                days=EXPIRATION_NOTIFICATION_DAYS
            )

            stmt = (
                select(User)
                .options(
                    selectinload(User.pantry_associations)
                    .selectinload(PantryUser.pantry)
                    .selectinload(Pantry.products)
                )
                .where(
                    User.is_verified,
                    User.send_expiration_notifications,
                )
            )

            result = await db.execute(stmt)
            users_with_pantries = result.scalars().unique().all()

            notifications = defaultdict(list)

            for user in users_with_pantries:
                for pantry_user_assoc in user.pantry_associations:
                    pantry = pantry_user_assoc.pantry
                    for product in pantry.products:
                        if (
                            product.current_amount > 0
                            and product.expiration_date
                            and today_utc_date
                            <= product.expiration_date
                            <= expiration_threshold_date
                        ):
                            notifications[user].append(product)

            if not notifications:
                logger.info("Brak produktów do powiadomienia. Kończę zadanie.")
                return {"status": "success", "message": "No products to notify."}

            for user, products_to_notify in notifications.items():
                logger.info(
                    f"Przygotowuję powiadomienie dla {user.email} o {len(products_to_notify)} produktach."
                )
                products_data_for_template = [
                    {
                        "name": p.name,
                        "pantry_name": p.pantry.name,
                        "expiration_date": p.expiration_date.strftime("%Y-%m-%d"),
                        "is_expired": p.expiration_date < today_utc_date,
                        "quantity": p.current_amount,
                        "unit": p.unit,
                    }
                    for p in sorted(products_to_notify, key=lambda p: p.expiration_date)
                ]
                html_body = await render_template(
                    "email_expiration_notification.html",
                    email=user.email,
                    products=products_data_for_template,
                    now=datetime.now(timezone.utc),
                )
                try:
                    await send_email_async(
                        to_email=user.email,
                        subject="🔔 Food Tracker: Twoje produkty wkrótce stracą ważność!",
                        body="Twoje produkty wkrótce stracą ważność...",
                        html=html_body,
                    )
                    logger.info(f"Pomyślnie wysłano powiadomienie do {user.email}.")
                except Exception as email_exc:
                    logger.error(
                        f"Nie udało się wysłać emaila do {user.email}: {email_exc}",
                        exc_info=True,
                    )

            return {"status": "success", "users_notified": len(notifications)}

        except Exception as e:
            logger.error(
                f"Wystąpił krytyczny błąd podczas zadania notify_expiring_products: {e}",
                exc_info=True,
            )
            return {"status": "error", "error_message": str(e)}


@shared_task(name="notifications.notify_expiring_products")
def notify_expiring_products_task():
    """
    Synchroniczne zadanie Celery, które uruchamia logikę asynchroniczną.
    """
    logger.info(
        "Otrzymano zadanie Celery: notify_expiring_products_task. Uruchamiam asyncio.run()."
    )
    try:
        result = asyncio.run(_run_notification_logic_async())
        logger.info(f"Logika asynchroniczna zakończona z wynikiem: {result}")
        return result
    except Exception as e:
        logger.error(
            f"Błąd na poziomie synchronicznego wrappera Celery: {e}", exc_info=True
        )
        return {"status": "critical_error", "error_message": str(e)}
