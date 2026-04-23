import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from foodtracker_app.db.database import get_async_session
from foodtracker_app.schemas.category import CategoryRead
from foodtracker_app.services import product_service


router = APIRouter(prefix="/external-products", tags=["External"])
logger = logging.getLogger(__name__)


def build_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=5.0),
        follow_redirects=True,
        headers={
            "User-Agent": "FoodTracker/1.0 (+local-dev)",
            "Accept": "application/json",
        },
    )


def extract_search_documents(payload: object) -> list[dict]:
    if isinstance(payload, list):
        if payload and all(isinstance(item, dict) for item in payload):
            if any(
                any(key in item for key in ("code", "product_name", "product_name_pl", "brands"))
                for item in payload
            ):
                return payload
        documents: list[dict] = []
        for item in payload:
            documents.extend(extract_search_documents(item))
        return documents

    if isinstance(payload, dict):
        for preferred_key in ("hits", "results", "products", "documents", "items"):
            value = payload.get(preferred_key)
            if isinstance(value, list):
                docs = extract_search_documents(value)
                if docs:
                    return docs

        documents: list[dict] = []
        for value in payload.values():
            documents.extend(extract_search_documents(value))
        return documents

    return []


async def fetch_search_results(
    client: httpx.AsyncClient, search_url: str, params: dict
) -> object:
    response = await client.get(search_url, params=params)
    response.raise_for_status()
    return response.json()


@router.get("/search")
async def search_products_from_external_api(
    q: str = Query(..., min_length=3),
    db: AsyncSession = Depends(get_async_session),
):
    search_url = "https://search.openfoodfacts.org/search"
    normalized_query = " ".join(q.split())
    safe_query = normalized_query.replace('"', " ").strip()
    base_params = {
        "fields": "code,product_name,product_name_pl,brands,categories_tags",
        "page_size": 15,
        "langs": "pl,en",
        "boost_phrase": "true",
    }

    async with build_http_client() as client:
        try:
            prioritized_query = f'countries_tags:"en:poland" {safe_query}'.strip()
            prioritized_data = await fetch_search_results(
                client,
                search_url,
                {
                    **base_params,
                    "q": prioritized_query,
                },
            )
            generic_data = await fetch_search_results(
                client,
                search_url,
                {
                    **base_params,
                    "q": safe_query,
                },
            )
        except httpx.RequestError as exc:
            logger.exception("External search request failed for query '%s'", q)
            raise HTTPException(
                status_code=503,
                detail=f"Blad komunikacji z zewnetrznym API: {exc}",
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "External search returned bad status for query '%s': %s, body=%s",
                q,
                exc.response.status_code,
                exc.response.text[:500],
            )
            raise HTTPException(
                status_code=502,
                detail=f"Zewnetrzne API zwrocilo blad: {exc.response.status_code}",
            ) from exc
        except ValueError as exc:
            logger.exception("External search returned invalid JSON for query '%s'", q)
            raise HTTPException(
                status_code=502,
                detail=f"Zewnetrzne API zwrocilo nieprawidlowa odpowiedz: {exc}",
            ) from exc

    if isinstance(prioritized_data, dict) and prioritized_data.get("errors"):
        logger.warning(
            "Search-a-licious returned errors for prioritized query '%s': %s",
            q,
            prioritized_data["errors"],
        )
        raise HTTPException(
            status_code=502,
            detail="Nowy endpoint wyszukiwania zwrocil blad.",
        )
    if isinstance(generic_data, dict) and generic_data.get("errors"):
        logger.warning(
            "Search-a-licious returned errors for generic query '%s': %s",
            q,
            generic_data["errors"],
        )
        raise HTTPException(
            status_code=502,
            detail="Nowy endpoint wyszukiwania zwrocil blad.",
        )

    documents = extract_search_documents(prioritized_data) + extract_search_documents(
        generic_data
    )
    results = []
    seen_ids: set[str] = set()
    for product in documents:
        product_id = product.get("code") or product.get("id")
        product_name = product.get("product_name_pl") or product.get("product_name") or product.get("name")
        raw_off_tags = product.get("categories_tags") or []
        off_tags = [
            str(tag).replace("en:", "")
            for tag in raw_off_tags
            if isinstance(tag, str)
        ]
        matched_category = await product_service.find_category_by_off_tags(db, off_tags)
        product_key = str(product_id) if product_id else ""
        if product_key and product_name and product_key not in seen_ids:
            seen_ids.add(product_key)
            results.append(
                {
                    "id": product_key,
                    "name": product_name,
                    "description": product.get("brands", "Brak informacji o marce"),
                    "brand": product.get("brands"),
                    "category": (
                        CategoryRead.model_validate(matched_category)
                        if matched_category
                        else None
                    ),
                }
            )
        if len(results) >= 15:
            break

    return results


@router.get("/barcode/{barcode}")
async def get_product_by_barcode(barcode: str):
    if not barcode.isdigit():
        raise HTTPException(
            status_code=400, detail="Kod kreskowy musi skladac sie z cyfr"
        )

    product_url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

    async with build_http_client() as client:
        try:
            response = await client.get(product_url)

            if response.status_code == 200:
                data = response.json()
                if (
                    data.get("status") == 0
                    or "product" not in data
                    or not data.get("product")
                ):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Produkt o kodzie {barcode} nie zostal znaleziony",
                    )

                product = data["product"]
                return {
                    "id": product.get("code"),
                    "name": product.get("product_name_pl")
                    or product.get("product_name"),
                    "description": product.get("brands", "Brak informacji o marce"),
                    "image_url": product.get("image_front_url"),
                }

            if response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produkt o kodzie {barcode} nie zostal znaleziony w API",
                )

            response.raise_for_status()

        except httpx.RequestError as exc:
            logger.exception("External barcode lookup failed for barcode '%s'", barcode)
            raise HTTPException(
                status_code=503,
                detail=f"Blad komunikacji z zewnetrznym API: {exc}",
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "External barcode lookup returned bad status for '%s': %s, body=%s",
                barcode,
                exc.response.status_code,
                exc.response.text[:500],
            )
            raise HTTPException(
                status_code=502,
                detail=f"Zewnetrzne API zwrocilo blad: {exc.response.status_code}",
            ) from exc
        except ValueError as exc:
            logger.exception(
                "External barcode lookup returned invalid JSON for '%s'", barcode
            )
            raise HTTPException(
                status_code=502,
                detail=f"Zewnetrzne API zwrocilo nieprawidlowa odpowiedz: {exc}",
            ) from exc

    raise HTTPException(status_code=500, detail="Wystapil nieoczekiwany blad serwera")


@router.get("/resolve-category/{external_id}", response_model=CategoryRead)
async def resolve_category_endpoint(
    external_id: str, db: AsyncSession = Depends(get_async_session)
):
    category = await product_service.resolve_category_from_external_id(db, external_id)
    if not category:
        raise HTTPException(
            status_code=404,
            detail="Nie udalo sie automatycznie dopasowac kategorii dla tego produktu.",
        )
    return category
