from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class BidBase(BaseModel):
    bid_amount: float = Field(..., gt=0.0, description="Bid price per unit (INR)")


class BidCreate(BidBase):
    buyer_id: int = Field(..., description="ID of bidding buyer")


class BidRead(BidBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    auction_id: int
    buyer_id: int
    total_value: float
    status: str
    created_at: datetime


class AuctionBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Auction title (e.g. Organic Bt Cotton Lot)")
    commodity_name: str = Field(..., min_length=2, max_length=100, description="Commodity (e.g. Cotton, Soybean, Onion)")
    category: str = Field(..., min_length=2, max_length=100, description="Category (e.g. Cash Crops, Oilseeds, Vegetables)")
    variety: str | None = Field(None, max_length=100, description="Crop variety (e.g. JS-335, Shankar-6)")
    quantity: float = Field(..., gt=0.0, description="Total quantity being sold")
    unit: str = Field(default="Quintal", max_length=20, description="Quintal, Kg, Ton, Bag")
    quality_grade: str = Field(default="FAQ", max_length=50, description="Grade A, Grade B, FAQ")
    moisture_content_pct: float | None = Field(None, ge=0.0, le=100.0, description="Moisture percentage")

    base_price: float = Field(..., gt=0.0, description="Minimum starting bid price per unit (INR)")
    reserve_price: float | None = Field(None, gt=0.0, description="Confidential reserve price")
    min_bid_increment: float = Field(default=50.0, gt=0.0, description="Minimum bid step increment")

    start_time: datetime = Field(..., description="Auction start timestamp")
    end_time: datetime = Field(..., description="Auction end timestamp")

    pickup_district: str = Field(..., min_length=2, max_length=100, description="District where produce is stored")
    pickup_taluka: str | None = Field(None, max_length=100)
    pickup_village: str | None = Field(None, max_length=100)

    @model_validator(mode="after")
    def validate_dates_and_prices(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be strictly after start_time.")
        if self.reserve_price is not None and self.reserve_price < self.base_price:
            raise ValueError("reserve_price cannot be lower than base_price.")
        return self


class AuctionCreate(AuctionBase):
    farmer_id: int = Field(..., description="Farmer selling the produce")
    farm_id: int | None = Field(None, description="Optional farm parcel origin")


class AuctionUpdate(BaseModel):
    title: str | None = None
    variety: str | None = None
    quantity: float | None = Field(None, gt=0.0)
    base_price: float | None = Field(None, gt=0.0)
    reserve_price: float | None = Field(None, gt=0.0)
    min_bid_increment: float | None = Field(None, gt=0.0)
    end_time: datetime | None = None
    pickup_district: str | None = None
    pickup_taluka: str | None = None
    pickup_village: str | None = None
    status: str | None = None


class AuctionRead(AuctionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    farmer_id: int
    farm_id: int | None = None
    current_highest_bid: float | None = None
    current_highest_bidder_id: int | None = None
    winning_bid_id: int | None = None
    final_price: float | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None


class AuctionDetail(AuctionRead):
    bids: list[BidRead] = []
    farmer_name: str | None = None
    current_highest_bidder_name: str | None = None


class PlaceBidResponse(BaseModel):
    message: str
    bid_id: int
    auction_id: int
    buyer_id: int
    bid_amount: float
    total_value: float
    status: str
    previous_highest_bid: float | None = None
    minimum_next_bid: float


class CloseAuctionResponse(BaseModel):
    auction_id: int
    status: str  # COMPLETED or UNSOLD
    final_price: float | None = None
    winning_buyer_id: int | None = None
    winning_bid_id: int | None = None
    total_bids_received: int
    message: str

