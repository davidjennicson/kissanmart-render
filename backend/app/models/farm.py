from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.farmer import Farmer
    from app.models.soil_health_card import SoilHealthCard


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    farm_name: Mapped[str] = mapped_column(String(150), nullable=False)
    survey_number: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Gat No / Survey No
    total_area_acres: Mapped[float] = mapped_column(Float, nullable=False)

    # Geographic linkage (Strictly Maharashtra)
    state: Mapped[str] = mapped_column(String(50), default="Maharashtra", nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    district_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    taluka: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # Block / Taluka
    block_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    village: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    village_code: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # Matches shc.csv village_code

    # Agronomic properties
    soil_type: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g., Black Cotton, Red Loam
    irrigation_type: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Drip, Well, Canal, Rainfed
    primary_crop: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Cotton, Soybean, Sugarcane, Onion

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # GeoJSON boundary of segmented parcel (from ONNX SAM)
    boundary_geojson: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    farmer: Mapped["Farmer"] = relationship("Farmer", back_populates="farms")
    soil_cards: Mapped[list["SoilHealthCard"]] = relationship(
        "SoilHealthCard",
        back_populates="farm",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
