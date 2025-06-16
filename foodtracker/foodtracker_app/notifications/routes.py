from fastapi import APIRouter, Depends, status
from foodtracker_app.auth.dependancies import get_current_user
from foodtracker_app.models.user import User
from foodtracker_app.notifications.tasks import notify_expiring_products
from foodtracker_app.utils.email_utils import send_email_async
from foodtracker_app.utils.template_utils import render_template
from datetime import datetime, timezone
router = APIRouter()

@router.post("/run-check", status_code=status.HTTP_202_ACCEPTED)
async def run_expiration_check(user: User = Depends(get_current_user)):
    notify_expiring_products.delay()
    return {"message": "Expiration check task triggered."}


@router.post("/send-test")
async def send_test_email(user: User = Depends(get_current_user)):



    body = "Jeśli to czytasz, to znaczy, że HTML mail też działa!"

    html = await render_template(
        "email_reminder.html",
        email=user.email,
        products=[
            {"name": "Jogurt naturalny", "expiration_date": "2025-06-11"},
            {"name": "Szynka konserwowa", "expiration_date": "2025-06-12"},
        ],
        now=lambda: datetime.now(timezone.utc)
    )

    await send_email_async(
        to_email=user.email,
        subject="🧪 Test HTML z FoodTrackera",
        body=body,
        html=html
    )

    return {"msg": f"Wysłano HTML maila do {user.email}!"}