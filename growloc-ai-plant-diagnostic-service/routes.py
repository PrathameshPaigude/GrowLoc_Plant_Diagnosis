"""API routes for plant management, scan history, and comparative analysis."""

from __future__ import annotations

import datetime
import os
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Plant, Scan

router = APIRouter(prefix="/api", tags=["plants"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class PlantCreate(BaseModel):
    name: str = "Unknown Plant"
    species: str = "Unknown"

class PlantUpdate(BaseModel):
    name: str | None = None
    species: str | None = None


class PlantOut(BaseModel):
    id: str
    name: str
    species: str
    created_at: datetime.datetime
    total_scans: int

    class Config:
        from_attributes = True


class ScanOut(BaseModel):
    id: str
    plant_id: str
    timestamp: datetime.datetime
    image_url: str | None
    note: str | None
    canopy_area_m2: float | None
    fruit_counts: dict
    leaf_counts: dict

    class Config:
        from_attributes = True


class MetricDelta(BaseModel):
    """Shows the change between two scans for a single metric."""
    previous: Any
    current: Any
    delta: Any


class ComparisonOut(BaseModel):
    plant_id: str
    current_scan: ScanOut
    previous_scan: ScanOut
    days_apart: float
    canopy: MetricDelta
    fruit_comparison: dict[str, MetricDelta]
    leaf_comparison: dict[str, MetricDelta]
    summary: list[str]


# ── Helper ───────────────────────────────────────────────────────────────────

def _scan_to_out(scan: Scan) -> ScanOut:
    return ScanOut(
        id=str(scan.id),
        plant_id=str(scan.plant_id),
        timestamp=scan.timestamp,
        image_url=scan.image_url,
        note=scan.note,
        canopy_area_m2=scan.canopy_area_m2,
        fruit_counts=scan.fruit_counts or {},
        leaf_counts=scan.leaf_counts or {},
    )


def _compare_dicts(prev: dict, curr: dict) -> dict[str, MetricDelta]:
    """Compare two JSONB dicts key-by-key and return deltas."""
    all_keys = sorted(set(list(prev.keys()) + list(curr.keys())))
    result = {}
    for key in all_keys:
        p = prev.get(key, 0)
        c = curr.get(key, 0)
        result[key] = MetricDelta(previous=p, current=c, delta=c - p)
    return result


def _build_summary(canopy_delta: MetricDelta, fruit_comp: dict, leaf_comp: dict) -> list[str]:
    """Generate human-readable summary sentences."""
    lines: list[str] = []

    # Canopy
    d = canopy_delta.delta
    if d is not None and d != 0:
        direction = "increased" if d > 0 else "decreased"
        lines.append(f"Canopy area {direction} by {abs(d):.4f} m² ({abs(d)*10000:.1f} cm²)")

    # Fruits
    for color, md in fruit_comp.items():
        if color.lower() == "total":
            continue
        if md.delta != 0:
            direction = "increased" if md.delta > 0 else "decreased"
            lines.append(f"{color} fruits {direction}: {md.previous} → {md.current} ({'+' if md.delta > 0 else ''}{md.delta})")

    # Leaves — especially highlight yellowing
    for color, md in leaf_comp.items():
        if color.lower() == "total":
            continue
        if md.delta != 0:
            direction = "increased" if md.delta > 0 else "decreased"
            prefix = "⚠️ " if color.lower() == "yellow" and md.delta > 0 else ""
            lines.append(f"{prefix}{color} leaves {direction}: {md.previous} → {md.current} ({'+' if md.delta > 0 else ''}{md.delta})")

    if not lines:
        lines.append("No significant changes detected between the two scans.")

    return lines


# ── Plant CRUD ───────────────────────────────────────────────────────────────

@router.post("/plants", response_model=PlantOut)
def create_plant(plant: PlantCreate, db: Session = Depends(get_db)):
    """Register a new plant to track over time."""
    new_plant = Plant(
        id=uuid.uuid4(),
        name=plant.name,
        species=plant.species,
    )
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)
    return PlantOut(
        id=str(new_plant.id),
        name=new_plant.name,
        species=new_plant.species,
        created_at=new_plant.created_at,
        total_scans=0,
    )


@router.get("/plants", response_model=list[PlantOut])
def list_plants(db: Session = Depends(get_db)):
    """List all registered plants."""
    plants = db.query(Plant).order_by(Plant.created_at.desc()).all()
    result = []
    for p in plants:
        scan_count = db.query(Scan).filter(Scan.plant_id == p.id).count()
        result.append(PlantOut(
            id=str(p.id),
            name=p.name,
            species=p.species,
            created_at=p.created_at,
            total_scans=scan_count,
        ))
    return result


@router.get("/plants/{plant_id}", response_model=PlantOut)
def get_plant(plant_id: str, db: Session = Depends(get_db)):
    """Get details for a single plant."""
    plant = db.query(Plant).filter(Plant.id == uuid.UUID(plant_id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    scan_count = db.query(Scan).filter(Scan.plant_id == plant.id).count()
    return PlantOut(
        id=str(plant.id),
        name=plant.name,
        species=plant.species,
        created_at=plant.created_at,
        total_scans=scan_count,
    )


@router.put("/plants/{plant_id}", response_model=PlantOut)
def update_plant(plant_id: str, plant_update: PlantUpdate, db: Session = Depends(get_db)):
    """Update a plant's details."""
    plant = db.query(Plant).filter(Plant.id == uuid.UUID(plant_id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    if plant_update.name is not None:
        plant.name = plant_update.name
    if plant_update.species is not None:
        plant.species = plant_update.species
        
    db.commit()
    db.refresh(plant)
    
    scan_count = db.query(Scan).filter(Scan.plant_id == plant.id).count()
    return PlantOut(
        id=str(plant.id),
        name=plant.name,
        species=plant.species,
        created_at=plant.created_at,
        total_scans=scan_count,
    )


@router.delete("/plants/{plant_id}")
def delete_plant(plant_id: str, db: Session = Depends(get_db)):
    """Delete a plant and all its associated scans."""
    plant = db.query(Plant).filter(Plant.id == uuid.UUID(plant_id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
        
    db.delete(plant)
    db.commit()
    return {"message": "Plant deleted successfully"}


# ── Scan (Upload + AI Analysis + Store) ─────────────────────────────────────

@router.post("/plants/{plant_id}/scans", response_model=ScanOut)
async def create_scan(
    plant_id: str,
    file: UploadFile = File(...),
    enable_canopy: str = Form("true"),
    enable_fruit: str = Form("true"),
    enable_leaf: str = Form("true"),
    canopy_conf: float = Form(0.10),
    fruit_conf: float = Form(0.5),
    leaf_conf: float = Form(0.4),
    note: str = Form(None),
    db: Session = Depends(get_db),
):
    """Upload an image, run AI inference, and store the results as a new scan."""
    from inference import run_inference

    # Verify plant exists
    plant = db.query(Plant).filter(Plant.id == uuid.UUID(plant_id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    # Read image bytes
    image_bytes = await file.read()

    # Save image to uploads/
    scan_id = uuid.uuid4()
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    image_filename = f"{scan_id}{ext}"
    image_path = os.path.join(UPLOAD_DIR, image_filename)
    with open(image_path, "wb") as f:
        f.write(image_bytes)

    # Run AI inference
    def _bool(v: str) -> bool:
        return v.strip().lower() in {"1", "true", "yes", "on"}

    metrics = run_inference(
        image_bytes,
        enable_canopy=_bool(enable_canopy),
        enable_fruit=_bool(enable_fruit),
        enable_leaf=_bool(enable_leaf),
        canopy_conf=canopy_conf,
        fruit_conf=fruit_conf,
        leaf_conf=leaf_conf,
    )

    # Build the JSONB data from the inference results
    fruit_counts_data = metrics.get("fruit_color_counts", metrics.get("fruit_counts", {}))
    fruit_counts_data["Total"] = sum(
        v for k, v in fruit_counts_data.items() if k != "Total"
    )

    leaf_counts_data = metrics.get("leaf_color_counts", metrics.get("leaf_counts", {}))
    leaf_counts_data["Total"] = sum(
        v for k, v in leaf_counts_data.items() if k != "Total"
    )

    # Create scan record
    new_scan = Scan(
        id=scan_id,
        plant_id=plant.id,
        image_url=f"/uploads/{image_filename}",
        note=note,
        canopy_area_m2=metrics.get("canopy_area_m2", 0.0),
        fruit_counts=fruit_counts_data,
        leaf_counts=leaf_counts_data,
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    return _scan_to_out(new_scan)


# ── Growth History ───────────────────────────────────────────────────────────

@router.get("/plants/{plant_id}/history", response_model=list[ScanOut])
def get_history(plant_id: str, days: int = 90, db: Session = Depends(get_db)):
    """Return all scans for a plant within the last N days, ordered by time."""
    plant = db.query(Plant).filter(Plant.id == uuid.UUID(plant_id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    scans = (
        db.query(Scan)
        .filter(Scan.plant_id == plant.id, Scan.timestamp >= cutoff)
        .order_by(Scan.timestamp.asc())
        .all()
    )
    return [_scan_to_out(s) for s in scans]


# ── Comparative Analysis ─────────────────────────────────────────────────────

@router.get("/plants/{plant_id}/compare", response_model=ComparisonOut)
def compare_scans(
    plant_id: str,
    days: int = 7,
    db: Session = Depends(get_db),
):
    """
    Compare the most recent scan with the scan closest to `days` ago.
    
    Returns a detailed delta report showing what changed:
    - Canopy area change
    - Per-color fruit count changes
    - Per-color leaf count changes (with warnings for yellowing)
    """
    plant = db.query(Plant).filter(Plant.id == uuid.UUID(plant_id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    # Get most recent scan
    current_scan = (
        db.query(Scan)
        .filter(Scan.plant_id == plant.id)
        .order_by(Scan.timestamp.desc())
        .first()
    )
    if not current_scan:
        raise HTTPException(status_code=404, detail="No scans found for this plant")

    # Find the scan closest to `days` days ago
    target_date = current_scan.timestamp - datetime.timedelta(days=days)

    # Get the scan closest to the target date (before or after)
    previous_scan = (
        db.query(Scan)
        .filter(Scan.plant_id == plant.id, Scan.id != current_scan.id)
        .order_by(
            # Order by absolute distance from target_date
            (Scan.timestamp - target_date).asc()
        )
        .first()
    )

    if not previous_scan:
        raise HTTPException(
            status_code=404,
            detail="Need at least 2 scans to compare. Upload another image after some time.",
        )

    # Calculate days apart
    delta_time = current_scan.timestamp - previous_scan.timestamp
    days_apart = abs(delta_time.total_seconds()) / 86400.0

    # Compare canopy
    prev_canopy = previous_scan.canopy_area_m2 or 0.0
    curr_canopy = current_scan.canopy_area_m2 or 0.0
    canopy_delta = MetricDelta(
        previous=round(prev_canopy, 4),
        current=round(curr_canopy, 4),
        delta=round(curr_canopy - prev_canopy, 4),
    )

    # Compare fruit colors
    fruit_comp = _compare_dicts(
        previous_scan.fruit_counts or {},
        current_scan.fruit_counts or {},
    )

    # Compare leaf colors
    leaf_comp = _compare_dicts(
        previous_scan.leaf_counts or {},
        current_scan.leaf_counts or {},
    )

    # Build human-readable summary
    summary = _build_summary(canopy_delta, fruit_comp, leaf_comp)

    return ComparisonOut(
        plant_id=plant_id,
        current_scan=_scan_to_out(current_scan),
        previous_scan=_scan_to_out(previous_scan),
        days_apart=round(days_apart, 1),
        canopy=canopy_delta,
        fruit_comparison=fruit_comp,
        leaf_comparison=leaf_comp,
        summary=summary,
    )
