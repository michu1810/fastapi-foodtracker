import httpx
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from foodtracker_app.services import product_service
from foodtracker_app.schemas.category import CategoryRead
from foodtracker_app.db.database import get_async_session


router = APIRouter(prefix="/external-products", tags=["External"])


@router.get("/search")
async def search_products_from_external_api(q: str = Query(..., min_length=3)):
    SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"

    params = {
        "search_terms": q,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": 15,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(SEARCH_URL, params=params)
            response.raise_for_status()
            data = response.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"Błąd komunikacji z zewnętrznym API: {exc}"
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Zewnętrzne API zwróciło błąd: {exc.response.status_code}",
            )

    results = []
    if "products" in data and isinstance(data["products"], list):
        for product in data["products"]:
            if (
                product.get("id")
                and product.get("product_name_pl")
                or product.get("product_name")
            ):
                results.append(
                    {
                        "id": product["id"],
                        "name": product.get("product_name_pl")
                        or product.get("product_name"),
                        "description": product.get("brands", "Brak informacji o marce"),
                    }
                )

    return results


@router.get("/barcode/{barcode}")
async def get_product_by_barcode(barcode: str):
    if not barcode.isdigit():
        raise HTTPException(
            status_code=400, detail="Kod kreskowy musi składać się z cyfr"
        )

    PRODUCT_URL = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(PRODUCT_URL)

            if response.status_code == 200:
                data = response.json()
                if (
                    data.get("status") == 0
                    or "product" not in data
                    or not data.get("product")
                ):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Produkt o kodzie {barcode} nie został znaleziony",
                    )

                product = data["product"]
                result = {
                    "id": product.get("code"),
                    "name": product.get("product_name_pl")
                    or product.get("product_name"),
                    "description": product.get("brands", "Brak informacji o marce"),
                    "image_url": product.get("image_front_url"),
                }
                return result

            elif response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produkt o kodzie {barcode} nie został znaleziony w API",
                )

            else:
                response.raise_for_status()

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"Błąd komunikacji z zewnętrznym API: {exc}"
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Zewnętrzne API zwróciło błąd: {exc.response.status_code}",
            )

    raise HTTPException(status_code=500, detail="Wystąpił nieoczekiwany błąd serwera")


@router.get("/resolve-category/{external_id}", response_model=CategoryRead)
async def resolve_category_endpoint(
    external_id: str, db: AsyncSession = Depends(get_async_session)
):
    """
    Na podstawie external_id próbuje znaleźć i zwrócić pasującą kategorię wewnętrzną.
    """
    category = await product_service.resolve_category_from_external_id(db, external_id)
    if not category:
        raise HTTPException(
            status_code=404,
            detail="Nie udało się automatycznie dopasować kategorii dla tego produktu.",
        )
    return category
