from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from foodtracker_app.settings import settings

registration_attempts = defaultdict(list)
MAX_ATTEMPTS_PER_IP = 2


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0]
    else:
        ip = request.client.host
    return ip


async def limit_registration(request: Request):
    client_ip = get_client_ip(request)

    if client_ip in settings.ALLOWED_IPS:
        return

    now = datetime.now(timezone.utc)
    today = now.date()

    attempts = registration_attempts[client_ip]
    registration_attempts[client_ip] = [ts for ts in attempts if ts.date() == today]

    if len(registration_attempts[client_ip]) >= MAX_ATTEMPTS_PER_IP:
        raise HTTPException(
            status_code=429, detail="Too many registration attempts today, try tommorow"
        )

    registration_attempts[client_ip].append(now)
