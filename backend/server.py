"""MG Master Group — FastAPI entrypoint."""
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from app.db import get_db
from app.seed import seed_admin, write_test_credentials
from app.routes_auth import router as auth_router
from app.routes_entities import router as entities_router
from app.routes_learners import router as learners_router
from app.routes_courses import router as courses_router
from app.routes_certificates import router as cert_router, public_router
from app.routes_stats import router as stats_router


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("mg")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await seed_admin()
        write_test_credentials()
        log.info("Admin seeded & indexes created.")
    except Exception as e:
        log.exception("Seed failed: %s", e)
    yield


app = FastAPI(title="MG Master Group API", lifespan=lifespan)

# CORS — allow all origins (cookies disabled for cross-origin requires explicit origin)
cors_origins = os.environ.get("CORS_ORIGINS", "*")
allow_origins = [o.strip() for o in cors_origins.split(",")] if cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=".*" if cors_origins == "*" else None,
)


api = APIRouter(prefix="/api")


@api.get("/health")
async def health():
    return {"status": "ok", "app": os.environ.get("APP_NAME", "MG Master Group")}


api.include_router(auth_router)
api.include_router(entities_router)
api.include_router(learners_router)
api.include_router(courses_router)
api.include_router(cert_router)
api.include_router(public_router)
api.include_router(stats_router)

app.include_router(api)
