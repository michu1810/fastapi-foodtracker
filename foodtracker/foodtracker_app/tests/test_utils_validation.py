import pytest
from foodtracker_app.utils.recaptcha import verify_recaptcha


@pytest.mark.asyncio
async def test_verify_recaptcha_ok(mocker):
    mocker.patch(
        "httpx.AsyncClient.post",
        return_value=mocker.MagicMock(json=lambda: {"success": True}),
    )
    ok = await verify_recaptcha("dummy")
    assert ok is True
