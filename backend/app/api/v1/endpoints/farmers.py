from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import SessionDep
from app.schemas.farmer import FarmerCreate, FarmerUpdate, FarmerRead, FarmerWithFarms
from app.schemas.farm import FarmRead
from app.services import farmer as farmer_service

router = APIRouter(prefix="/farmers", tags=["Farmers (Maharashtra)"])


@router.get("", response_model=list[FarmerRead])
def list_farmers(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    district: str | None = Query(None, description="Filter by Maharashtra District (e.g. Pune, Akola)"),
    taluka: str | None = Query(None, description="Filter by Taluka / Block"),
    village: str | None = Query(None, description="Filter by Village"),
    search: str | None = Query(None, description="Search by Name, Phone, or Aadhaar"),
):
    """List registered farmers in Maharashtra with search and pagination."""
    farmers, _ = farmer_service.list_farmers(
        db, skip=skip, limit=limit, district=district, taluka=taluka, village=village, search=search
    )
    return farmers


@router.post("", response_model=FarmerRead, status_code=status.HTTP_201_CREATED)
def create_farmer(payload: FarmerCreate, db: SessionDep):
    """Register a new farmer in Maharashtra."""
    return farmer_service.create_farmer(db, payload)


@router.get("/{farmer_id}", response_model=FarmerWithFarms)
def get_farmer(farmer_id: int, db: SessionDep):
    """Get farmer profile by ID along with their registered farms."""
    farmer = farmer_service.get_farmer(db, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID {farmer_id} not found.",
        )
    return farmer


@router.get("/{farmer_id}/farms", response_model=list[FarmRead])
def get_farmer_farms(farmer_id: int, db: SessionDep):
    """Get all farm parcels owned by a specific farmer."""
    farmer = farmer_service.get_farmer(db, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID {farmer_id} not found.",
        )
    return farmer.farms


@router.put("/{farmer_id}", response_model=FarmerRead)
def update_farmer(farmer_id: int, payload: FarmerUpdate, db: SessionDep):
    """Update farmer contact details or address."""
    farmer = farmer_service.get_farmer(db, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID {farmer_id} not found.",
        )
    return farmer_service.update_farmer(db, farmer, payload)


@router.delete("/{farmer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farmer(farmer_id: int, db: SessionDep):
    """Delete a farmer record and associated farm parcels."""
    farmer = farmer_service.get_farmer(db, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID {farmer_id} not found.",
        )
    farmer_service.delete_farmer(db, farmer)

