from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.auction import Auction


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone_number: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    aadhar_number: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Maharashtra state boundary constraint
    state: Mapped[str] = mapped_column(String(50), default="Maharashtra", nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    taluka: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    village: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    farms: Mapped[list["Farm"]] = relationship(
        "Farm",
        back_populates="farmer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    auctions: Mapped[list["Auction"]] = relationship(
        "Auction",
        back_populates="farmer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
