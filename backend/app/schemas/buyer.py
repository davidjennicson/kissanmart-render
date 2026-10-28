from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, EmailStr
import re


class BuyerBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255, description="Business or Company Name")
    contact_person: str = Field(..., min_length=2, max_length=255, description="Primary representative")
    phone_number: str = Field(..., description="10-digit mobile number")
    email: EmailStr | None = Field(None, description="Official email address")

    pan_number: str | None = Field(None, description="10-character PAN number (e.g. ABCDE1234F)")
    gst_number: str | None = Field(None, description="15-character GSTIN")
    license_number: str | None = Field(None, description="APMC / Mandi Trader License")
    business_type: str = Field(
        default="Wholesaler",
        description="Wholesaler, APMC Trader, Retailer, Food Processor, Exporter",
    )

    address: str | None = Field(None, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field(default="Maharashtra", max_length=50)
    pincode: str | None = Field(None, max_length=10)

    @field_validator("phone_number")
    @classmethod
    def check_phone(cls, v: str) -> str:
        clean = re.sub(r"[^\d]", "", v)
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        if len(clean) != 10:
            raise ValueError("Phone number must be a valid 10-digit Indian mobile number.")
        return clean

    @field_validator("pan_number")
    @classmethod
    def check_pan(cls, v: str | None) -> str | None:
        if not v:
            return None
        clean = v.strip().upper()
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", clean):
            raise ValueError("Invalid PAN format. Must be 5 uppercase letters, 4 digits, 1 uppercase letter.")
        return clean

    @field_validator("gst_number")
    @classmethod
    def check_gst(cls, v: str | None) -> str | None:
        if not v:
            return None
        clean = v.strip().upper()
        if not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", clean):
            raise ValueError("Invalid GSTIN format.")
        return clean


class BuyerCreate(BuyerBase):
    pass


class BuyerUpdate(BaseModel):
    company_name: str | None = None
    contact_person: str | None = None
    phone_number: str | None = None
    email: EmailStr | None = None
    pan_number: str | None = None
    gst_number: str | None = None
    license_number: str | None = None
    business_type: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    is_verified: bool | None = None
    is_active: bool | None = None


class BuyerRead(BuyerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


# Embedded bids forward declaration
from app.schemas.auction import BidRead  # noqa: E402


class BuyerWithBids(BuyerRead):
    bids: list[BidRead] = []

