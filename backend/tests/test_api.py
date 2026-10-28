from datetime import datetime, timedelta, timezone


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_get_maharashtra_farmer(client):
    payload = {
        "name": "Tukaram Shinde",
        "phone_number": "9876543210",
        "aadhar_number": "123456789012",
        "gender": "Male",
        "state": "Maharashtra",
        "district": "Akola",
        "taluka": "Akola",
        "village": "Nimbhora",
        "pincode": "444001",
    }
    res = client.post("/api/v1/farmers", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Tukaram Shinde"
    assert data["state"] == "Maharashtra"
    farmer_id = data["id"]

    get_res = client.get(f"/api/v1/farmers/{farmer_id}")
    assert get_res.status_code == 200
    assert get_res.json()["district"] == "Akola"


def test_non_maharashtra_farmer_rejected(client):
    payload = {
        "name": "Ramesh Kumar",
        "phone_number": "9876543211",
        "aadhar_number": "999988887777",
        "gender": "Male",
        "state": "Gujarat",
        "district": "Surat",
        "taluka": "Choryasi",
        "village": "Adajan",
    }
    res = client.post("/api/v1/farmers", json=payload)
    assert res.status_code == 422


def test_create_farm_and_soil_report(client):
    # 1. Create Farmer
    farmer_payload = {
        "name": "Eknath Patil",
        "phone_number": "9123456789",
        "aadhar_number": "888877776666",
        "state": "Maharashtra",
        "district": "Beed",
        "taluka": "Beed",
        "village": "It",
    }
    farmer_res = client.post("/api/v1/farmers", json=farmer_payload)
    assert farmer_res.status_code == 201
    farmer_id = farmer_res.json()["id"]

    # 2. Add Soil Health Card for village It (code 559623 from shc.csv)
    shc_payload = {
        "year": "2024-25",
        "state_name": "Maharashtra",
        "state_code": 27,
        "district_name": "Beed",
        "district_code": 470,
        "block_name": "Beed",
        "block_code": 4323,
        "village_name": "It",
        "village_code": 559623,
        "nutrient_type": "Macro",
        "nutrient_name": "Soil Ph",
        "nutrient_level": "Acidic",
        "value": 5.8,
    }
    shc_res = client.post("/api/v1/soil-health", json=shc_payload)
    assert shc_res.status_code == 201

    # 3. Create Farm
    farm_payload = {
        "farmer_id": farmer_id,
        "farm_name": "Patil Shet 1",
        "survey_number": "Gat No 142",
        "total_area_acres": 4.5,
        "state": "Maharashtra",
        "district": "Beed",
        "district_code": 470,
        "taluka": "Beed",
        "block_code": 4323,
        "village": "It",
        "village_code": 559623,
        "soil_type": "Black Cotton Soil",
        "primary_crop": "Cotton",
    }
    farm_res = client.post("/api/v1/farms", json=farm_payload)
    assert farm_res.status_code == 201
    farm_id = farm_res.json()["id"]

    # 4. Request Farm Soil Report
    report_res = client.get(f"/api/v1/farms/{farm_id}/soil-report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["village_code"] == 559623
    assert len(report_data["soil_cards"]) >= 1
    assert report_data["soil_report"]["soil_ph_status"] == "Acidic"


def test_buyer_registration_and_auction_bidding_flow(client):
    # 1. Register a Farmer
    farmer_res = client.post(
        "/api/v1/farmers",
        json={
            "name": "Santosh Deshmukh",
            "phone_number": "9822001122",
            "aadhar_number": "555544443333",
            "district": "Akola",
            "taluka": "Akola",
            "village": "Nimbhora",
        },
    )
    assert farmer_res.status_code == 201
    farmer_id = farmer_res.json()["id"]

    # 2. Register Buyer 1 (APMC Trader)
    buyer1_res = client.post(
        "/api/v1/buyers",
        json={
            "company_name": "Maharashtra Agro Commodities Ltd",
            "contact_person": "Vikas Agarwal",
            "phone_number": "9422003344",
            "email": "vikas@agrocomm.com",
            "business_type": "APMC Trader",
            "city": "Akola",
            "district": "Akola",
            "state": "Maharashtra",
        },
    )
    assert buyer1_res.status_code == 201
    buyer1_id = buyer1_res.json()["id"]

    # 3. Register Buyer 2 (Food Processor)
    buyer2_res = client.post(
        "/api/v1/buyers",
        json={
            "company_name": "Vidarbha Cotton Mills",
            "contact_person": "Pravin Shah",
            "phone_number": "9422005566",
            "email": "shah@vidarbhacotton.com",
            "business_type": "Food Processor",
            "city": "Nagpur",
            "district": "Nagpur",
            "state": "Maharashtra",
        },
    )
    assert buyer2_res.status_code == 201
    buyer2_id = buyer2_res.json()["id"]

    # 4. Create Produce Auction (Cotton Lot)
    now = datetime.now(timezone.utc)
    start_time = (now - timedelta(minutes=5)).isoformat()
    end_time = (now + timedelta(hours=2)).isoformat()

    auction_payload = {
        "farmer_id": farmer_id,
        "title": "Prime Shankar-6 Bt Cotton Lot",
        "commodity_name": "Cotton",
        "category": "Cash Crops",
        "variety": "Shankar-6",
        "quantity": 100.0,
        "unit": "Quintal",
        "quality_grade": "Grade A",
        "base_price": 7000.0,  # ₹7,000 / quintal
        "reserve_price": 7200.0,  # ₹7,200 reserve
        "min_bid_increment": 100.0,
        "start_time": start_time,
        "end_time": end_time,
        "pickup_district": "Akola",
        "pickup_taluka": "Akola",
        "pickup_village": "Nimbhora",
    }
    auction_res = client.post("/api/v1/auctions", json=auction_payload)
    assert auction_res.status_code == 201
    auction_id = auction_res.json()["id"]
    assert auction_res.json()["status"] == "LIVE"

    # 5. Buyer 1 places initial valid bid at base price
    bid1_res = client.post(
        f"/api/v1/auctions/{auction_id}/bids",
        json={"buyer_id": buyer1_id, "bid_amount": 7000.0},
    )
    assert bid1_res.status_code == 201
    bid1_data = bid1_res.json()
    assert bid1_data["bid_amount"] == 7000.0
    assert bid1_data["total_value"] == 700000.0  # 100 * 7000
    assert bid1_data["minimum_next_bid"] == 7100.0

    # 6. Buyer 2 attempts underbid (₹7050 < ₹7100 required) -> Must fail
    underbid_res = client.post(
        f"/api/v1/auctions/{auction_id}/bids",
        json={"buyer_id": buyer2_id, "bid_amount": 7050.0},
    )
    assert underbid_res.status_code == 400

    # 7. Buyer 2 places valid outbid of ₹7300 (above reserve price too)
    bid2_res = client.post(
        f"/api/v1/auctions/{auction_id}/bids",
        json={"buyer_id": buyer2_id, "bid_amount": 7300.0},
    )
    assert bid2_res.status_code == 201
    assert bid2_res.json()["bid_amount"] == 7300.0

    # 8. Inspect auction details -> verify Buyer 1 was OUTBID and Buyer 2 is highest bidder
    detail_res = client.get(f"/api/v1/auctions/{auction_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["current_highest_bid"] == 7300.0
    assert detail["current_highest_bidder_id"] == buyer2_id
    assert len(detail["bids"]) == 2
    # Verify status of earlier bid is OUTBID
    bids = detail["bids"]
    assert any(b["buyer_id"] == buyer1_id and b["status"] == "OUTBID" for b in bids)

    # 9. Close Auction -> verify Buyer 2 declared winner with COMPLETED status
    close_res = client.post(f"/api/v1/auctions/{auction_id}/close")
    assert close_res.status_code == 200
    close_data = close_res.json()
    assert close_data["status"] == "COMPLETED"
    assert close_data["winning_buyer_id"] == buyer2_id
    assert close_data["final_price"] == 7300.0

    # 10. Check Buyer 2's won auctions endpoint
    won_res = client.get(f"/api/v1/buyers/{buyer2_id}/won-auctions")
    assert won_res.status_code == 200
    assert len(won_res.json()) == 1
    assert won_res.json()[0]["id"] == auction_id


def test_farm_segment_mask(client):
    payload = {
        "latitude": 20.7002,
        "longitude": 77.0082,
        "zoom": 17,
        "point_coords": [[128.0, 128.0]],
        "point_labels": [1],
        "gat_number": "Gat No. 142",
    }
    res = client.post("/api/v1/farms/segment-mask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["polygon_coordinates"]) >= 4
    assert data["area_acres"] > 0
    assert "geojson" in data
    assert data["overlay_image_base64"] is not None
    assert "saved_paths" in data
