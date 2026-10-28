from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import SessionDep
from app.schemas.farm import (
    FarmCreate,
    FarmUpdate,
    FarmRead,
    FarmWithSoilHealth,
    FarmMaskRequest,
    FarmMaskResponse,
)
from app.services import farm as farm_service

router = APIRouter(prefix="/farms", tags=["Farms (Maharashtra)"])


@router.get("", response_model=list[FarmRead])
def list_farms(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    farmer_id: int | None = Query(None, description="Filter by farmer ID"),
    district: str | None = Query(None, description="Filter by Maharashtra District"),
    taluka: str | None = Query(None, description="Filter by Taluka / Block"),
    village_code: int | None = Query(None, description="Filter by Village Census Code (shc.csv)"),
):
    """List farm land parcels across Maharashtra."""
    farms, _ = farm_service.list_farms(
        db,
        skip=skip,
        limit=limit,
        farmer_id=farmer_id,
        district=district,
        taluka=taluka,
        village_code=village_code,
    )
    return farms


@router.post("", response_model=FarmRead, status_code=status.HTTP_201_CREATED)
def create_farm(payload: FarmCreate, db: SessionDep):
    """Register a new farm plot under a Maharashtra farmer."""
    return farm_service.create_farm(db, payload)


@router.post("/segment-mask", response_model=FarmMaskResponse)
def segment_farm_mask(payload: FarmMaskRequest):
    """Process map tile coordinates using ONNX SAM to segment the farm parcel boundary.

    Returns the GeoJSON polygon, acreage, and mask metadata for Leaflet Esri mapping.
    """
    return farm_service.segment_farm_mask(payload)


@router.get("/{farm_id}", response_model=FarmRead)
def get_farm(farm_id: int, db: SessionDep):
    """Get farm parcel details."""
    farm = farm_service.get_farm(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found.",
        )
    return farm


@router.get("/{farm_id}/soil-report", response_model=FarmWithSoilHealth)
def get_farm_soil_report(farm_id: int, db: SessionDep):
    """Get comprehensive farm details linked with Soil Health Card records for its village.

    Provides critical deficiency alerts, recommended fertilizer dosages, and crop advice.
    """
    farm = farm_service.get_farm(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found.",
        )
    report = farm_service.get_farm_soil_report(db, farm)
    farm_dict = {
        k: v for k, v in report["farm"].__dict__.items()
        if k != "soil_cards" and not k.startswith("_")
    }
    return FarmWithSoilHealth(
        **farm_dict,
        soil_cards=report["soil_records"],
        soil_report=report["soil_report"],
    )


@router.put("/{farm_id}", response_model=FarmRead)
def update_farm(farm_id: int, payload: FarmUpdate, db: SessionDep):
    """Update farm acreage, soil type, irrigation source, or crops."""
    farm = farm_service.get_farm(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found.",
        )
    return farm_service.update_farm(db, farm, payload)


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(farm_id: int, db: SessionDep):
    """Delete a farm parcel."""
    farm = farm_service.get_farm(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found.",
        )
    farm_service.delete_farm(db, farm)
