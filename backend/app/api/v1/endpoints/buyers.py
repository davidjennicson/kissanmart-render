from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import SessionDep
from app.schemas.buyer import BuyerCreate, BuyerUpdate, BuyerRead, BuyerWithBids
from app.schemas.auction import AuctionRead, BidRead
from app.services import buyer as buyer_service

router = APIRouter(prefix="/buyers", tags=["Buyers / Traders"])


@router.get("", response_model=list[BuyerRead])
def list_buyers(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    district: str | None = Query(None, description="Filter by District"),
    business_type: str | None = Query(None, description="Wholesaler, APMC Trader, Retailer, Exporter, etc."),
    is_verified: bool | None = Query(None, description="Filter by KYC verification status"),
    search: str | None = Query(None, description="Search company name, contact, phone, PAN, GSTIN"),
):
    """List registered buyers, merchants, and APMC traders."""
    buyers, _ = buyer_service.list_buyers(
        db,
        skip=skip,
        limit=limit,
        district=district,
        business_type=business_type,
        is_verified=is_verified,
        search=search,
    )
    return buyers


@router.post("", response_model=BuyerRead, status_code=status.HTTP_201_CREATED)
def create_buyer(payload: BuyerCreate, db: SessionDep):
    """Register a new buyer / trader."""
    return buyer_service.create_buyer(db, payload)


@router.get("/{buyer_id}", response_model=BuyerWithBids)
def get_buyer(buyer_id: int, db: SessionDep):
    """Get buyer profile along with their active and past bids."""
    buyer = buyer_service.get_buyer(db, buyer_id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with ID {buyer_id} not found.",
        )
    return buyer


@router.get("/{buyer_id}/bids", response_model=list[BidRead])
def get_buyer_bids(buyer_id: int, db: SessionDep):
    """Get all bids placed by a specific buyer."""
    buyer = buyer_service.get_buyer(db, buyer_id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with ID {buyer_id} not found.",
        )
    return buyer.bids


@router.get("/{buyer_id}/won-auctions", response_model=list[AuctionRead])
def get_buyer_won_auctions(buyer_id: int, db: SessionDep):
    """Get all auctions won by this buyer."""
    buyer = buyer_service.get_buyer(db, buyer_id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with ID {buyer_id} not found.",
        )
    return buyer_service.get_buyer_won_auctions(db, buyer_id)


@router.put("/{buyer_id}", response_model=BuyerRead)
def update_buyer(buyer_id: int, payload: BuyerUpdate, db: SessionDep):
    """Update buyer information or verify KYC."""
    buyer = buyer_service.get_buyer(db, buyer_id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with ID {buyer_id} not found.",
        )
    return buyer_service.update_buyer(db, buyer, payload)


@router.delete("/{buyer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_buyer(buyer_id: int, db: SessionDep):
    """Delete a buyer account."""
    buyer = buyer_service.get_buyer(db, buyer_id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with ID {buyer_id} not found.",
        )
    buyer_service.delete_buyer(db, buyer)

