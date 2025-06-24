import asyncio
from datetime import date
from typing import Any, Dict, List

from sqlalchemy import Date, case, cast, func, or_, select, and_, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from foodtracker_app.auth.schemas import Achievement
from foodtracker_app.models.financial_stats import FinancialStat
from foodtracker_app.models.product import Product
from foodtracker_app.models.user import User

ACHIEVEMENT_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "id": "saved_1",
        "name": "Pierwszy Krok",
        "description": "Uratuj 1 produkt.",
        "icon": "🥇",
        "type": "saved_products",
        "total_progress": 1,
    },
    {
        "id": "saved_10",
        "name": "Strażnik Żywności",
        "description": "Uratuj 10 produktów.",
        "icon": "🥉",
        "type": "saved_products",
        "total_progress": 10,
    },
    {
        "id": "saved_50",
        "name": "Superbohater",
        "description": "Uratuj 50 produktów.",
        "icon": "🌟",
        "type": "saved_products",
        "total_progress": 50,
    },
    {
        "id": "saved_100",
        "name": "Legenda",
        "description": "Uratuj 100 produktów.",
        "icon": "👑",
        "type": "saved_products",
        "total_progress": 100,
    },
    {
        "id": "saved_250",
        "name": "Arcymistrz Oszczędzania",
        "description": "Uratuj 250 produktów.",
        "icon": "🏆",
        "type": "saved_products",
        "total_progress": 250,
    },
    {
        "id": "efficiency_90",
        "name": "Pogromca Marnotrawstwa",
        "description": "Osiągnij 90% wskaźnika efektywności.",
        "icon": "🎯",
        "type": "efficiency_rate",
        "total_progress": 90,
    },
    {
        "id": "pioneer_1",
        "name": "Pionier",
        "description": "Dodaj swój pierwszy produkt.",
        "icon": "🚀",
        "type": "total_products",
        "total_progress": 1,
    },
    {
        "id": "collector_25",
        "name": "Kolekcjoner",
        "description": "Dodaj do aplikacji 25 produktów.",
        "icon": "📚",
        "type": "total_products",
        "total_progress": 25,
    },
    {
        "id": "collector_100",
        "name": "Władca Spiżarni",
        "description": "Dodaj do aplikacji 100 produktów.",
        "icon": "🏰",
        "type": "total_products",
        "total_progress": 100,
    },
    {
        "id": "work_titan_10",
        "name": "Tytan Pracy",
        "description": "Dodaj 10 różnych produktów w ciągu jednego dnia.",
        "icon": "💪",
        "type": "day_add_streak",
        "total_progress": 10,
    },
    {
        "id": "full_house_20",
        "name": "Pełna Chata",
        "description": "Miej jednocześnie 20 różnych aktywnych produktów.",
        "icon": "🏠",
        "type": "active_products_count",
        "total_progress": 20,
    },
    {
        "id": "money_saver_10",
        "name": "Oszczędny Start",
        "description": "Zaoszczędź 10 zł.",
        "icon": "💰",
        "type": "money_saved",
        "total_progress": 10.0,
    },
    {
        "id": "money_saver_100",
        "name": "Mistrz Budżetu",
        "description": "Zaoszczędź 100 zł.",
        "icon": "💸",
        "type": "money_saved",
        "total_progress": 100.0,
    },
    {
        "id": "money_saver_500",
        "name": "Finansowy Czarodziej",
        "description": "Zaoszczędź 500 zł.",
        "icon": "🎩",
        "type": "money_saved",
        "total_progress": 500.0,
    },
    {
        "id": "money_saver_1000",
        "name": "Finansowy Magnat",
        "description": "Zaoszczędź 1000 zł.",
        "icon": "💎",
        "type": "money_saved",
        "total_progress": 1000.0,
    },
    {
        "id": "investor_250",
        "name": "Koneser Zakupów",
        "description": "Kup produkty o łącznej wartości 250 zł.",
        "icon": "📈",
        "type": "total_spent_value",
        "total_progress": 250.0,
    },
    {
        "id": "veteran_30",
        "name": "Weteran",
        "description": "Korzystaj z aplikacji przez 30 dni.",
        "icon": "🗓️",
        "type": "days_as_user",
        "total_progress": 30,
    },
    {
        "id": "veteran_90",
        "name": "Stary Wyjadacz",
        "description": "Korzystaj z aplikacji przez 90 dni.",
        "icon": "📜",
        "type": "days_as_user",
        "total_progress": 90,
    },
    {
        "id": "sunday_planner_5",
        "name": "Niedzielny Planista",
        "description": "Dodaj co najmniej 5 produktów w niedzielę.",
        "icon": "📅",
        "type": "sunday_adds",
        "total_progress": 5,
    },
    {
        "id": "weekend_chef_5",
        "name": "Weekendowy Szef Kuchni",
        "description": "Dodaj 5 produktów w trakcie jednego weekendu.",
        "icon": "🍳",
        "type": "weekend_adds",
        "total_progress": 5,
    },
    {
        "id": "night_owl",
        "name": "Nocny Marek",
        "description": "Dodaj produkt między północą a 4 rano.",
        "icon": "🦉",
        "type": "night_actions",
        "total_progress": 1,
    },
    {
        "id": "cheese_connoisseur",
        "name": "Koneser Serów",
        "description": "Dodaj 5 różnych produktów z 'Ser' w nazwie.",
        "icon": "🧀",
        "type": "cheese_products",
        "total_progress": 5,
    },
    {
        "id": "healthy_monday",
        "name": "Zdrowy Start Tygodnia",
        "description": "Dodaj zdrowy produkt w poniedziałek.",
        "icon": "🥗",
        "type": "healthy_monday_add",
        "total_progress": 1,
    },
    {
        "id": "morning_caffeine",
        "name": "Kofeina o Poranku",
        "description": "Dodaj kawę lub herbatę przed 9:00 rano.",
        "icon": "☕",
        "type": "morning_caffeine_add",
        "total_progress": 1,
    },
]


async def _get_progress_data(db: AsyncSession, user: User) -> Dict[str, Any]:
    """Prywatna funkcja pomocnicza do pobierania wszystkich danych potrzebnych do obliczenia postępu."""
    today = date.today()
    dialect = db.bind.dialect.name
    if dialect == "postgresql":
        day_of_week = func.extract("isodow", Product.created_at)  # Monday=1, Sunday=7
    else:
        day_of_week = case(
            (func.strftime("%w", Product.created_at) == "0", 7),
            else_=cast(func.strftime("%w", Product.created_at), Integer),
        )

    healthy_keywords = [
        "%sałata%",
        "%owoc%",
        "%warzywo%",
        "%pomidor%",
        "%ogórek%",
        "%brokuł%",
        "%marchew%",
        "%jabłko%",
        "%banan%",
        "%szpinak%",
        "%kurczak%",
        "%ryba%",
        "%jogurt%",
    ]
    queries = {
        "product_stats": select(
            func.sum(
                case((Product.unit == "szt.", Product.initial_amount), else_=1)
            ).label("total"),
            func.sum(
                case(
                    (
                        Product.unit == "szt.",
                        Product.initial_amount
                        - Product.current_amount
                        - Product.wasted_amount,
                    ),
                    else_=case(
                        (
                            and_(
                                Product.current_amount == 0,
                                2 * Product.wasted_amount <= Product.initial_amount,
                            ),
                            1,
                        ),
                        else_=0,
                    ),
                )
            ).label("used"),
            func.sum(
                case(
                    (Product.unit == "szt.", Product.wasted_amount),
                    else_=case(
                        (
                            and_(
                                Product.current_amount == 0,
                                2 * Product.wasted_amount > Product.initial_amount,
                            ),
                            1,
                        ),
                        else_=0,
                    ),
                )
            ).label("wasted"),
        ).where(Product.user_id == user.id),
        "financial_stats": select(FinancialStat).where(
            FinancialStat.user_id == user.id
        ),
        "cheese_products": select(func.count(Product.id)).where(
            Product.user_id == user.id, Product.name.ilike("%ser%")
        ),
        "night_actions": select(func.count(Product.id)).where(
            Product.user_id == user.id,
            func.extract("hour", Product.created_at).between(0, 4),
        ),
        "active_products_count": select(func.count(Product.id)).where(
            Product.user_id == user.id, Product.current_amount > 0
        ),
        "day_add_streak": select(func.count(Product.id)).where(
            Product.user_id == user.id, cast(Product.created_at, Date) == today
        ),
        "sunday_adds": select(func.count(Product.id)).where(
            Product.user_id == user.id, day_of_week == 7
        ),
        "weekend_adds": select(func.count(Product.id)).where(
            Product.user_id == user.id, day_of_week.in_([6, 7])
        ),
        "morning_caffeine_add": select(func.count(Product.id)).where(
            Product.user_id == user.id,
            func.extract("hour", Product.created_at) < 9,
            or_(Product.name.ilike("%kawa%"), Product.name.ilike("%herbata%")),
        ),
        "healthy_monday_add": select(func.count(Product.id)).where(
            Product.user_id == user.id,
            day_of_week == 1,
            or_(*[Product.name.ilike(keyword) for keyword in healthy_keywords]),
        ),
        "total_spent_value": select(
            func.sum(Product.price * Product.initial_amount)
        ).where(Product.user_id == user.id),
    }

    results = await asyncio.gather(*(db.execute(q) for q in queries.values()))
    res_map = dict(zip(queries.keys(), results))

    p_stats = res_map["product_stats"].one_or_none()
    f_stats = res_map["financial_stats"].scalar_one_or_none()

    p_stats_dict = (
        {
            "used": p_stats.used or 0,
            "total": p_stats.total or 0,
            "wasted": p_stats.wasted or 0,
        }
        if p_stats
        else {"used": 0, "total": 0, "wasted": 0}
    )

    progress_data = {
        "saved_products": int(p_stats_dict["used"]),
        "total_products": int(p_stats_dict["total"]),
        "wasted_products": int(p_stats_dict["wasted"]),
        "money_saved": float(f_stats.saved_value) if f_stats else 0.0,
        "cheese_products": res_map["cheese_products"].scalar_one() or 0,
        "night_actions": res_map["night_actions"].scalar_one() or 0,
        "active_products_count": res_map["active_products_count"].scalar_one() or 0,
        "day_add_streak": res_map["day_add_streak"].scalar_one() or 0,
        "sunday_adds": res_map["sunday_adds"].scalar_one() or 0,
        "weekend_adds": res_map["weekend_adds"].scalar_one() or 0,
        "healthy_monday_add": res_map["healthy_monday_add"].scalar_one() or 0,
        "morning_caffeine_add": res_map["morning_caffeine_add"].scalar_one() or 0,
        "total_spent_value": float(
            res_map["total_spent_value"].scalar_one_or_none() or 0.0
        ),
        "days_as_user": (today - user.created_at.date()).days if user.created_at else 0,
    }

    total_consumed = progress_data["saved_products"] + progress_data["wasted_products"]
    progress_data["efficiency_rate"] = (
        int((progress_data["saved_products"] / total_consumed) * 100)
        if total_consumed > 0
        else 0
    )
    return progress_data


async def get_user_achievements(db: AsyncSession, user: User) -> List[Achievement]:
    """Główna, publiczna funkcja. Pobiera dane i buduje listę osiągnięć."""

    progress_data = await _get_progress_data(db, user)

    user_achievements: List[Achievement] = []
    for definition in ACHIEVEMENT_DEFINITIONS:
        progress_type = definition["type"]
        current_progress = progress_data.get(progress_type, 0)

        total_progress = definition["total_progress"]
        if isinstance(total_progress, float):
            current_progress = float(current_progress)
        else:
            current_progress = int(current_progress)

        is_achieved = current_progress >= total_progress

        user_achievements.append(
            Achievement(
                id=definition["id"],
                name=definition["name"],
                description=definition["description"],
                icon=definition["icon"],
                type=progress_type,
                achieved=is_achieved,
                current_progress=current_progress,
                total_progress=total_progress,
            )
        )

    return user_achievements
