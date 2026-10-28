from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.farmer import Farmer
    from app.models.farm import Farm
    from app.models.buyer import Buyer


class Auction(Base):
    __tablename__ = "auctions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    farm_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Commodity Details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    commodity_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # Cotton, Oilseeds, Pulses, etc.
    variety: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="Quintal", nullable=False)  # Quintal, Kg, Ton, Bag
    quality_grade: Mapped[str] = mapped_column(String(50), default="FAQ", nullable=False)  # Grade A, Grade B, FAQ
    moisture_content_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Pricing & Increments
    base_price: Mapped[float] = mapped_column(Float, nullable=False)  # Starting price per unit (INR)
    reserve_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # Minimum acceptable price
    min_bid_increment: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)

    # Live state tracking
    current_highest_bid: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_highest_bidder_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("buyers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    winning_bid_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bids.id", ondelete="SET NULL", name="fk_auction_winning_bid"), nullable=True
    )
    final_price: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Auction Timing & Status
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(30), default="LIVE", nullable=False, index=True
    )  # UPCOMING, LIVE, COMPLETED, UNSOLD, CANCELLED

    # Location of produce
    pickup_district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pickup_taluka: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pickup_village: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    farmer: Mapped["Farmer"] = relationship("Farmer", back_populates="auctions")
    farm: Mapped["Farm | None"] = relationship("Farm")
    bids: Mapped[list["Bid"]] = relationship(
        "Bid",
        back_populates="auction",
        foreign_keys="[Bid.auction_id]",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(Bid.bid_amount)",
    )
    current_highest_bidder: Mapped["Buyer | None"] = relationship("Buyer", foreign_keys=[current_highest_bidder_id])
    winning_bid: Mapped["Bid | None"] = relationship("Bid", foreign_keys=[winning_bid_id], post_update=True)

    __table_args__ = (
        Index("ix_auction_status_timing", "status", "start_time", "end_time"),
    )


class Bid(Base):
    __tablename__ = "bids"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    auction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("auctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False, index=True
    )

    bid_amount: Mapped[float] = mapped_column(Float, nullable=False)  # Bid price per unit
    total_value: Mapped[float] = mapped_column(Float, nullable=False)  # bid_amount * auction.quantity
    status: Mapped[str] = mapped_column(
        String(30), default="ACCEPTED", nullable=False
    )  # ACCEPTED, OUTBID, WON, REJECTED

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    auction: Mapped["Auction"] = relationship("Auction", back_populates="bids", foreign_keys=[auction_id])
    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="bids", foreign_keys=[buyer_id])

