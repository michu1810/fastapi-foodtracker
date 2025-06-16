async def test_get_products_unauthenticated(client):
    response = client.get("/products")
    assert response.status_code == 404