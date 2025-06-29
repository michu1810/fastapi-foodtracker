from pathlib import Path

from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from foodtracker_app.auth import social
from foodtracker_app.auth.routes import auth_router, product_router
from foodtracker_app.calendar_view.routes import router as calendar_router
from foodtracker_app.external.routes import router as external_router
from foodtracker_app.notifications.routes import router as notifications_router
from foodtracker_app.routes.pantries import router as pantries_router
from foodtracker_app.routes.categories import router as categories_router
from foodtracker_app.routes.invitations import router as invitations_router

from foodtracker_app.settings import settings
from rate_limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware
from foodtracker_app.db.database import async_session_maker
from foodtracker_app.db.init_db import seed_categories

env_path = Path(__file__).resolve().parents[1] / ".env"

if not env_path.exists():
    print("❗️ .env NIE ZNALEZIONY:", env_path)
else:
    print("✅ .env ZAŁADOWANY:", env_path)

load_dotenv(dotenv_path=env_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Aplikacja startuje, uruchamiam logikę początkową...")
    async with async_session_maker() as session:
        await seed_categories(session)

    yield

    print("Aplikacja się zamyka.")


app = FastAPI(lifespan=lifespan)

app.state.limiter = limiter

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Food Tracker API",
        version="1.0.0",
        description="Aplikacja do śledzenia daty ważności produktów",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(
    product_router, prefix="/pantries/{pantry_id}/products", tags=["Products"]
)
app.include_router(social.router, tags=["Social login"])
app.include_router(calendar_router, tags=["Calendar"])
app.include_router(external_router, tags=["External"])
app.include_router(
    notifications_router, prefix="/notifications", tags=["Notifications"]
)

app.include_router(pantries_router, prefix="/pantries", tags=["Pantries"])
app.include_router(categories_router, prefix="/categories")
app.include_router(invitations_router)
health_router = APIRouter()


@health_router.get("/health", include_in_schema=False)
def health_check():
    return {"status": "ok"}


app.include_router(health_router)
