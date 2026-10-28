from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.auction import Bid, Auction


class Buyer(Base):
    __tablename__ = "buyers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contact_person: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    # Business details
    pan_number: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True, index=True)
    gst_number: Mapped[str | None] = mapped_column(String(15), unique=True, nullable=True, index=True)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)  # APMC / Mandi license
    business_type: Mapped[str] = mapped_column(
        String(100), default="Wholesaler", nullable=False
    )  # Wholesaler, APMC Trader, Retailer, Food Processor, Exporter

    # Location
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), default="Maharashtra", nullable=False)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    bids: Mapped[list["Bid"]] = relationship(
        "Bid",
        back_populates="buyer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

