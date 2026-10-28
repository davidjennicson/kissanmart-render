from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import SessionDep
from app.schemas.soil_health_card import (
    SoilHealthCardCreate,
    SoilHealthCardUpdate,
    SoilHealthCardRead,
    VillageSoilSummary,
    CSVImportRequest,
    CSVImportResponse,
)
from app.services import soil_health_card as shc_service

router = APIRouter(prefix="/soil-health", tags=["Soil Health Cards (Maharashtra - shc.csv)"])


@router.get("", response_model=list[SoilHealthCardRead])
def list_soil_health_cards(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    farm_id: int | None = Query(None, description="Filter by linked farm ID"),
    district_name: str | None = Query(None, description="Filter by Maharashtra District (e.g. Akola, Beed, Pune)"),
    block_name: str | None = Query(None, description="Filter by Taluka / Block"),
    village_code: int | None = Query(None, description="Filter by 6-digit Village Code from shc.csv"),
    nutrient_type: str | None = Query(None, description="'Macro' or 'Micro'"),
    nutrient_name: str | None = Query(None, description="e.g. Nitrogen, Phosphorus, Potassium, Zinc, Iron"),
    nutrient_level: str | None = Query(None, description="e.g. Low, Medium, High, Deficient, Sufficient"),
):
    """Query Maharashtra soil health card testing records from shc.csv dataset."""
    records, _ = shc_service.list_soil_records(
        db,
        skip=skip,
        limit=limit,
        farm_id=farm_id,
        district_name=district_name,
        block_name=block_name,
        village_code=village_code,
        nutrient_type=nutrient_type,
        nutrient_name=nutrient_name,
        nutrient_level=nutrient_level,
    )
    return records


@router.post("", response_model=SoilHealthCardRead, status_code=status.HTTP_201_CREATED)
def create_soil_record(payload: SoilHealthCardCreate, db: SessionDep):
    """Add a new soil health card record (Strictly restricted to Maharashtra state code 27)."""
    return shc_service.create_soil_record(db, payload)


@router.get("/districts", response_model=list[str])
def list_districts(db: SessionDep):
    """Get all unique Maharashtra districts present in the Soil Health dataset."""
    return shc_service.list_maharashtra_districts(db)


@router.get("/village/{village_code}/summary", response_model=VillageSoilSummary)
def get_village_summary(village_code: int, db: SessionDep):
    """Get aggregated Macro and Micro nutrient breakdown and critical deficiencies for a Maharashtra village."""
    return shc_service.get_village_soil_summary(db, village_code)


@router.get("/{record_id}", response_model=SoilHealthCardRead)
def get_soil_record(record_id: int, db: SessionDep):
    """Get single soil health card record by ID."""
    record = shc_service.get_soil_record(db, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Soil health record with ID {record_id} not found.",
        )
    return record


@router.put("/{record_id}", response_model=SoilHealthCardRead)
def update_soil_record(record_id: int, payload: SoilHealthCardUpdate, db: SessionDep):
    """Update a soil test entry."""
    record = shc_service.get_soil_record(db, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Soil health record with ID {record_id} not found.",
        )
    return shc_service.update_soil_record(db, record, payload)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_soil_record(record_id: int, db: SessionDep):
    """Delete a soil health test record."""
    record = shc_service.get_soil_record(db, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Soil health record with ID {record_id} not found.",
        )
    shc_service.delete_soil_record(db, record)


@router.post("/import-csv", response_model=CSVImportResponse)
def import_csv_data(payload: CSVImportRequest, db: SessionDep):
    """Seed or import Maharashtra Soil Health Card records directly from `shc.csv`.

    Automatically ignores any non-Maharashtra rows and imports valid dataset records.
    """
    return shc_service.import_shc_from_csv(
        db,
        csv_file_path=payload.csv_file_path,
        max_rows=payload.max_rows,
        district_filter=payload.district_filter,
    )

