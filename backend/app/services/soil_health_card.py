import csv
import os
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import select, func, distinct
from fastapi import HTTPException, status

from app.models.soil_health_card import SoilHealthCard
from app.schemas.soil_health_card import (
    SoilHealthCardCreate,
    SoilHealthCardUpdate,
    NutrientDetail,
    VillageSoilSummary,
    SoilRecommendationResponse,
    CSVImportResponse,
)


def get_soil_record(db: Session, record_id: int) -> SoilHealthCard | None:
    return db.get(SoilHealthCard, record_id)


def list_soil_records(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    farm_id: int | None = None,
    district_name: str | None = None,
    block_name: str | None = None,
    village_code: int | None = None,
    nutrient_type: str | None = None,
    nutrient_name: str | None = None,
    nutrient_level: str | None = None,
) -> tuple[list[SoilHealthCard], int]:
    # Strictly filter for Maharashtra
    stmt = select(SoilHealthCard).where(
        SoilHealthCard.state_name == "Maharashtra",
        SoilHealthCard.state_code == 27,
    )

    if farm_id is not None:
        stmt = stmt.where(SoilHealthCard.farm_id == farm_id)
    if district_name:
        stmt = stmt.where(SoilHealthCard.district_name.ilike(f"%{district_name.strip()}%"))
    if block_name:
        stmt = stmt.where(SoilHealthCard.block_name.ilike(f"%{block_name.strip()}%"))
    if village_code is not None:
        stmt = stmt.where(SoilHealthCard.village_code == village_code)
    if nutrient_type:
        stmt = stmt.where(SoilHealthCard.nutrient_type.ilike(nutrient_type.strip()))
    if nutrient_name:
        stmt = stmt.where(SoilHealthCard.nutrient_name.ilike(f"%{nutrient_name.strip()}%"))
    if nutrient_level:
        stmt = stmt.where(SoilHealthCard.nutrient_level.ilike(nutrient_level.strip()))

    total = len(db.execute(stmt).scalars().all())
    records = db.execute(stmt.order_by(SoilHealthCard.id.asc()).offset(skip).limit(limit)).scalars().all()
    return list(records), total


def create_soil_record(db: Session, payload: SoilHealthCardCreate) -> SoilHealthCard:
    record_data = payload.model_dump()
    record_data["state_name"] = "Maharashtra"
    record_data["state_code"] = 27

    record = SoilHealthCard(**record_data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_soil_record(db: Session, record: SoilHealthCard, payload: SoilHealthCardUpdate) -> SoilHealthCard:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    record.state_name = "Maharashtra"
    record.state_code = 27

    db.commit()
    db.refresh(record)
    return record


def delete_soil_record(db: Session, record: SoilHealthCard) -> None:
    db.delete(record)
    db.commit()


def get_village_soil_summary(db: Session, village_code: int) -> VillageSoilSummary:
    records, total = list_soil_records(db, village_code=village_code, limit=500)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Soil Health Card records found for Maharashtra village code {village_code}",
        )

    first = records[0]
    macro_nutrients: list[NutrientDetail] = []
    micro_nutrients: list[NutrientDetail] = []
    critical_deficiencies: list[str] = []

    for r in records:
        level_lower = r.nutrient_level.strip().lower()

        # Determine health status
        if level_lower in ["deficient", "low", "acidic", "alkaline"]:
            status_desc = "Deficient"
            critical_deficiencies.append(f"{r.nutrient_name} ({r.nutrient_level})")
        elif level_lower in ["sufficient", "medium", "neutral", "non saline"]:
            status_desc = "Optimal"
        elif level_lower in ["high", "saline"]:
            status_desc = "High / Saline"
        else:
            status_desc = r.nutrient_level

        item = NutrientDetail(
            nutrient_name=r.nutrient_name,
            nutrient_type=r.nutrient_type,
            level=r.nutrient_level,
            value=r.value,
            status=status_desc,
        )

        if r.nutrient_type.strip().lower() == "macro":
            macro_nutrients.append(item)
        else:
            micro_nutrients.append(item)

    return VillageSoilSummary(
        village_code=village_code,
        village_name=first.village_name,
        block_name=first.block_name,
        district_name=first.district_name,
        state_name="Maharashtra",
        year=first.year,
        total_records=total,
        macro_nutrients=macro_nutrients,
        micro_nutrients=micro_nutrients,
        critical_deficiencies=list(set(critical_deficiencies)),
    )


def generate_soil_recommendations(
    records: list[SoilHealthCard],
    village_code: int,
    village_name: str,
    district_name: str,
    primary_crop: str | None = None,
) -> SoilRecommendationResponse:
    """Generates agronomic fertilizer advice and suitable crops based on soil nutrients in Maharashtra."""
    deficient_nutrients = []
    soil_ph_status = "Neutral"
    recommendations = []
    suitable_crops = []
    general_advice = []

    for r in records:
        n_name = r.nutrient_name.strip().title()
        n_level = r.nutrient_level.strip().lower()

        if n_name == "Soil Ph":
            soil_ph_status = r.nutrient_level.capitalize()
            if "acid" in n_level:
                recommendations.append("Apply agricultural lime / dolomite at 200-300 kg/acre to neutralize soil acidity.")
            elif "alkali" in n_level:
                recommendations.append("Apply agricultural gypsum at 400-500 kg/acre and incorporate organic green manure.")

        if n_name == "Nitrogen" and n_level == "low":
            deficient_nutrients.append("Nitrogen (Low)")
            recommendations.append("Top-dress with Urea / Neem-coated Urea split into 2-3 doses along with Cow dung compost/FYM.")

        if n_name == "Phosphorus" and n_level == "low":
            deficient_nutrients.append("Phosphorus (Low)")
            recommendations.append("Apply Single Super Phosphate (SSP) or DAP at basal sowing stage; add PSB (Phosphate Solubilizing Bacteria).")

        if n_name == "Potassium" and n_level == "low":
            deficient_nutrients.append("Potassium (Low)")
            recommendations.append("Apply Muriate of Potash (MOP) at 30-50 kg/acre to boost drought tolerance and crop quality.")

        if n_name == "Zinc" and n_level == "deficient":
            deficient_nutrients.append("Zinc (Deficient)")
            recommendations.append("Apply Zinc Sulphate (21%) at 10 kg/acre to soil or foliar spray 0.5% ZnSO4 during vegetative stage.")

        if n_name == "Iron" and n_level == "deficient":
            deficient_nutrients.append("Iron (Deficient)")
            recommendations.append("Apply Ferrous Sulphate (FeSO4) at 10-15 kg/acre with organic compost to prevent chlorosis (yellowing).")

        if n_name == "Boron" and n_level == "deficient":
            deficient_nutrients.append("Boron (Deficient)")
            recommendations.append("Foliar spray Borax / Solubor (0.15%) at flowering stage to enhance fruit/pod setting.")

        if n_name == "Sulphur" and n_level == "deficient":
            deficient_nutrients.append("Sulphur (Deficient)")
            recommendations.append("Apply Bensulf / Gypsum at 15-20 kg/acre, especially critical for oilseeds (Soybean, Groundnut).")

    # Crop suitability based on Maharashtra soil characteristics (Black / Regur / Loam)
    if "alkali" in soil_ph_status.lower():
        suitable_crops = ["Cotton (Kapus)", "Pigeon Pea (Tur)", "Sorghum (Jowar)", "Barley"]
    elif "acid" in soil_ph_status.lower():
        suitable_crops = ["Paddy (Rice)", "Tea", "Cashew", "Millets (Ragi/Nachni)"]
    else:
        suitable_crops = ["Soybean", "Cotton (Bt Kapus)", "Sugarcane", "Onion (Kanda)", "Gram (Harbhara)", "Pomegranate"]

    if primary_crop:
        general_advice.append(f"Target crop: {primary_crop}. Ensure balanced N:P:K ratio (typically 4:2:1 or as per MPKV Rahuri / PDKV Akola guidelines).")
    general_advice.append("Integrate Jeevamrit or vermicompost (2 tonnes/acre) to improve soil organic carbon (SOC) and microbial activity.")
    general_advice.append("Practice crop rotation with legumes (Gram, Soybean, Tur) to fix atmospheric nitrogen naturally.")

    return SoilRecommendationResponse(
        village_code=village_code,
        village_name=village_name,
        district_name=district_name,
        soil_ph_status=soil_ph_status,
        deficient_nutrients=list(set(deficient_nutrients)),
        fertilizer_recommendations=list(set(recommendations)),
        suitable_crops_for_soil=suitable_crops,
        general_advice=general_advice,
    )


def list_maharashtra_districts(db: Session) -> list[str]:
    """Returns all unique Maharashtra districts present in Soil Health Card records."""
    stmt = (
        select(distinct(SoilHealthCard.district_name))
        .where(SoilHealthCard.state_name == "Maharashtra")
        .order_by(SoilHealthCard.district_name.asc())
    )
    results = db.execute(stmt).scalars().all()
    return list(results)


def import_shc_from_csv(
    db: Session,
    csv_file_path: str = "shc.csv",
    max_rows: int | None = 10000,
    district_filter: str | None = None,
) -> CSVImportResponse:
    """Streams rows from shc.csv and loads only Maharashtra records into the database."""
    if not os.path.exists(csv_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CSV file not found at path '{csv_file_path}'.",
        )

    imported_count = 0
    skipped_count = 0
    total_processed = 0

    batch_size = 1000
    batch: list[SoilHealthCard] = []

    with open(csv_file_path, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)

        for row in reader:
            total_processed += 1

            # Strictly enforce Maharashtra filter
            state_name = row.get("state_name", "").strip()
            state_code_str = row.get("state_code", "").strip()

            if state_name.lower() != "maharashtra" and state_code_str != "27":
                skipped_count += 1
                continue

            # District filter if provided
            district = row.get("district_name", "").strip()
            if district_filter and district.lower() != district_filter.strip().lower():
                skipped_count += 1
                continue

            try:
                card = SoilHealthCard(
                    id=int(row["id"]) if row.get("id") else None,
                    year=row.get("year", "2024-25"),
                    state_name="Maharashtra",
                    state_code=27,
                    district_name=district,
                    district_code=int(row["district_code"]) if row.get("district_code") else None,
                    block_name=row.get("block_name", "").strip(),
                    block_code=int(row["block_code"]) if row.get("block_code") else None,
                    village_name=row.get("village_name", "").strip(),
                    village_code=int(row["village_code"]) if row.get("village_code") else 0,
                    nutrient_type=row.get("nutrient_type", "").strip(),
                    nutrient_name=row.get("nutrient_name", "").strip(),
                    nutrient_level=row.get("nutrient_level", "").strip(),
                    value=float(row.get("value", 0.0) or 0.0),
                )
                batch.append(card)
                imported_count += 1

                if len(batch) >= batch_size:
                    db.bulk_save_objects(batch)
                    db.commit()
                    batch.clear()

            except (ValueError, KeyError):
                skipped_count += 1
                continue

            if max_rows and imported_count >= max_rows:
                break

    if batch:
        db.bulk_save_objects(batch)
        db.commit()
        batch.clear()

    return CSVImportResponse(
        status="success",
        message=f"Successfully imported {imported_count} Maharashtra Soil Health Card records.",
        imported_count=imported_count,
        skipped_count=skipped_count,
        total_processed=total_processed,
    )

