from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.farm import Farm


class SoilHealthCard(Base):
    __tablename__ = "soil_health_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)

    # Optional linkage to specific farm
    farm_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Fields matching shc.csv exactly
    year: Mapped[str] = mapped_column(String(20), default="2024-25", nullable=False, index=True)
    state_name: Mapped[str] = mapped_column(String(50), default="Maharashtra", nullable=False)
    state_code: Mapped[int] = mapped_column(Integer, default=27, nullable=False)

    district_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    district_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    block_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    block_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    village_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    village_code: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    nutrient_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Macro, Micro
    nutrient_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # Nitrogen, Phosphorus, etc.
    nutrient_level: Mapped[str] = mapped_column(String(50), nullable=False)  # Low, Medium, High, Deficient, etc.
    value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    farm: Mapped["Farm | None"] = relationship("Farm", back_populates="soil_cards")

    __table_args__ = (
        Index("ix_shc_village_nutrient", "village_code", "nutrient_name"),
        Index("ix_shc_district_block", "district_name", "block_name"),
    )

