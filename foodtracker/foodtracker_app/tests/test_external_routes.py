import pytest
import respx
from httpx import Response

from foodtracker_app.external.routes import search_products_from_external_api


@pytest.mark.asyncio
@respx.mock
async def test_search_products_success():
    fake_response = {
        "products": [
            {"id": "123456", "product_name": "Sample Product", "brands": "Test Brand"}
        ]
    }

    respx.get("https://world.openfoodfacts.org/cgi/search.pl").mock(
        return_value=Response(200, json=fake_response)
    )

    result = await search_products_from_external_api(q="milk")
    assert isinstance(result, list)
    assert result[0]["id"] == "123456"
    assert result[0]["name"] == "Sample Product"
    assert result[0]["description"] == "Test Brand"
