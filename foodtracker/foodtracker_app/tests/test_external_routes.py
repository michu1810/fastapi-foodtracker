import pytest
import respx
from httpx import Response
from unittest.mock import AsyncMock, patch

from foodtracker_app.external.routes import search_products_from_external_api

SEARCH_URL = "https://search.openfoodfacts.org/search"


@pytest.mark.asyncio
@respx.mock
async def test_search_products_success():
    # Kod wykonuje dwa zapytania: jedno z priorytetem polskim, jedno ogólne.
    # Oba kierują do tego samego URL — mockujemy wzorcem.
    fake_response = {
        "hits": [
            {"code": "123456", "product_name": "Sample Product", "brands": "Test Brand"}
        ]
    }

    respx.get(SEARCH_URL).mock(return_value=Response(200, json=fake_response))

    # search_products_from_external_api wymaga sesji DB (find_category_by_off_tags)
    with patch(
        "foodtracker_app.services.product_service.find_category_by_off_tags",
        new=AsyncMock(return_value=None),
    ):
        result = await search_products_from_external_api(q="milk", db=AsyncMock())

    assert isinstance(result, list)
    assert result[0]["id"] == "123456"
    assert result[0]["name"] == "Sample Product"
    assert result[0]["description"] == "Test Brand"
