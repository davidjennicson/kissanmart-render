from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from app.models.farmer import Farmer
from app.schemas.farmer import FarmerCreate, FarmerUpdate


def get_farmer(db: Session, farmer_id: int) -> Farmer | None:
    return db.get(Farmer, farmer_id)


def get_farmer_by_aadhar(db: Session, aadhar_number: str) -> Farmer | None:
    stmt = select(Farmer).where(Farmer.aadhar_number == aadhar_number)
    return db.execute(stmt).scalar_one_or_none()


def get_farmer_by_phone(db: Session, phone_number: str) -> Farmer | None:
    stmt = select(Farmer).where(Farmer.phone_number == phone_number)
    return db.execute(stmt).scalar_one_or_none()


def list_farmers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    district: str | None = None,
    taluka: str | None = None,
    village: str | None = None,
    search: str | None = None,
) -> tuple[list[Farmer], int]:
    stmt = select(Farmer)

    # Strictly filter for Maharashtra
    stmt = stmt.where(Farmer.state == "Maharashtra")

    if district:
        stmt = stmt.where(Farmer.district.ilike(f"%{district.strip()}%"))
    if taluka:
        stmt = stmt.where(Farmer.taluka.ilike(f"%{taluka.strip()}%"))
    if village:
        stmt = stmt.where(Farmer.village.ilike(f"%{village.strip()}%"))
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Farmer.name.ilike(search_pattern),
                Farmer.phone_number.ilike(search_pattern),
                Farmer.aadhar_number.ilike(search_pattern),
            )
        )

    # Count total
    total = len(db.execute(stmt).scalars().all())

    # Paginate
    farmers = db.execute(stmt.order_by(Farmer.id.desc()).offset(skip).limit(limit)).scalars().all()
    return list(farmers), total


def create_farmer(db: Session, payload: FarmerCreate) -> Farmer:
    # Check for existing Aadhaar
    existing = get_farmer_by_aadhar(db, payload.aadhar_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Farmer with Aadhaar number ending in {payload.aadhar_number[-4:]} is already registered.",
        )

    farmer_data = payload.model_dump()
    farmer_data["state"] = "Maharashtra"  # Enforce Maharashtra

    farmer = Farmer(**farmer_data)
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    return farmer


def update_farmer(db: Session, farmer: Farmer, payload: FarmerUpdate) -> Farmer:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(farmer, field, value)

    # Guarantee Maharashtra remains
    farmer.state = "Maharashtra"

    db.commit()
    db.refresh(farmer)
    return farmer


def delete_farmer(db: Session, farmer: Farmer) -> None:
    db.delete(farmer)
    db.commit()

