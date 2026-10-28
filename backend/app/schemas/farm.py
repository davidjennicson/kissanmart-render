from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_maharashtra(val: str) -> str:
    if val.strip().lower() != "maharashtra":
        raise ValueError("Only Maharashtra state is supported in this system.")
    return "Maharashtra"


class FarmBase(BaseModel):
    farm_name: str = Field(..., min_length=2, max_length=150, description="Farm name or identifier")
    survey_number: str | None = Field(None, max_length=100, description="Gat No / Survey Number")
    total_area_acres: float = Field(..., gt=0.0, description="Total farm land area in acres")

    # Maharashtra location
    state: str = Field(default="Maharashtra", description="State (Strictly Maharashtra)")
    district: str = Field(..., min_length=2, max_length=100, description="District name")
    district_code: int | None = Field(None, description="District code from SHC directory")
    taluka: str = Field(..., min_length=2, max_length=100, description="Taluka / Block")
    block_code: int | None = Field(None, description="Block code from SHC directory")
    village: str = Field(..., min_length=2, max_length=100, description="Village name")
    village_code: int = Field(..., description="Village census/LGD code matching shc.csv")

    # Agricultural characteristics
    soil_type: str | None = Field(None, max_length=100, description="e.g., Black Cotton, Red Sandy Loam")
    irrigation_type: str | None = Field(None, max_length=100, description="e.g., Drip, Well, Canal, Rainfed")
    primary_crop: str | None = Field(None, max_length=100, description="e.g., Cotton, Soybean, Sugarcane, Onion")
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)

    # GeoJSON boundary polygon from ONNX SAM segmentation
    boundary_geojson: str | None = None

    @field_validator("state")
    @classmethod
    def check_state(cls, v: str) -> str:
        return validate_maharashtra(v)


class FarmCreate(FarmBase):
    farmer_id: int = Field(..., description="Owner farmer ID")


class FarmUpdate(BaseModel):
    farm_name: str | None = None
    survey_number: str | None = None
    total_area_acres: float | None = Field(None, gt=0.0)
    district: str | None = None
    district_code: int | None = None
    taluka: str | None = None
    block_code: int | None = None
    village: str | None = None
    village_code: int | None = None
    soil_type: str | None = None
    irrigation_type: str | None = None
    primary_crop: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    boundary_geojson: str | None = None


class FarmRead(FarmBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    farmer_id: int
    created_at: datetime
    updated_at: datetime | None = None


# ONNX SAM Field Segmentation Request / Response schemas
class FarmMaskRequest(BaseModel):
    latitude: float = Field(..., description="Clicked latitude on Esri satellite map")
    longitude: float = Field(..., description="Clicked longitude on Esri satellite map")
    zoom: int = Field(default=17, description="Map zoom level")
    point_coords: list[list[float]] | None = Field(
        None, description="[x, y] coordinates within tile for ONNX SAM prompt"
    )
    point_labels: list[int] | None = Field(
        None, description="1 for foreground prompt point"
    )
    image_base64: str | None = Field(
        None, description="Optional map tile/canvas image in Base64"
    )
    gat_number: str | None = Field(None, description="Survey / Gat Number")


class FarmMaskResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str = "success"
    model_used: str  # "onnx_sam_mask_decoder" or "agronomic_segmentation_engine"
    point: dict[str, float]  # {"lat": ..., "lng": ...}
    polygon_coordinates: list[list[float]]  # [[lng, lat], ...]
    area_acres: float
    area_hectares: float
    perimeter_meters: float
    confidence_score: float
    geojson: dict
    message: str
    overlay_image_base64: str | None = None
    mask_image_base64: str | None = None
    tile_image_base64: str | None = None
    mask_url: str | None = None
    saved_paths: dict[str, str] | None = None
    tile_bounds: dict[str, float] | None = None


# Soil health linkage response for farm
from app.schemas.soil_health_card import SoilHealthCardRead, SoilRecommendationResponse  # noqa: E402


class FarmWithSoilHealth(FarmRead):
    soil_cards: list[SoilHealthCardRead] = []
    soil_report: SoilRecommendationResponse | None = None
