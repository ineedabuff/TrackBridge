from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, dashboard, health, tracking
from app.core.config import get_settings
from app.db.session import Base, engine
from app.models import tracking as tracking_models  # noqa: F401
from app.models import user  # noqa: F401

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="TrackBridge API",
    version="0.5.0",
    description="Self-hosted email tracking API.",
    openapi_url="/openapi.json",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.frontend_url), "http://localhost", "http://localhost:5173"],
    allow_origin_regex=settings.extension_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
app.include_router(tracking.email_router, prefix=settings.api_v1_prefix)
app.include_router(tracking.link_router, prefix=settings.api_v1_prefix)
app.include_router(tracking.attachment_router, prefix=settings.api_v1_prefix)
app.include_router(tracking.public_router)
