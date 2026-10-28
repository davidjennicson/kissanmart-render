from fastapi import APIRouter
from app.api.v1.endpoints import health, farmers, farms, soil_health, buyers, auctions, voice

api_router = APIRouter()

# Core system endpoints
api_router.include_router(health.router)

# Agriculture & Soil domain (Maharashtra)
api_router.include_router(farmers.router)
api_router.include_router(farms.router)
api_router.include_router(soil_health.router)

# Marketplace & Auction domain
api_router.include_router(buyers.router)
api_router.include_router(auctions.router)

# Gemma AI Call Agent
api_router.include_router(voice.router)
