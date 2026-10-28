from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import SessionDep
from app.schemas.auction import (
    AuctionCreate,
    AuctionRead,
    AuctionDetail,
    BidCreate,
    PlaceBidResponse,
    CloseAuctionResponse,
)
from app.services import auction as auction_service

router = APIRouter(prefix="/auctions", tags=["Produce Auctions & Bidding"])


@router.get("", response_model=list[AuctionRead])
def list_auctions(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None, description="Filter by status: UPCOMING, LIVE, COMPLETED, UNSOLD, CANCELLED"),
    commodity_name: str | None = Query(None, description="e.g. Cotton, Soybean, Onion, Sugarcane"),
    category: str | None = Query(None, description="e.g. Cash Crops, Oilseeds, Vegetables"),
    district: str | None = Query(None, description="Pickup district (e.g. Akola, Beed, Nashik, Pune)"),
    farmer_id: int | None = Query(None, description="Filter by listing farmer"),
    min_price: float | None = Query(None, description="Minimum base price"),
    max_price: float | None = Query(None, description="Maximum base price"),
):
    """List produce auction lots with live status tracking and filters."""
    auctions, _ = auction_service.list_auctions(
        db,
        skip=skip,
        limit=limit,
        status_filter=status,
        commodity_name=commodity_name,
        category=category,
        district=district,
        farmer_id=farmer_id,
        min_price=min_price,
        max_price=max_price,
    )
    return auctions


@router.post("", response_model=AuctionRead, status_code=status.HTTP_201_CREATED)
def create_auction(payload: AuctionCreate, db: SessionDep):
    """List an agricultural produce lot for auction."""
    return auction_service.create_auction(db, payload)


@router.get("/{auction_id}", response_model=AuctionDetail)
def get_auction(auction_id: int, db: SessionDep):
    """Get full auction details including chronological bid history, highest bidder, and farmer info."""
    return auction_service.get_auction_detail(db, auction_id)


@router.post("/{auction_id}/bids", response_model=PlaceBidResponse, status_code=status.HTTP_201_CREATED)
def place_bid(auction_id: int, payload: BidCreate, db: SessionDep):
    """Place a live bid on a produce auction.

    - Validates buyer is active.
    - Enforces auction is currently LIVE.
    - Enforces bid >= base_price and >= (current_highest_bid + min_bid_increment).
    - Automatically marks prior highest bids as OUTBID.
    - Farmers cannot bid on their own lot.
    """
    return auction_service.place_bid(db, auction_id, payload)


@router.post("/{auction_id}/close", response_model=CloseAuctionResponse)
def close_auction(auction_id: int, db: SessionDep):
    """Manually or automatically finalize an auction:

    - Evaluates all received bids.
    - Checks against reserve price (if set).
    - Declares winning buyer and final settlement price, or marks UNSOLD.
    """
    auction = auction_service.get_auction(db, auction_id)
    if not auction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Auction with ID {auction_id} not found.",
        )
    return auction_service.close_auction(db, auction)


@router.post("/{auction_id}/cancel", response_model=AuctionRead)
def cancel_auction(auction_id: int, db: SessionDep):
    """Cancel an active or upcoming auction."""
    auction = auction_service.get_auction(db, auction_id)
    if not auction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Auction with ID {auction_id} not found.",
        )
    return auction_service.cancel_auction(db, auction)

