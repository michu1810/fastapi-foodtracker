import asyncio
from datetime import date, datetime, timedelta, timezone

from celery import shared_task
from foodtracker_app.db.database import async_session_maker
from foodtracker_app.models.product import Product
from foodtracker_app.models.user import User
from foodtracker_app.utils.email_utils import send_email_async
from foodtracker_app.utils.template_utils import render_template
from sqlalchemy import and_
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from .utils import send_email_reminder


@shared_task
def notify_expiring_products():
    """
    Główne zadanie Celery, uruchamiane asynchronicznie.
    """
    asyncio.run(_notify_expiring_products())


async def _notify_expiring_products():
    """
    Logika biznesowa do sprawdzania produktów i wysyłania powiadomień.
    """
    print(
        f"[{datetime.now(timezone.utc).isoformat()}] Rozpoczynam sprawdzanie wygasających produktów..."
    )

    async with async_session_maker() as db:
        try:
            today_utc_date = datetime.now(timezone.utc).date()
            expiration_threshold_date = today_utc_date + timedelta(days=7)

            result = await db.execute(
                select(User)
                .options(selectinload(User.products))
                .filter(
                    User.products.any(
                        and_(
                            Product.current_amount > 0,
                            Product.expiration_date <= expiration_threshold_date,
                        )
                    )
                )
            )
            users = result.scalars().unique().all()

            if not users:
                print("Brak użytkowników z produktami do powiadomienia. Kończę.")
                return

            for user in users:
                expiring_products_for_user = [
                    p
                    for p in user.products
                    if p.current_amount > 0
                    and p.expiration_date <= expiration_threshold_date
                ]

                if expiring_products_for_user:
                    print(
                        f"Znaleziono {len(expiring_products_for_user)} wpisów do powiadomienia dla użytkownika: {user.email}"
                    )

                    products_data_for_template = []
                    for product in expiring_products_for_user:
                        is_expired_flag = product.expiration_date <= today_utc_date
                        products_data_for_template.append(
                            {
                                "name": product.name,
                                "expiration_date": product.expiration_date.strftime(
                                    "%Y-%m-%d"
                                ),
                                "is_expired": is_expired_flag,
                                "quantity": product.current_amount,
                                "unit": product.unit,
                            }
                        )

                    body = "Twoje produkty wkrótce wygasną lub już wygasły. Sprawdź HTML maila."
                    current_utc_datetime = datetime.now(timezone.utc)
                    html = await render_template(
                        "email_expiration_notification.html",
                        email=user.email,
                        products=products_data_for_template,
                        now=current_utc_datetime,
                    )

                    await send_email_async(
                        to_email=user.email,
                        subject="🔔 Przypomnienie: Produkty w FoodTrackerze czekają!",
                        body=body,
                        html=html,
                    )
                    print(
                        f"Wysłano maila z przypomnieniem do {user.email} o {len(products_data_for_template)} produktach."
                    )
                else:
                    print(
                        f"Użytkownik {user.email} nie ma produktów do powiadomienia po filtrowaniu."
                    )

        except Exception as e:
            import traceback

            print(
                f"Wystąpił błąd podczas wykonywania zadania notify_expiring_products: {e}"
            )
            traceback.print_exc()

    print(
        f"[{datetime.now(timezone.utc).isoformat()}] Zakończono sprawdzanie wygasających produktów."
    )


async def sync_check_and_notify():
    async with async_session_maker() as session:
        today = date.today()
        soon = today + timedelta(days=3)

        result = await session.execute(
            select(Product, User).join(User).where(Product.expiration_date <= soon)
        )
        rows = await result.all()

        users = {}
        for product, user in rows:
            if product.expiration_date < today:
                continue

            if product.current_amount > 0:
                users.setdefault(user.email, []).append(product)

        for email, products in users.items():
            await send_email_reminder(email, products)
