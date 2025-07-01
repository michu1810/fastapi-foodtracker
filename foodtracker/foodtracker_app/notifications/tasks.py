import asyncio
import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from contextlib import asynccontextmanager

from celery import shared_task
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from foodtracker_app.db.database import async_session_maker
from foodtracker_app.models import Product, Pantry, PantryUser, User
from foodtracker_app.utils.email_utils import send_email_async
from foodtracker_app.utils.template_utils import render_template
from foodtracker_app.settings import settings

logger = logging.getLogger(__name__)

EXPIRATION_NOTIFICATION_DAYS = getattr(settings, "EXPIRATION_NOTIFICATION_DAYS", 7)


@shared_task
def notify_expiring_products():
    """
    Główne zadanie Celery, uruchamiane asynchronicznie.
    Pobiera produkty bliskie daty ważności i wysyła powiadomienia do użytkowników.
    """
    asyncio.run(_notify_expiring_products())


async def _notify_expiring_products(db_session: AsyncSession = None):
    """
    Asynchroniczna logika biznesowa zadania.
    """
    start_time = datetime.now(timezone.utc)
    logger.info(
        f"Rozpoczynam zadanie notify_expiring_products o {start_time.isoformat()}"
    )

    @asynccontextmanager
    async def get_session():
        if db_session:
            yield db_session
        else:
            session = async_session_maker()
            try:
                yield session
            finally:
                await session.close()

    async with get_session() as db:
        try:
            today_utc_date = start_time.date()
            expiration_threshold_date = today_utc_date + timedelta(
                days=EXPIRATION_NOTIFICATION_DAYS
            )

            stmt = (
                select(Product)
                .join(Product.pantry)
                .join(Pantry.member_associations)
                .join(PantryUser.user)
                .options(
                    selectinload(Product.pantry)
                    .selectinload(Pantry.member_associations)
                    .selectinload(PantryUser.user)
                )
                .where(
                    Product.current_amount > 0,
                    Product.expiration_date <= expiration_threshold_date,
                    User.is_verified,
                    User.send_expiration_notifications,
                )
            )
            result = await db.execute(stmt)
            expiring_products = result.scalars().unique().all()

            if not expiring_products:
                logger.info("Brak produktów do powiadomienia. Kończę zadanie.")
                return

            logger.info(
                f"Znaleziono {len(expiring_products)} produktów do powiadomienia."
            )

            notifications = defaultdict(list)
            for product in expiring_products:
                for association in product.pantry.member_associations:
                    user_to_notify = association.user
                    if user_to_notify.send_expiration_notifications:
                        notifications[user_to_notify].append(product)

            for user, products_to_notify in notifications.items():
                logger.info(
                    f"Przygotowuję powiadomienie dla {user.email} o {len(products_to_notify)} produktach."
                )

                products_data_for_template = [
                    {
                        "name": product.name,
                        "pantry_name": product.pantry.name,
                        "expiration_date": product.expiration_date.strftime("%Y-%m-%d"),
                        "is_expired": product.expiration_date < today_utc_date,
                        "quantity": product.current_amount,
                        "unit": product.unit,
                    }
                    for product in sorted(
                        products_to_notify, key=lambda p: p.expiration_date
                    )
                ]

                # ✅ POPRAWKA: Dodajemy `now` do kontekstu szablonu
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
                        html=html_body,
                    )
                    logger.info(f"Pomyślnie wysłano powiadomienie do {user.email}.")
                except Exception as email_exc:
                    logger.error(
                        f"Nie udało się wysłać emaila do {user.email}: {email_exc}",
                        exc_info=True,
                    )

        except Exception as e:
            logger.error(
                f"Wystąpił krytyczny błąd podczas zadania notify_expiring_products: {e}",
                exc_info=True,
            )

    end_time = datetime.now(timezone.utc)
    logger.info(
        f"Zakończono zadanie notify_expiring_products o {end_time.isoformat()}. Czas trwania: {end_time - start_time}"
    )
