import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.v1.api import api_router

# Ensure all SQLAlchemy models are imported so Base.metadata knows about them
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (farmers, farms, soil_health_cards)
    Base.metadata.create_all(bind=engine)
    try:
        from app.db.seed import seed_database
        seed_database()
    except Exception as e:
        print(f"Database seed notice: {e}")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Kissanmart Maharashtra AgriTech API",
        description="Comprehensive backend API for Maharashtra Farmers, Farms, and Soil Health Cards (shc.csv)",
        version="1.0.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API v1 routes
    app.include_router(api_router, prefix=settings.api_v1_str)

    # Static files directory for saved SAM masks and satellite tiles
    static_masks_dir = os.path.join(os.path.dirname(__file__), "static", "masks")
    os.makedirs(static_masks_dir, exist_ok=True)
    app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

    # ── Single Package Hosting: Mount built frontend if available ───────────
    frontend_dist = settings.frontend_dist_dir or os.getenv("FRONTEND_DIST_DIR")
    if not frontend_dist or not os.path.exists(frontend_dist):
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
            os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),
            "/app/frontend/dist",
        ]
        for c in candidates:
            if os.path.isdir(c) and os.path.isfile(os.path.join(c, "index.html")):
                frontend_dist = c
                break

    if frontend_dist and os.path.isfile(os.path.join(frontend_dist, "index.html")):
        assets_dir = os.path.join(frontend_dist, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            # If a specific root asset is requested (e.g., favicon.ico, vite.svg)
            candidate_file = os.path.join(frontend_dist, full_path)
            if full_path and os.path.isfile(candidate_file):
                return FileResponse(candidate_file)
            # Default to index.html for client-side React SPA routing
            return FileResponse(os.path.join(frontend_dist, "index.html"))
    else:
        @app.get("/", tags=["Root"])
        def root():
            return {
                "name": "Kissanmart Maharashtra AgriTech API",
                "state_scope": "Maharashtra (State Code: 27)",
                "docs": "/docs",
                "redoc": "/redoc",
                "api_version": "v1",
                "frontend": "Not built yet. Run 'npm run build' inside frontend/ to enable unified single-package hosting.",
            }

    return app


app = create_app()
