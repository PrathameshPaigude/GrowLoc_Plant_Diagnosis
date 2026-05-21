"""Inference pipeline using canopy, fruit, and leaf YOLO models."""

from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps
from ultralytics import YOLO

_models_loaded = False
_fruit_model: YOLO | None = None
_leaf_model: YOLO | None = None

# ── Model discovery ──────────────────────────────────────────────────────────

def _candidate_model_dirs() -> list[Path]:
    """Return directories to search for model weights, in priority order."""
    here = Path(__file__).resolve()
    workspace_root = here.parents[1]  # e.g. E:/Growloc_Final

    canopy_base = workspace_root / "Canopy-Metrics-main" / "Canopy-Metrics-main"
    candidates = [
        # Explicit env-var override
        Path(os.getenv("MODELS_DIR", "")) if os.getenv("MODELS_DIR") else None,
        # Local models/ subfolder next to this file
        here.parent / "models",
        # Canopy model (Canopy-Metrics project)
        canopy_base,
        canopy_base / "models",
        # Strawberry / fruit model lives here
        workspace_root / "STRAWBERRY_AI-main" / "STRAWBERRY_AI-main",
        # Leaf model lives here
        workspace_root / "leavescounting27m-main",
        workspace_root / "leavescounting27m-main" / "leavescounting27m-main",
        # Legacy path (in case someone drops files here)
        workspace_root / "modelsToBeIntegrated",
    ]
    return [c for c in candidates if c is not None and c.is_dir()]


def _canopy_search_dirs() -> list[Path]:
    """Directories that should contain canopy weights (avoid other projects' best.pt)."""
    here = Path(__file__).resolve()
    workspace_root = here.parents[1]
    canopy_base = workspace_root / "Canopy-Metrics-main" / "Canopy-Metrics-main"
    dirs = [
        here.parent / "models",
        canopy_base,
        canopy_base / "models",
    ]
    if os.getenv("MODELS_DIR"):
        dirs.insert(0, Path(os.getenv("MODELS_DIR", "")))
    return [d for d in dirs if d.is_dir()]


def _find_canopy_model() -> Path | None:
    """Locate canopy YOLO weights (Canopy-Metrics uses best.pt)."""
    for directory in _canopy_search_dirs():
        for filename in ("canopy_model.pt", "best.pt"):
            path = directory / filename
            if path.exists():
                print(f"[growloc-ai]   🔍 found {filename} at {path}")
                return path
    return None


def _find_model_file(filename: str) -> Path | None:
    """Search candidate directories for a single model file."""
    for d in _candidate_model_dirs():
        p = d / filename
        if p.exists():
            print(f"[growloc-ai]   🔍 found {filename} at {p}")
            return p
    return None


def models_status() -> dict[str, bool]:
    """Report which model weights are loaded in memory."""
    return {
        "canopy": True,  # Deterministic HSV — always available
        "fruit": _fruit_model is not None,
        "leaf": _leaf_model is not None,
    }


def load_models() -> None:
    """Load YOLO checkpoints. Safe to call repeatedly — fills in any missing models."""
    global _models_loaded, _fruit_model, _leaf_model

    # ── Canopy model removed. We now use deterministic OpenCV HSV math ──

    # ── Fruit / strawberry model ──
    if _fruit_model is None:
        fruit_path = _find_model_file("fruit_model.pt")
        if fruit_path is None:
            fruit_path = _find_model_file("strawberry_master_model.pt")
        if fruit_path:
            _fruit_model = YOLO(str(fruit_path))
            _fruit_model.model.names = {0: "Green", 1: "Pink", 2: "Red", 3: "White"}
            print(f"[growloc-ai] ✅ fruit model loaded from {fruit_path}")
        elif not _models_loaded:
            print("[growloc-ai] ⚠️  fruit model not found – fruit analysis disabled")

    # ── Leaf model ──
    if _leaf_model is None:
        leaf_path = _find_model_file("leaf_model.pt")
        if leaf_path is None:
            leaf_path = _find_model_file("YOLOv8_Production_Best.pt")
        if leaf_path:
            _leaf_model = YOLO(str(leaf_path))
            print(f"[growloc-ai] ✅ leaf model loaded from {leaf_path}")
        elif not _models_loaded:
            print(
                "[growloc-ai] ⚠️  leaf model (YOLOv8_Production_Best.pt) not found "
                "– leaf analysis disabled"
            )

    _models_loaded = True


# ── Image helpers ────────────────────────────────────────────────────────────

def _decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode upload bytes to RGB array, applying EXIF orientation so bbox
    coordinates match what browsers show in <img> previews."""
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = ImageOps.exif_transpose(img)
        return np.array(img.convert("RGB"))


def _run_model(
    model: YOLO | None,
    image: np.ndarray,
    *,
    conf: float = 0.25,
    iou: float | None = None,
) -> Any:
    if model is None:
        return None
    kwargs: dict[str, Any] = {"verbose": False, "conf": conf}
    if iou is not None:
        kwargs["iou"] = iou
    results = model.predict(source=image, **kwargs)
    return results[0] if results else None


# ── Extraction helpers ───────────────────────────────────────────────────────

def _extract_canopy_hw_px(result: Any) -> tuple[float, float]:
    """Height/width of the largest canopy detection (matches per-plant bbox logic)."""
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return 0.0, 0.0

    xyxy = boxes.xyxy.cpu().numpy()
    widths = xyxy[:, 2] - xyxy[:, 0]
    heights = xyxy[:, 3] - xyxy[:, 1]
    areas = widths * heights
    idx = int(np.argmax(areas))
    return float(heights[idx]), float(widths[idx])


CM2_PER_PIXEL = 0.05 

def process_canopy(img_bgr, cm2_ratio):
    import cv2
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_plant = np.array([20, 40, 40])  
    upper_plant = np.array([90, 255, 255]) 
    
    plant_mask = cv2.inRange(hsv, lower_plant, upper_plant)
    plant_pixels = cv2.countNonZero(plant_mask)
    canopy_area_cm2 = plant_pixels * cm2_ratio
    
    canopy_visual = cv2.bitwise_and(img_bgr, img_bgr, mask=plant_mask)
    title = f"Total Canopy Area: {canopy_area_cm2:.2f} cm sq"
    cv2.rectangle(canopy_visual, (0, 0), (canopy_visual.shape[1], 40), (0, 0, 0), -1)
    cv2.putText(canopy_visual, title, (15, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    return canopy_area_cm2, canopy_visual


def _extract_leaf_area_ratio(result: Any, image_shape: tuple[int, int, int]) -> float:
    masks = getattr(result, "masks", None)
    data = getattr(masks, "data", None) if masks is not None else None
    if data is None or len(data) == 0:
        return 0.0
    mask_stack = data.cpu().numpy()
    union_mask = np.any(mask_stack > 0.5, axis=0)
    area_pixels = float(np.count_nonzero(union_mask))
    image_area = float(image_shape[0] * image_shape[1]) if image_shape[0] and image_shape[1] else 0.0
    return area_pixels / image_area if image_area else 0.0


def _classify_color_name(rgb_crop: np.ndarray) -> str:
    if rgb_crop.size == 0:
        return "unknown"
    mean_rgb = rgb_crop.reshape(-1, 3).mean(axis=0)
    r, g, b = float(mean_rgb[0]), float(mean_rgb[1]), float(mean_rgb[2])

    max_c = max(r, g, b)
    min_c = min(r, g, b)
    delta = max_c - min_c
    if max_c == 0:
        return "unknown"
    saturation = delta / max_c

    if saturation < 0.16:
        if max_c < 50:
            return "black"
        if max_c > 200:
            return "white"
        return "gray"

    if max_c == r:
        hue = (60 * ((g - b) / delta) + 360) % 360 if delta else 0
    elif max_c == g:
        hue = (60 * ((b - r) / delta) + 120) if delta else 0
    else:
        hue = (60 * ((r - g) / delta) + 240) if delta else 0

    if hue < 15 or hue >= 345:
        return "red"
    if hue < 45:
        return "orange"
    if hue < 70:
        return "yellow"
    if hue < 170:
        return "green"
    if hue < 255:
        return "blue"
    if hue < 320:
        return "purple"
    return "pink"


def _classify_leaf_color_hsv(bgr_crop: np.ndarray) -> str:
    """Classify leaf color using HSV space (glare-immune), matching
    the leavescounting27m approach."""
    import cv2  # local import to keep module-level lightweight

    if bgr_crop.size == 0:
        return "Unknown"

    hsv = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)
    valid = hsv.reshape(-1, 3)
    if len(valid) == 0:
        return "Unknown"

    h, s, v = np.median(valid, axis=0)

    if s < 60 and v > 150:
        return "White"
    if v < 50:
        return "Dark/Brown"
    if h < 10 or h > 165:
        return "Red"
    if h < 22:
        return "Orange"
    if h < 35:
        return "Yellow"
    if h < 45:
        return "Light Green"
    if h <= 85:
        return "Green"
    return "Other"


def _extract_detections(result: Any, image: np.ndarray) -> list[dict[str, Any]]:
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return []

    names = getattr(result, "names", {}) or {}
    xyxy = boxes.xyxy.cpu().numpy()
    conf = boxes.conf.cpu().numpy() if getattr(boxes, "conf", None) is not None else None
    cls = boxes.cls.cpu().numpy() if getattr(boxes, "cls", None) is not None else None

    detections: list[dict[str, Any]] = []
    for idx, box in enumerate(xyxy):
        class_id = int(cls[idx]) if cls is not None and idx < len(cls) else -1
        score = float(conf[idx]) if conf is not None and idx < len(conf) else 0.0
        label = str(names.get(class_id, class_id))
        x1 = max(0, int(round(float(box[0]))))
        y1 = max(0, int(round(float(box[1]))))
        x2 = min(image.shape[1], int(round(float(box[2]))))
        y2 = min(image.shape[0], int(round(float(box[3]))))
        color = _classify_color_name(image[y1:y2, x1:x2])
        detections.append(
            {
                "label": label,
                "color": color,
                "confidence": round(score, 4),
                "bbox": {
                    "x1": round(float(box[0]), 2),
                    "y1": round(float(box[1]), 2),
                    "x2": round(float(box[2]), 2),
                    "y2": round(float(box[3]), 2),
                },
            }
        )
    return detections


def _extract_leaf_detections_hsv(result: Any, image_bgr: np.ndarray) -> list[dict[str, Any]]:
    """Extract leaf detections with HSV-based color classification.
    Uses mask polygons when available (segmentation model), otherwise
    falls back to bounding-box crops."""
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return []

    names = getattr(result, "names", {}) or {}
    xyxy = boxes.xyxy.cpu().numpy()
    conf_arr = boxes.conf.cpu().numpy() if getattr(boxes, "conf", None) is not None else None
    cls_arr = boxes.cls.cpu().numpy() if getattr(boxes, "cls", None) is not None else None

    masks_obj = getattr(result, "masks", None)
    mask_polygons = getattr(masks_obj, "xy", None) if masks_obj is not None else None

    detections: list[dict[str, Any]] = []
    for idx, box in enumerate(xyxy):
        class_id = int(cls_arr[idx]) if cls_arr is not None and idx < len(cls_arr) else -1
        score = float(conf_arr[idx]) if conf_arr is not None and idx < len(conf_arr) else 0.0
        label = str(names.get(class_id, class_id))

        x1 = max(0, int(round(float(box[0]))))
        y1 = max(0, int(round(float(box[1]))))
        x2 = min(image_bgr.shape[1], int(round(float(box[2]))))
        y2 = min(image_bgr.shape[0], int(round(float(box[3]))))

        # Use mask polygon for color if available, else use bbox crop
        if mask_polygons is not None and idx < len(mask_polygons):
            import cv2
            poly_pts = mask_polygons[idx]
            mask = np.zeros(image_bgr.shape[:2], dtype=np.uint8)
            pts = np.array(poly_pts, np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(mask, [pts], 255)
            hsv_img = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
            valid_pixels = hsv_img[mask == 255]
            if len(valid_pixels) > 0:
                h, s, v = np.median(valid_pixels, axis=0)
                if s < 60 and v > 150:
                    color = "White"
                elif v < 50:
                    color = "Dark/Brown"
                elif h < 10 or h > 165:
                    color = "Red"
                elif h < 22:
                    color = "Orange"
                elif h < 35:
                    color = "Yellow"
                elif h < 45:
                    color = "Light Green"
                elif h <= 85:
                    color = "Green"
                else:
                    color = "Other"
            else:
                color = "Unknown"
        else:
            crop = image_bgr[y1:y2, x1:x2]
            color = _classify_leaf_color_hsv(crop)

        detections.append(
            {
                "label": label,
                "color": color,
                "confidence": round(score, 4),
                "bbox": {
                    "x1": round(float(box[0]), 2),
                    "y1": round(float(box[1]), 2),
                    "x2": round(float(box[2]), 2),
                    "y2": round(float(box[3]), 2),
                },
            }
        )
    return detections


def _count_by_key(detections: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in detections:
        value = str(item.get(key, "unknown"))
        counts[value] = counts.get(value, 0) + 1
    return counts


# ── Main inference entry point ───────────────────────────────────────────────

def run_inference(
    image_bytes: bytes,
    *,
    enable_canopy: bool = True,
    enable_fruit: bool = True,
    enable_leaf: bool = True,
    canopy_conf: float = 0.25,
    canopy_iou: float = 0.45,
    canopy_area_bias_m2: float | None = None,
    fruit_conf: float = 0.5,
    fruit_iou: float = 0.4,
    leaf_conf: float = 0.4,
) -> dict[str, Any]:
    """Run selected models and return combined multi-model outputs."""
    load_models()

    image_rgb = _decode_image(image_bytes)
    image_bgr = image_rgb[:, :, ::-1].copy()

    # ── Run each enabled model ──
    # Note: YOLO models expect BGR numpy arrays, so we pass image_bgr
    canopy_visual_base64 = None
    canopy_area_cm2 = 0.0
    canopy_area_m2 = 0.0
    canopy_area_raw_m2 = 0.0
    
    if enable_canopy:
        canopy_area_cm2, canopy_visual = process_canopy(image_bgr, CM2_PER_PIXEL)
        canopy_area_raw_m2 = canopy_area_cm2 / 10000.0
        if canopy_area_bias_m2 is None:
            canopy_area_bias_m2 = float(os.getenv("CANOPY_AREA_BIAS_M2", "0.0"))
        canopy_area_m2 = canopy_area_raw_m2 + canopy_area_bias_m2
        
        # Base64 encode the resulting canopy visual
        import cv2
        import base64
        success, buffer = cv2.imencode('.webp', canopy_visual, [cv2.IMWRITE_WEBP_QUALITY, 60])
        if success:
            canopy_visual_base64 = base64.b64encode(buffer).decode('utf-8')

    fruit_result = (
        _run_model(_fruit_model, image_bgr, conf=fruit_conf, iou=fruit_iou)
        if enable_fruit
        else None
    )
    leaf_result = (
        _run_model(_leaf_model, image_bgr, conf=leaf_conf) if enable_leaf else None
    )

    # ── Leaf area ratio (segmentation masks) ──
    leaf_area = _extract_leaf_area_ratio(leaf_result, image_rgb.shape)

    # ── Detections ──
    canopy_detections = []
    fruit_detections = _extract_detections(fruit_result, image_rgb)

    # Use HSV-based leaf color classification (matches leavescounting27m approach)
    leaf_detections = _extract_leaf_detections_hsv(leaf_result, image_bgr)

    # ── Counts ──
    fruit_counts = _count_by_key(fruit_detections, "label")
    fruit_color_counts = _count_by_key(fruit_detections, "color")
    leaf_counts = _count_by_key(leaf_detections, "label")
    leaf_color_counts = _count_by_key(leaf_detections, "color")
    leaf_detection_count = len(leaf_detections)

    return {
        # Backward-compatible fields now represent centimeters.
        "canopy_height": 0.0,
        "canopy_width": 0.0,
        "canopy_area": round(float(canopy_area_m2), 2),
        "canopy_height_px": 0.0,
        "canopy_width_px": 0.0,
        "canopy_height_cm": 0.0,
        "canopy_width_cm": 0.0,
        "canopy_area_cm2": round(float(canopy_area_cm2), 2),
        "canopy_area_m2": round(float(canopy_area_m2), 2),
        "canopy_area_raw_m2": round(float(canopy_area_raw_m2), 2),
        "canopy_area_bias_m2": round(float(canopy_area_bias_m2 or 0.0), 2),
        "canopy_area_zones_m2": [],
        "canopy_pixel_to_cm": CM2_PER_PIXEL,
        "canopy_meters_per_pixel": CM2_PER_PIXEL / 10000.0,
        "canopy_calibrated": True,
        "canopy_visual_base64": canopy_visual_base64,
        "canopy_detections": canopy_detections,
        "fruit_detections": fruit_detections,
        "leaf_detections": leaf_detections,
        "fruit_counts": fruit_counts,
        "fruit_color_counts": fruit_color_counts,
        "leaf_counts": leaf_counts,
        "leaf_color_counts": leaf_color_counts,
        "image_width": int(image_rgb.shape[1]),
        "image_height": int(image_rgb.shape[0]),
        "leaf": {
            "mask_area_ratio": round(float(leaf_area), 4),
            "detection_count": leaf_detection_count,
        },
        # Report which models are active so the frontend can show status
        "models_status": {
            "canopy": True, # Using HSV OpenCV
            "fruit": _fruit_model is not None,
            "leaf": _leaf_model is not None,
        },
    }
