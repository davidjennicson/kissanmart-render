# Kissanmart Maharashtra AgriTech & Auction Platform

FastAPI backend with clean architecture supporting:
- **Farmers (Maharashtra)**
- **Farms (with Soil Health Card linkages)**
- **Soil Health Cards (Dataset: `shc.csv` - Maharashtra State Code 27)**
- **Buyers / APMC Traders**
- **Produce Auctions & Live Bidding Engine**

---

## Architecture Overview

```text
backend/app/
├── api/
│   ├── deps.py                    # SessionDep & common dependencies
│   └── v1/
│       ├── api.py                 # Central v1 router registry
│       └── endpoints/
│           ├── health.py          # GET /health
│           ├── farmers.py         # Farmers CRUD & farm profiles
│           ├── farms.py           # Farms CRUD & Soil Health Report
│           ├── soil_health.py     # SHC dataset queries & CSV streaming import
│           ├── buyers.py          # Buyers CRUD & won auctions
│           └── auctions.py        # Auctions & live bidding engine
├── core/
│   └── config.py                  # Pydantic Settings & environment variables
├── db/
│   ├── base.py                    # DeclarativeBase definition
│   └── session.py                 # Engine and SessionLocal
├── models/
│   ├── farmer.py                  # Farmer model (Maharashtra)
│   ├── farm.py                    # Farm parcel model (links to village_code)
│   ├── soil_health_card.py        # SoilHealthCard model (matches shc.csv)
│   ├── buyer.py                   # Buyer / Trader model
│   └── auction.py                 # Auction & Bid models
├── schemas/
│   ├── farmer.py                  # Farmer validation schemas
│   ├── farm.py                    # Farm validation schemas
│   ├── soil_health_card.py        # Soil health, village summary & recommendations
│   ├── buyer.py                   # Buyer validation schemas
│   └── auction.py                 # Auction, Bids & settlement response schemas
├── services/
│   ├── farmer.py                  # Farmer service logic
│   ├── farm.py                    # Farm service & soil advisory logic
│   ├── soil_health_card.py        # SHC queries, village grouping & CSV seeding
│   ├── buyer.py                   # Buyer service logic
│   └── auction.py                 # Bidding engine, outbid logic & settlement
└── main.py                        # FastAPI entrypoint, CORS & startup lifespan
```

---

## API Endpoints Summary

### Buyers (`/api/v1/buyers`)
- `GET /api/v1/buyers`: List buyers with search and district/business type filters.
- `POST /api/v1/buyers`: Register a buyer (validates phone, PAN, GSTIN).
- `GET /api/v1/buyers/{id}`: Get buyer profile and active bids.
- `GET /api/v1/buyers/{id}/bids`: Get all bids placed by buyer.
- `GET /api/v1/buyers/{id}/won-auctions`: Get all auctions won by buyer.
- `PUT /api/v1/buyers/{id}`: Update profile or KYC.
- `DELETE /api/v1/buyers/{id}`: Remove buyer.

### Produce Auctions (`/api/v1/auctions`)
- `GET /api/v1/auctions`: List auctions with status (`LIVE`, `UPCOMING`, `COMPLETED`), commodity, district, and price filters.
- `POST /api/v1/auctions`: List a produce lot for auction with base price, reserve price, increment, and start/end dates.
- `GET /api/v1/auctions/{id}`: Live auction details with chronological bid leaderboard.
- `POST /api/v1/auctions/{id}/bids`: **Place a live bid**:
  - Enforces `LIVE` status.
  - Enforces `bid >= base_price` and `bid >= current_highest_bid + min_bid_increment`.
  - Automatically transitions prior highest bids to `OUTBID`.
  - Prevents farmers from bidding on their own lots.
- `POST /api/v1/auctions/{id}/close`: **Finalize auction**:
  - Evaluates highest bid against reserve price.
  - Marks winner and status `COMPLETED` (or `UNSOLD`).
- `POST /api/v1/auctions/{id}/cancel`: Cancel active/upcoming auction.

### Farmers & Farms (`/api/v1/farmers`, `/api/v1/farms`)
- Strict Maharashtra boundary validation (`state == "Maharashtra"`).
- Farm soil reports (`GET /api/v1/farms/{id}/soil-report`) providing fertilizer dosages and crop advice based on `shc.csv` records.

### Soil Health Cards (`/api/v1/soil-health`)
- `GET /api/v1/soil-health/village/{village_code}/summary`: Village-level Macro/Micro nutrient analysis and critical deficiencies.
- `POST /api/v1/soil-health/import-csv`: Streaming importer for `shc.csv`.
