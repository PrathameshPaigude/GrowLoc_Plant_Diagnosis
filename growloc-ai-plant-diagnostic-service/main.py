from __future__ import annotations

from contextlib import asynccontextmanager

from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from inference import load_models, models_status, run_inference

from database.database import engine, Base
from database import models as db_models  # noqa: F401 — ensures models are registered
from routes import router as plants_router

import os

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create database tables on startup
    Base.metadata.create_all(bind=engine)
    print("[growloc-ai] Database tables created/verified.")

    try:
        load_models()
    except Exception as exc:
        # Allow startup even if some/all models are missing.
        print(f"[growloc-ai] model preload note: {exc}")
    yield


app = FastAPI(title="Growloc AI Service", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register the new plant/scan/history/compare routes
app.include_router(plants_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/models")
def models() -> dict[str, Any]:
    """Which YOLO weights are loaded (restart backend after adding new .pt files)."""
    load_models()
    return {"models": models_status()}


def _form_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    enable_canopy: str = Form("true"),
    enable_fruit: str = Form("true"),
    enable_leaf: str = Form("true"),
    canopy_conf: float = Form(0.25),
    canopy_iou: float = Form(0.45),
    canopy_area_bias_m2: float = Form(0.0),
    fruit_conf: float = Form(0.5),
    fruit_iou: float = Form(0.4),
    leaf_conf: float = Form(0.4),
) -> dict[str, Any]:
    data = await file.read()
    try:
        metrics = run_inference(
            data,
            enable_canopy=_form_bool(enable_canopy),
            enable_fruit=_form_bool(enable_fruit),
            enable_leaf=_form_bool(enable_leaf),
            canopy_conf=canopy_conf,
            canopy_iou=canopy_iou,
            canopy_area_bias_m2=canopy_area_bias_m2,
            fruit_conf=fruit_conf,
            fruit_iou=fruit_iou,
            leaf_conf=leaf_conf,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return metrics
