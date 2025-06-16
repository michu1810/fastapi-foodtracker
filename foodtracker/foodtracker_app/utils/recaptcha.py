import httpx
from foodtracker_app.settings import settings

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"

async def verify_recaptcha(token: str) -> bool:
    payload = {
        "secret": settings.RECAPTCHA_SECRET_KEY,
        "response": token,
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(RECAPTCHA_VERIFY_URL, data=payload)
        result = response.json()
        return result.get("success", False)