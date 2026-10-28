from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_maharashtra(val: str) -> str:
    if val.strip().lower() != "maharashtra":
        raise ValueError("Only Maharashtra state is supported in this system.")
    return "Maharashtra"


class SoilHealthCardBase(BaseModel):
    year: str = Field(default="2024-25", description="Testing year (e.g. 2024-25)")
    state_name: str = Field(default="Maharashtra", description="Strictly Maharashtra")
    state_code: int = Field(default=27, description="Maharashtra state code (27)")

    district_name: str = Field(..., min_length=2, max_length=100, description="District name in Maharashtra")
    district_code: int | None = Field(None, description="Census/LGD district code")

    block_name: str = Field(..., min_length=2, max_length=100, description="Block / Taluka name")
    block_code: int | None = Field(None, description="Block code")

    village_name: str = Field(..., min_length=2, max_length=100, description="Village name")
    village_code: int = Field(..., description="Village census/LGD code from shc.csv")

    nutrient_type: str = Field(..., description="Nutrient category: 'Macro' or 'Micro'")
    nutrient_name: str = Field(
        ...,
        description="Nutrient name (e.g. Nitrogen, Phosphorus, Potassium, Soil Ph, Boron, Zinc, etc.)",
    )
    nutrient_level: str = Field(
        ...,
        description="Level: Low, Medium, High, Deficient, Sufficient, Acidic, Neutral, Alkaline, etc.",
    )
    value: float = Field(default=0.0, description="Count, sample value, or test measurement")

    @field_validator("state_name")
    @classmethod
    def check_state(cls, v: str) -> str:
        return validate_maharashtra(v)

    @field_validator("state_code")
    @classmethod
    def check_state_code(cls, v: int) -> int:
        if v != 27:
            raise ValueError("State code must be 27 for Maharashtra.")
        return v


class SoilHealthCardCreate(SoilHealthCardBase):
    farm_id: int | None = Field(None, description="Optional farm ID to link this card directly to a farm")


class SoilHealthCardUpdate(BaseModel):
    nutrient_level: str | None = None
    value: float | None = None
    farm_id: int | None = None


class SoilHealthCardRead(SoilHealthCardBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    farm_id: int | None = None
    created_at: datetime


class NutrientDetail(BaseModel):
    nutrient_name: str
    nutrient_type: str
    level: str
    value: float
    status: str  # "Deficient", "Adequate", "Excessive", "Optimal"


class VillageSoilSummary(BaseModel):
    village_code: int
    village_name: str
    block_name: str
    district_name: str
    state_name: str = "Maharashtra"
    year: str
    total_records: int
    macro_nutrients: list[NutrientDetail]
    micro_nutrients: list[NutrientDetail]
    critical_deficiencies: list[str]


class SoilRecommendationResponse(BaseModel):
    village_code: int
    village_name: str
    district_name: str
    soil_ph_status: str | None = "Neutral"
    deficient_nutrients: list[str] = []
    fertilizer_recommendations: list[str] = []
    suitable_crops_for_soil: list[str] = []
    general_soil_advice: list[str] = []


class CSVImportRequest(BaseModel):
    csv_file_path: str = Field(default="shc.csv", description="Relative or absolute path to shc.csv")
    max_rows: int | None = Field(10000, description="Max rows to import (None for entire file)")
    district_filter: str | None = Field(None, description="Optional district name filter (e.g. 'Akola', 'Beed')")


class CSVImportResponse(BaseModel):
    status: str
    message: str
    imported_count: int
    skipped_count: int
    total_processed: int

