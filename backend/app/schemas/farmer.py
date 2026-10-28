from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re


def validate_maharashtra(val: str) -> str:
    if val.strip().lower() != "maharashtra":
        raise ValueError("Only Maharashtra state is supported in this system.")
    return "Maharashtra"


class FarmerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full name of farmer")
    phone_number: str = Field(..., description="10-digit mobile number")
    aadhar_number: str = Field(..., description="12-digit Aadhaar number")
    gender: str | None = Field(None, description="Gender (Male/Female/Other)")
    state: str = Field(default="Maharashtra", description="State (Strictly Maharashtra)")
    district: str = Field(..., min_length=2, max_length=100, description="Maharashtra District (e.g. Pune, Akola, Beed)")
    taluka: str = Field(..., min_length=2, max_length=100, description="Taluka / Block")
    village: str = Field(..., min_length=2, max_length=100, description="Village name")
    pincode: str | None = Field(None, max_length=10, description="6-digit postal code")

    @field_validator("state")
    @classmethod
    def check_state(cls, v: str) -> str:
        return validate_maharashtra(v)

    @field_validator("phone_number")
    @classmethod
    def check_phone(cls, v: str) -> str:
        clean = re.sub(r"[^\d]", "", v)
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        if len(clean) != 10:
            raise ValueError("Phone number must be a valid 10-digit Indian mobile number.")
        return clean

    @field_validator("aadhar_number")
    @classmethod
    def check_aadhar(cls, v: str) -> str:
        clean = re.sub(r"[^\d]", "", v)
        if len(clean) != 12:
            raise ValueError("Aadhaar number must contain exactly 12 digits.")
        return clean


class FarmerCreate(FarmerBase):
    pass


class FarmerUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    phone_number: str | None = None
    gender: str | None = None
    district: str | None = None
    taluka: str | None = None
    village: str | None = None
    pincode: str | None = None
    is_active: bool | None = None

    @field_validator("phone_number")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = re.sub(r"[^\d]", "", v)
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        if len(clean) != 10:
            raise ValueError("Phone number must be 10 digits.")
        return clean


class FarmerRead(FarmerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


# Forward reference for farmer with embedded farms
from app.schemas.farm import FarmRead  # noqa: E402


class FarmerWithFarms(FarmerRead):
    farms: list[FarmRead] = []

