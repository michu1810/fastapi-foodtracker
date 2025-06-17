import httpx
from fastapi import APIRouter, HTTPException, Query

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
