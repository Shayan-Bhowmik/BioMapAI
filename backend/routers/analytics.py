from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer
from sqlalchemy.sql import extract
from datetime import datetime

from database import get_db
import models

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    # 1. Total Observations
    total_observations = db.query(models.Observation).count()
    
    # 2. Species Richness (Unique species)
    # Exclude nulls to ensure we only count identified species
    species_richness = db.query(func.count(func.distinct(models.Observation.species_scientific)))\
        .filter(models.Observation.species_scientific.isnot(None)).scalar() or 0

    return {
        "total_observations": total_observations,
        "species_richness": species_richness
    }

@router.get("/top-species")
def get_top_species(limit: int = 5, db: Session = Depends(get_db)):
    # Most-observed species
    results = db.query(
        models.Observation.species_common,
        models.Observation.species_scientific,
        func.count(models.Observation.id).label("count")
    )\
    .filter(models.Observation.species_scientific.isnot(None))\
    .group_by(models.Observation.species_common, models.Observation.species_scientific)\
    .order_by(func.count(models.Observation.id).desc())\
    .limit(limit)\
    .all()

    return [
        {
            "species_common": r.species_common,
            "species_scientific": r.species_scientific,
            "count": r.count
        } for r in results
    ]

@router.get("/seasonal-trends")
def get_seasonal_trends(db: Session = Depends(get_db)):
    # Group by month (1-12)
    # Note: Extracting 'month' works natively across most SQL dialects (Postgres, SQLite)
    results = db.query(
        extract('month', models.Observation.observed_at).label('month'),
        func.count(models.Observation.id).label('count')
    )\
    .group_by(extract('month', models.Observation.observed_at))\
    .order_by(extract('month', models.Observation.observed_at))\
    .all()

    # Map month numbers to names for frontend convenience
    month_names = {
        1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
    }

    return [
        {
            "month": month_names.get(int(r.month), "Unknown"),
            "month_num": int(r.month),
            "count": r.count
        } for r in results if r.month
    ]

@router.get("/density")
def get_observation_density(db: Session = Depends(get_db)):
    # Group by rough region by rounding lat/lng to 1 decimal place (~11km grid)
    # Using cast to Integer after multiplying by 10 is cross-db safe
    results = db.query(
        (cast(models.Observation.lat * 10, Integer) / 10.0).label("grid_lat"),
        (cast(models.Observation.lng * 10, Integer) / 10.0).label("grid_lng"),
        func.count(models.Observation.id).label("count")
    )\
    .group_by(
        cast(models.Observation.lat * 10, Integer) / 10.0,
        cast(models.Observation.lng * 10, Integer) / 10.0
    )\
    .all()

    return [
        {
            "lat": float(r.grid_lat),
            "lng": float(r.grid_lng),
            "count": r.count
        } for r in results
    ]
