"""Seed database with realistic initial Maharashtra agricultural data.
Auto-executed on FastAPI startup (including Render cold-starts) to ensure
all farmers, farms, soil health cards, buyers, auctions, and bids are populated.
"""

from datetime import datetime, timedelta, timezone
import json
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.buyer import Buyer
from app.models.auction import Auction, Bid
from app.models.soil_health_card import SoilHealthCard


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        # ── 1. BUYERS (APMC Licensed Traders & Processors) ────────────────────
        buyers_data = [
            {
                "company_name": "Akola Cotton Ginning & Pressing Pvt Ltd",
                "contact_person": "Rameshwar Agrawal",
                "phone_number": "9422112233",
                "email": "agrawal@akolaginning.com",
                "business_type": "APMC Licensed Trader",
                "city": "Akola",
                "district": "Akola",
                "state": "Maharashtra",
                "is_verified": True,
            },
            {
                "company_name": "Vidarbha Cotton Mills",
                "contact_person": "Suresh Agrawal",
                "phone_number": "9422114455",
                "email": "suresh@vidarbhamills.com",
                "business_type": "Spinning Mill",
                "city": "Wardha",
                "district": "Wardha",
                "state": "Maharashtra",
                "is_verified": True,
            },
            {
                "company_name": "Marathwada Solvents & Oil Industries",
                "contact_person": "Kiran Shah",
                "phone_number": "9823011223",
                "email": "kiran@marathwadasolvents.com",
                "business_type": "Oil Extraction & Processing",
                "city": "Jalna",
                "district": "Jalna",
                "state": "Maharashtra",
                "is_verified": True,
            },
            {
                "company_name": "Mumbai APMC Global Trading Co",
                "contact_person": "Harish Mehta",
                "phone_number": "9820055443",
                "email": "harish@mumbaiapmc.org",
                "business_type": "Wholesale Mandi Exporter",
                "city": "Navi Mumbai",
                "district": "Thane",
                "state": "Maharashtra",
                "is_verified": True,
            },
            {
                "company_name": "Khandesh Agro Processors",
                "contact_person": "Dinesh Patil",
                "phone_number": "9422778899",
                "email": "dinesh@khandeshagro.in",
                "business_type": "Food Processor",
                "city": "Dhule",
                "district": "Dhule",
                "state": "Maharashtra",
                "is_verified": True,
            },
            {
                "company_name": "Vidarbha Bio-Agri Corp",
                "contact_person": "Sunil Deshmukh",
                "phone_number": "9422445566",
                "email": "sunil@vidarbhabio.in",
                "business_type": "Organic Aggregator",
                "city": "Nagpur",
                "district": "Nagpur",
                "state": "Maharashtra",
                "is_verified": True,
            },
        ]

        seeded_buyers = {}
        for b_data in buyers_data:
            b = db.query(Buyer).filter_by(phone_number=b_data["phone_number"]).first()
            if not b:
                b = Buyer(**b_data)
                db.add(b)
                db.flush()
            seeded_buyers[b.company_name] = b
        db.commit()

        # ── 2. FARMERS & FARMS (Maharashtra Agronomic Profiles) ───────────────
        farmers_data = [
            {
                "farmer": {
                    "name": "तुकाराम पांडुरंग शिंदे (Tukaram Shinde)",
                    "phone_number": "9876543210",
                    "aadhar_number": "123456789012",
                    "gender": "Male",
                    "state": "Maharashtra",
                    "district": "Akola",
                    "taluka": "Akola",
                    "village": "Nimbhora",
                    "pincode": "444001",
                    "is_active": True,
                },
                "farm": {
                    "farm_name": "Gat No. 142 (कापूस शेत)",
                    "survey_number": "Gat No. 142",
                    "total_area_acres": 4.5,
                    "state": "Maharashtra",
                    "district": "Akola",
                    "district_code": 467,
                    "taluka": "Akola",
                    "block_code": 4291,
                    "village": "Nimbhora",
                    "village_code": 530013,
                    "soil_type": "Black Cotton Soil (काळी माती)",
                    "irrigation_type": "Drip Irrigation (ठिबक सिंचन)",
                    "primary_crop": "Cotton (कापूस)",
                    "latitude": 20.7002,
                    "longitude": 77.0082,
                    "boundary_geojson": json.dumps({
                        "type": "Polygon",
                        "coordinates": [[[77.006, 20.698], [77.010, 20.698], [77.010, 20.702], [77.006, 20.702], [77.006, 20.698]]]
                    }),
                },
                "nutrients": [
                    {"name": "Soil Ph", "level": "Neutral", "val": 7.4},
                    {"name": "Nitrogen", "level": "Low", "val": 185.0},
                    {"name": "Phosphorus", "level": "Medium", "val": 19.5},
                    {"name": "Potash", "level": "High", "val": 340.0},
                    {"name": "Zinc", "level": "Medium", "val": 0.82},
                    {"name": "Organic Carbon", "level": "Medium", "val": 0.52},
                ],
                "auction": {
                    "title": "Prime Shankar-6 Bt Cotton Lot (४.५ एकर कापूस)",
                    "commodity_name": "Cotton",
                    "category": "Cash Crops",
                    "variety": "Shankar-6",
                    "quantity": 65.0,
                    "unit": "Quintal",
                    "quality_grade": "Grade A",
                    "moisture_content_pct": 8.5,
                    "base_price": 7400.0,
                    "reserve_price": 7500.0,
                    "min_bid_increment": 50.0,
                    "current_highest_bid": 7650.0,
                    "buyer_lead": "Akola Cotton Ginning & Pressing Pvt Ltd",
                    "bids": [
                        ("Vidarbha Cotton Mills", 7450.0),
                        ("Mumbai APMC Global Trading Co", 7550.0),
                        ("Akola Cotton Ginning & Pressing Pvt Ltd", 7650.0),
                    ],
                },
            },
            {
                "farmer": {
                    "name": "गोपाळराव मारोती पाटील (Gopalrao Patil)",
                    "phone_number": "9876543211",
                    "aadhar_number": "234567890123",
                    "gender": "Male",
                    "state": "Maharashtra",
                    "district": "Amravati",
                    "taluka": "Morshi",
                    "village": "Morshi",
                    "pincode": "444905",
                    "is_active": True,
                },
                "farm": {
                    "farm_name": "Gat No. 89 (संतरा बाग)",
                    "survey_number": "Gat No. 89",
                    "total_area_acres": 6.0,
                    "state": "Maharashtra",
                    "district": "Amravati",
                    "district_code": 468,
                    "taluka": "Morshi",
                    "block_code": 4295,
                    "village": "Morshi",
                    "village_code": 530105,
                    "soil_type": "Medium Black Soil",
                    "irrigation_type": "Well Irrigation",
                    "primary_crop": "Orange (संतरा)",
                    "latitude": 21.3167,
                    "longitude": 78.0167,
                    "boundary_geojson": json.dumps({
                        "type": "Polygon",
                        "coordinates": [[[78.014, 21.314], [78.019, 21.314], [78.019, 21.319], [78.014, 21.319], [78.014, 21.314]]]
                    }),
                },
                "nutrients": [
                    {"name": "Soil Ph", "level": "Slightly Alkaline", "val": 7.8},
                    {"name": "Nitrogen", "level": "Medium", "val": 210.0},
                    {"name": "Phosphorus", "level": "High", "val": 24.0},
                    {"name": "Potash", "level": "High", "val": 380.0},
                    {"name": "Zinc", "level": "Adequate", "val": 0.95},
                ],
                "auction": {
                    "title": "Fresh Morshi Nagpur Orange (६ एकर संत्रा)",
                    "commodity_name": "Orange",
                    "category": "Fruits",
                    "variety": "Nagpur Mandarin",
                    "quantity": 120.0,
                    "unit": "Quintal",
                    "quality_grade": "Grade A (Export)",
                    "moisture_content_pct": 12.0,
                    "base_price": 4200.0,
                    "reserve_price": 4400.0,
                    "min_bid_increment": 50.0,
                    "current_highest_bid": 4550.0,
                    "buyer_lead": "Mumbai APMC Global Trading Co",
                    "bids": [
                        ("Khandesh Agro Processors", 4300.0),
                        ("Vidarbha Bio-Agri Corp", 4450.0),
                        ("Mumbai APMC Global Trading Co", 4550.0),
                    ],
                },
            },
            {
                "farmer": {
                    "name": "राजेश किसनराव कदम (Rajesh Kadam)",
                    "phone_number": "9876543212",
                    "aadhar_number": "345678901234",
                    "gender": "Male",
                    "state": "Maharashtra",
                    "district": "Nanded",
                    "taluka": "Loha",
                    "village": "Loha",
                    "pincode": "431708",
                    "is_active": True,
                },
                "farm": {
                    "farm_name": "Gat No. 204 (सोयाबीन प्लॉट)",
                    "survey_number": "Gat No. 204",
                    "total_area_acres": 5.2,
                    "state": "Maharashtra",
                    "district": "Nanded",
                    "district_code": 475,
                    "taluka": "Loha",
                    "block_code": 4350,
                    "village": "Loha",
                    "village_code": 535200,
                    "soil_type": "Deep Black Soil",
                    "irrigation_type": "Canal / Rainfed",
                    "primary_crop": "Soybean (सोयाबीन)",
                    "latitude": 18.9500,
                    "longitude": 77.1167,
                    "boundary_geojson": json.dumps({
                        "type": "Polygon",
                        "coordinates": [[[77.114, 18.948], [77.119, 18.948], [77.119, 18.953], [77.114, 18.953], [77.114, 18.948]]]
                    }),
                },
                "nutrients": [
                    {"name": "Soil Ph", "level": "Neutral", "val": 7.2},
                    {"name": "Nitrogen", "level": "Medium", "val": 195.0},
                    {"name": "Phosphorus", "level": "Medium", "val": 18.5},
                    {"name": "Potash", "level": "High", "val": 310.0},
                    {"name": "Sulfur", "level": "Medium", "val": 14.5},
                ],
                "auction": {
                    "title": "Certified Soybean MAUS-71 (५.२ एकर)",
                    "commodity_name": "Soybean",
                    "category": "Oilseeds",
                    "variety": "MAUS-71",
                    "quantity": 50.0,
                    "unit": "Quintal",
                    "quality_grade": "Grade A",
                    "moisture_content_pct": 9.2,
                    "base_price": 4800.0,
                    "reserve_price": 4900.0,
                    "min_bid_increment": 50.0,
                    "current_highest_bid": 5050.0,
                    "buyer_lead": "Marathwada Solvents & Oil Industries",
                    "bids": [
                        ("Khandesh Agro Processors", 4900.0),
                        ("Vidarbha Bio-Agri Corp", 4980.0),
                        ("Marathwada Solvents & Oil Industries", 5050.0),
                    ],
                },
            },
            {
                "farmer": {
                    "name": "बाळासाहेब गणपतराव पवार (Balasaheb Pawar)",
                    "phone_number": "9876543213",
                    "aadhar_number": "456789012345",
                    "gender": "Male",
                    "state": "Maharashtra",
                    "district": "Nashik",
                    "taluka": "Niphad",
                    "village": "Lasalgaon",
                    "pincode": "422306",
                    "is_active": True,
                },
                "farm": {
                    "farm_name": "Gat No. 67 (लाल कांदा शेत)",
                    "survey_number": "Gat No. 67",
                    "total_area_acres": 3.8,
                    "state": "Maharashtra",
                    "district": "Nashik",
                    "district_code": 478,
                    "taluka": "Niphad",
                    "block_code": 4380,
                    "village": "Lasalgaon",
                    "village_code": 538100,
                    "soil_type": "Red Loam Soil",
                    "irrigation_type": "Micro Sprinkler",
                    "primary_crop": "Onion (कांदा)",
                    "latitude": 20.1472,
                    "longitude": 74.2256,
                    "boundary_geojson": json.dumps({
                        "type": "Polygon",
                        "coordinates": [[[74.223, 20.145], [74.228, 20.145], [74.228, 20.150], [74.223, 20.150], [74.223, 20.145]]]
                    }),
                },
                "nutrients": [
                    {"name": "Soil Ph", "level": "Slightly Acidic", "val": 6.8},
                    {"name": "Nitrogen", "level": "Medium", "val": 225.0},
                    {"name": "Phosphorus", "level": "High", "val": 26.0},
                    {"name": "Potash", "level": "Medium", "val": 290.0},
                    {"name": "Boron", "level": "Adequate", "val": 0.65},
                ],
                "auction": {
                    "title": "Lasalgaon Red Onion Lot (३.८ एकर कांदा)",
                    "commodity_name": "Onion",
                    "category": "Vegetables",
                    "variety": "Garva Red",
                    "quantity": 80.0,
                    "unit": "Quintal",
                    "quality_grade": "Super Medium",
                    "moisture_content_pct": 14.0,
                    "base_price": 2100.0,
                    "reserve_price": 2250.0,
                    "min_bid_increment": 25.0,
                    "current_highest_bid": 2380.0,
                    "buyer_lead": "Mumbai APMC Global Trading Co",
                    "bids": [
                        ("Khandesh Agro Processors", 2200.0),
                        ("Mumbai APMC Global Trading Co", 2380.0),
                    ],
                },
            },
            {
                "farmer": {
                    "name": "विष्णू सखाराम जाधवर (Vishnu Jadhavar)",
                    "phone_number": "9876543214",
                    "aadhar_number": "567890123456",
                    "gender": "Male",
                    "state": "Maharashtra",
                    "district": "Jalna",
                    "taluka": "Ambad",
                    "village": "Ambad",
                    "pincode": "431205",
                    "is_active": True,
                },
                "farm": {
                    "farm_name": "Gat No. 312 (तूर शेत)",
                    "survey_number": "Gat No. 312",
                    "total_area_acres": 4.0,
                    "state": "Maharashtra",
                    "district": "Jalna",
                    "district_code": 472,
                    "taluka": "Ambad",
                    "block_code": 4320,
                    "village": "Ambad",
                    "village_code": 532150,
                    "soil_type": "Sandy Loam Soil",
                    "irrigation_type": "Rainfed + Farm Pond",
                    "primary_crop": "Tur Dal (तूर)",
                    "latitude": 19.6100,
                    "longitude": 75.7900,
                    "boundary_geojson": json.dumps({
                        "type": "Polygon",
                        "coordinates": [[[75.788, 19.608], [75.793, 19.608], [75.793, 19.613], [75.788, 19.613], [75.788, 19.608]]]
                    }),
                },
                "nutrients": [
                    {"name": "Soil Ph", "level": "Neutral", "val": 7.5},
                    {"name": "Nitrogen", "level": "Low", "val": 172.0},
                    {"name": "Phosphorus", "level": "Medium", "val": 16.5},
                    {"name": "Potash", "level": "High", "val": 320.0},
                ],
                "auction": {
                    "title": "Marathwada White Tur BDN-711 (४ एकर)",
                    "commodity_name": "Tur",
                    "category": "Pulses",
                    "variety": "BDN-711",
                    "quantity": 35.0,
                    "unit": "Quintal",
                    "quality_grade": "Grade A",
                    "moisture_content_pct": 10.0,
                    "base_price": 7100.0,
                    "reserve_price": 7250.0,
                    "min_bid_increment": 50.0,
                    "current_highest_bid": 7350.0,
                    "buyer_lead": "Marathwada Solvents & Oil Industries",
                    "bids": [
                        ("Vidarbha Bio-Agri Corp", 7200.0),
                        ("Marathwada Solvents & Oil Industries", 7350.0),
                    ],
                },
            },
            {
                "farmer": {
                    "name": "संभाजी संभाजीराव देशमुख (Sambhaji Deshmukh)",
                    "phone_number": "9876543215",
                    "aadhar_number": "678901234567",
                    "gender": "Male",
                    "state": "Maharashtra",
                    "district": "Latur",
                    "taluka": "Ausa",
                    "village": "Ausa",
                    "pincode": "413520",
                    "is_active": True,
                },
                "farm": {
                    "farm_name": "Gat No. 178 (सोयाबीन JS-335)",
                    "survey_number": "Gat No. 178",
                    "total_area_acres": 5.5,
                    "state": "Maharashtra",
                    "district": "Latur",
                    "district_code": 476,
                    "taluka": "Ausa",
                    "block_code": 4360,
                    "village": "Ausa",
                    "village_code": 536300,
                    "soil_type": "Heavy Clay Soil",
                    "irrigation_type": "Drip Irrigation",
                    "primary_crop": "Soybean (सोयाबीन)",
                    "latitude": 18.2500,
                    "longitude": 76.5000,
                    "boundary_geojson": json.dumps({
                        "type": "Polygon",
                        "coordinates": [[[76.498, 18.248], [76.503, 18.248], [76.503, 18.253], [76.498, 18.253], [76.498, 18.248]]]
                    }),
                },
                "nutrients": [
                    {"name": "Soil Ph", "level": "Neutral", "val": 7.3},
                    {"name": "Nitrogen", "level": "Medium", "val": 202.0},
                    {"name": "Phosphorus", "level": "Medium", "val": 20.0},
                    {"name": "Potash", "level": "High", "val": 360.0},
                ],
                "auction": {
                    "title": "High-Yield Soybean JS-335 (५.५ एकर)",
                    "commodity_name": "Soybean",
                    "category": "Oilseeds",
                    "variety": "JS-335",
                    "quantity": 75.0,
                    "unit": "Quintal",
                    "quality_grade": "Grade A",
                    "moisture_content_pct": 8.8,
                    "base_price": 4600.0,
                    "reserve_price": 4750.0,
                    "min_bid_increment": 50.0,
                    "current_highest_bid": 4850.0,
                    "buyer_lead": "Khandesh Agro Processors",
                    "bids": [
                        ("Marathwada Solvents & Oil Industries", 4750.0),
                        ("Khandesh Agro Processors", 4850.0),
                    ],
                },
            },
        ]

        # ── 3. SEED FARMERS, FARMS, SHC & AUCTIONS ───────────────────────────
        for item in farmers_data:
            # Farmer
            f_info = item["farmer"]
            farmer = db.query(Farmer).filter_by(aadhar_number=f_info["aadhar_number"]).first()
            if not farmer:
                farmer = Farmer(**f_info)
                db.add(farmer)
                db.flush()

            # Farm
            farm_info = item["farm"]
            farm = db.query(Farm).filter_by(farmer_id=farmer.id).first()
            if not farm:
                farm = Farm(farmer_id=farmer.id, **farm_info)
                db.add(farm)
                db.flush()

            # Soil Health Cards
            shc_count = db.query(SoilHealthCard).filter_by(village_code=farm.village_code).count()
            if shc_count == 0:
                for nut in item["nutrients"]:
                    shc = SoilHealthCard(
                        year="2024-25",
                        state_name=farm.state,
                        state_code=27,
                        district_name=farm.district,
                        district_code=farm.district_code,
                        block_name=farm.taluka,
                        block_code=farm.block_code,
                        village_name=farm.village,
                        village_code=farm.village_code,
                        nutrient_type="Macro" if nut["name"] in ["Soil Ph", "Nitrogen", "Phosphorus", "Potash"] else "Micro",
                        nutrient_name=nut["name"],
                        nutrient_level=nut["level"],
                        value=nut["val"],
                        farm_id=farm.id,
                    )
                    db.add(shc)

            # Auction & Bids
            auc_info = item["auction"]
            auction = db.query(Auction).filter_by(farmer_id=farmer.id, title=auc_info["title"]).first()
            if not auction:
                lead_buyer = seeded_buyers.get(auc_info["buyer_lead"])
                auction = Auction(
                    farmer_id=farmer.id,
                    farm_id=farm.id,
                    title=auc_info["title"],
                    commodity_name=auc_info["commodity_name"],
                    category=auc_info["category"],
                    variety=auc_info["variety"],
                    quantity=auc_info["quantity"],
                    unit=auc_info["unit"],
                    quality_grade=auc_info["quality_grade"],
                    moisture_content_pct=auc_info["moisture_content_pct"],
                    base_price=auc_info["base_price"],
                    reserve_price=auc_info["reserve_price"],
                    min_bid_increment=auc_info["min_bid_increment"],
                    current_highest_bid=auc_info["current_highest_bid"],
                    current_highest_bidder_id=lead_buyer.id if lead_buyer else None,
                    start_time=now - timedelta(minutes=45),
                    end_time=now + timedelta(minutes=15),
                    status="LIVE",
                    pickup_district=farm.district,
                    pickup_taluka=farm.taluka,
                    pickup_village=farm.village,
                )
                db.add(auction)
                db.flush()

                # Add historical bids
                for b_comp_name, b_val in auc_info["bids"]:
                    bidder = seeded_buyers.get(b_comp_name)
                    if bidder:
                        bid = Bid(
                            auction_id=auction.id,
                            buyer_id=bidder.id,
                            bid_amount=b_val,
                            total_value=auc_info["quantity"] * b_val,
                            status="ACCEPTED" if b_val == auc_info["current_highest_bid"] else "OUTBID",
                        )
                        db.add(bid)

        db.commit()
        print(f"Kissanmart database successfully seeded with {len(farmers_data)} farmers, farms, and live APMC auctions.")

    except Exception as e:
        db.rollback()
        print(f"Database seed notice (non-fatal): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
