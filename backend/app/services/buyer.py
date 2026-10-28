from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from app.models.buyer import Buyer
from app.models.auction import Auction
from app.schemas.buyer import BuyerCreate, BuyerUpdate


def get_buyer(db: Session, buyer_id: int) -> Buyer | None:
    return db.get(Buyer, buyer_id)


def get_buyer_by_phone(db: Session, phone_number: str) -> Buyer | None:
    stmt = select(Buyer).where(Buyer.phone_number == phone_number)
    return db.execute(stmt).scalar_one_or_none()


def list_buyers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    district: str | None = None,
    business_type: str | None = None,
    is_verified: bool | None = None,
    search: str | None = None,
) -> tuple[list[Buyer], int]:
    stmt = select(Buyer)

    if district:
        stmt = stmt.where(Buyer.district.ilike(f"%{district.strip()}%"))
    if business_type:
        stmt = stmt.where(Buyer.business_type.ilike(f"%{business_type.strip()}%"))
    if is_verified is not None:
        stmt = stmt.where(Buyer.is_verified == is_verified)
    if search:
        p = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Buyer.company_name.ilike(p),
                Buyer.contact_person.ilike(p),
                Buyer.phone_number.ilike(p),
                Buyer.pan_number.ilike(p),
                Buyer.gst_number.ilike(p),
            )
        )

    total = len(db.execute(stmt).scalars().all())
    buyers = db.execute(stmt.order_by(Buyer.id.desc()).offset(skip).limit(limit)).scalars().all()
    return list(buyers), total


def create_buyer(db: Session, payload: BuyerCreate) -> Buyer:
    # Check phone
    if get_buyer_by_phone(db, payload.phone_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Buyer with phone number {payload.phone_number} is already registered.",
        )

    # Check PAN if provided
    if payload.pan_number:
        stmt = select(Buyer).where(Buyer.pan_number == payload.pan_number)
        if db.execute(stmt).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Buyer with PAN {payload.pan_number} is already registered.",
            )

    # Check GSTIN if provided
    if payload.gst_number:
        stmt = select(Buyer).where(Buyer.gst_number == payload.gst_number)
        if db.execute(stmt).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Buyer with GSTIN {payload.gst_number} is already registered.",
            )

    buyer = Buyer(**payload.model_dump())
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


def update_buyer(db: Session, buyer: Buyer, payload: BuyerUpdate) -> Buyer:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(buyer, field, value)

    db.commit()
    db.refresh(buyer)
    return buyer


def delete_buyer(db: Session, buyer: Buyer) -> None:
    db.delete(buyer)
    db.commit()


def get_buyer_won_auctions(db: Session, buyer_id: int) -> list[Auction]:
    stmt = (
        select(Auction)
        .where(
            Auction.current_highest_bidder_id == buyer_id,
            Auction.status == "COMPLETED",
        )
        .order_by(Auction.end_time.desc())
    )
    return list(db.execute(stmt).scalars().all())

