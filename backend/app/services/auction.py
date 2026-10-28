from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_
from fastapi import HTTPException, status

from app.models.auction import Auction, Bid
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.buyer import Buyer
from app.schemas.auction import (
    AuctionCreate,
    AuctionUpdate,
    BidCreate,
    PlaceBidResponse,
    CloseAuctionResponse,
    AuctionDetail,
    BidRead,
)


def _get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_auction(db: Session, auction_id: int) -> Auction | None:
    return db.get(Auction, auction_id)


def get_auction_detail(db: Session, auction_id: int) -> AuctionDetail:
    auction = get_auction(db, auction_id)
    if not auction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Auction with ID {auction_id} not found.",
        )

    # Sync status if expired
    sync_auction_status(db, auction)

    farmer_name = auction.farmer.name if auction.farmer else None
    buyer_name = auction.current_highest_bidder.company_name if auction.current_highest_bidder else None

    bids_read = [
        BidRead(
            id=b.id,
            auction_id=b.auction_id,
            buyer_id=b.buyer_id,
            bid_amount=b.bid_amount,
            total_value=b.total_value,
            status=b.status,
            created_at=b.created_at,
        )
        for b in auction.bids
    ]

    return AuctionDetail(
        id=auction.id,
        farmer_id=auction.farmer_id,
        farm_id=auction.farm_id,
        title=auction.title,
        commodity_name=auction.commodity_name,
        category=auction.category,
        variety=auction.variety,
        quantity=auction.quantity,
        unit=auction.unit,
        quality_grade=auction.quality_grade,
        moisture_content_pct=auction.moisture_content_pct,
        base_price=auction.base_price,
        reserve_price=auction.reserve_price,
        min_bid_increment=auction.min_bid_increment,
        current_highest_bid=auction.current_highest_bid,
        current_highest_bidder_id=auction.current_highest_bidder_id,
        winning_bid_id=auction.winning_bid_id,
        final_price=auction.final_price,
        start_time=auction.start_time,
        end_time=auction.end_time,
        status=auction.status,
        pickup_district=auction.pickup_district,
        pickup_taluka=auction.pickup_taluka,
        pickup_village=auction.pickup_village,
        created_at=auction.created_at,
        updated_at=auction.updated_at,
        bids=bids_read,
        farmer_name=farmer_name,
        current_highest_bidder_name=buyer_name,
    )


def sync_auction_status(db: Session, auction: Auction) -> None:
    """Helper to auto-transition statuses based on wall-clock time."""
    now = _get_utc_now()
    start = auction.start_time if auction.start_time.tzinfo else auction.start_time.replace(tzinfo=timezone.utc)
    end = auction.end_time if auction.end_time.tzinfo else auction.end_time.replace(tzinfo=timezone.utc)

    if auction.status == "UPCOMING" and now >= start and now < end:
        auction.status = "LIVE"
        db.commit()
        db.refresh(auction)
    elif auction.status == "LIVE" and now >= end:
        # Auction time elapsed, close auction
        close_auction(db, auction)


def list_auctions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
    commodity_name: str | None = None,
    category: str | None = None,
    district: str | None = None,
    farmer_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
) -> tuple[list[Auction], int]:
    stmt = select(Auction)

    if status_filter:
        stmt = stmt.where(Auction.status == status_filter.upper())
    if commodity_name:
        stmt = stmt.where(Auction.commodity_name.ilike(f"%{commodity_name.strip()}%"))
    if category:
        stmt = stmt.where(Auction.category.ilike(f"%{category.strip()}%"))
    if district:
        stmt = stmt.where(Auction.pickup_district.ilike(f"%{district.strip()}%"))
    if farmer_id is not None:
        stmt = stmt.where(Auction.farmer_id == farmer_id)
    if min_price is not None:
        stmt = stmt.where(Auction.base_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Auction.base_price <= max_price)

    total = len(db.execute(stmt).scalars().all())
    auctions = db.execute(stmt.order_by(Auction.id.desc()).offset(skip).limit(limit)).scalars().all()

    # Sync statuses
    for a in auctions:
        sync_auction_status(db, a)

    return list(auctions), total


def create_auction(db: Session, payload: AuctionCreate) -> Auction:
    # Validate farmer exists
    farmer = db.get(Farmer, payload.farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID {payload.farmer_id} not found.",
        )

    # Validate farm if provided
    if payload.farm_id:
        farm = db.get(Farm, payload.farm_id)
        if not farm or farm.farmer_id != farmer.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Farm ID {payload.farm_id} does not belong to farmer {farmer.id}.",
            )

    now = _get_utc_now()
    start = payload.start_time if payload.start_time.tzinfo else payload.start_time.replace(tzinfo=timezone.utc)

    # Initial status
    initial_status = "LIVE" if now >= start else "UPCOMING"

    auction_data = payload.model_dump()
    auction = Auction(
        **auction_data,
        status=initial_status,
        current_highest_bid=payload.base_price,
    )
    db.add(auction)
    db.commit()
    db.refresh(auction)
    return auction


def place_bid(db: Session, auction_id: int, payload: BidCreate) -> PlaceBidResponse:
    """Core Bidding Logic:

    1. Verify buyer exists and is active.
    2. Verify auction is LIVE and within active time window.
    3. Disallow farmer from bidding on own lot.
    4. Enforce base price and min_bid_increment.
    5. Update previous highest bid to 'OUTBID'.
    6. Record new highest bid and update live auction state.
    """
    auction = get_auction(db, auction_id)
    if not auction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Auction with ID {auction_id} not found.",
        )

    # Sync status
    sync_auction_status(db, auction)

    if auction.status != "LIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot place bid. Auction status is '{auction.status}'. Bids are only accepted on LIVE auctions.",
        )

    buyer = db.get(Buyer, payload.buyer_id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with ID {payload.buyer_id} not found.",
        )

    if not buyer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyer account is deactivated. Contact administrator.",
        )

    # Disallow farmer from bidding on own produce
    if auction.farmer.phone_number == buyer.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farmer cannot bid on their own listed produce.",
        )

    # Bid Price Rules
    min_required_bid: float
    if auction.current_highest_bidder_id is None:
        # First bid: must be >= base_price
        min_required_bid = auction.base_price
    else:
        # Subsequent bid: must be >= current_highest_bid + min_bid_increment
        min_required_bid = (auction.current_highest_bid or auction.base_price) + auction.min_bid_increment

    if payload.bid_amount < min_required_bid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Bid of ₹{payload.bid_amount} is too low. "
                f"Minimum acceptable bid is ₹{min_required_bid:.2f} "
                f"(Base: ₹{auction.base_price:.2f}, Current High: ₹{auction.current_highest_bid or 0:.2f}, "
                f"Min Increment: ₹{auction.min_bid_increment:.2f})."
            ),
        )

    prev_high = auction.current_highest_bid

    # Mark existing active bids for this auction as OUTBID
    for existing_bid in auction.bids:
        if existing_bid.status == "ACCEPTED":
            existing_bid.status = "OUTBID"

    # Compute total value
    total_value = round(payload.bid_amount * auction.quantity, 2)

    # Create new bid
    new_bid = Bid(
        auction_id=auction.id,
        buyer_id=buyer.id,
        bid_amount=payload.bid_amount,
        total_value=total_value,
        status="ACCEPTED",
    )
    db.add(new_bid)

    # Update auction highest tracker
    auction.current_highest_bid = payload.bid_amount
    auction.current_highest_bidder_id = buyer.id

    db.commit()
    db.refresh(new_bid)
    db.refresh(auction)

    next_min = payload.bid_amount + auction.min_bid_increment

    return PlaceBidResponse(
        message=f"Bid of ₹{payload.bid_amount}/unit accepted successfully! Total value: ₹{total_value:,.2f}",
        bid_id=new_bid.id,
        auction_id=auction.id,
        buyer_id=buyer.id,
        bid_amount=payload.bid_amount,
        total_value=total_value,
        status=new_bid.status,
        previous_highest_bid=prev_high,
        minimum_next_bid=next_min,
    )


def close_auction(db: Session, auction: Auction) -> CloseAuctionResponse:
    """Closes auction and determines the winning buyer:

    - If bids exist and meet reserve_price: marks COMPLETED and assigns winner.
    - If no bids or below reserve_price: marks UNSOLD.
    """
    total_bids = len(auction.bids)

    if not auction.bids or auction.current_highest_bidder_id is None:
        auction.status = "UNSOLD"
        db.commit()
        db.refresh(auction)
        return CloseAuctionResponse(
            auction_id=auction.id,
            status="UNSOLD",
            final_price=None,
            winning_buyer_id=None,
            winning_bid_id=None,
            total_bids_received=0,
            message="Auction ended with no bids received. Status set to UNSOLD.",
        )

    # Find highest bid
    highest_bid = max(auction.bids, key=lambda b: b.bid_amount)

    # Check reserve price
    if auction.reserve_price is not None and highest_bid.bid_amount < auction.reserve_price:
        auction.status = "UNSOLD"
        db.commit()
        db.refresh(auction)
        return CloseAuctionResponse(
            auction_id=auction.id,
            status="UNSOLD",
            final_price=highest_bid.bid_amount,
            winning_buyer_id=None,
            winning_bid_id=None,
            total_bids_received=total_bids,
            message=(
                f"Highest bid of ₹{highest_bid.bid_amount} did not meet confidential reserve price of "
                f"₹{auction.reserve_price}. Status set to UNSOLD."
            ),
        )

    # Winner established!
    auction.status = "COMPLETED"
    auction.final_price = highest_bid.bid_amount
    auction.winning_bid_id = highest_bid.id
    highest_bid.status = "WON"

    db.commit()
    db.refresh(auction)

    return CloseAuctionResponse(
        auction_id=auction.id,
        status="COMPLETED",
        final_price=highest_bid.bid_amount,
        winning_buyer_id=highest_bid.buyer_id,
        winning_bid_id=highest_bid.id,
        total_bids_received=total_bids,
        message=f"Auction completed successfully! Winning bid ₹{highest_bid.bid_amount} by Buyer #{highest_bid.buyer_id}.",
    )


def cancel_auction(db: Session, auction: Auction, reason: str | None = None) -> Auction:
    if auction.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an auction that has already COMPLETED.",
        )

    auction.status = "CANCELLED"
    db.commit()
    db.refresh(auction)
    return auction

