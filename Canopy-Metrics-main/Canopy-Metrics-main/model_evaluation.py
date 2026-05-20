import argparse
import json
from pathlib import Path
from statistics import mean, median
from ultralytics import YOLO
import config


def find_model_path():
    candidates = [
        Path(getattr(config, "MODEL_PATH", "models/best.pt")),
        Path("models/best.pt"),
        Path("best.pt"),
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(
        "Could not find model weights. Put the file at one of: models/best.pt, best.pt, or update config.MODEL_PATH."
    )


def load_model():
    model_path = find_model_path()
    print(f"Loading YOLO model from: {model_path}")
    model = YOLO(str(model_path))
    return model


def summarize_model(model):
    try:
        param_count = sum(p.numel() for p in model.model.parameters())
    except Exception:
        param_count = None

    info = {
        "path": str(find_model_path()),
        "device": str(model.device),
        "classes": model.names if hasattr(model, "names") else None,
        "num_classes": len(model.names) if hasattr(model, "names") else None,
        "parameter_count": param_count,
        "confidence_threshold": getattr(config, "CONFIDENCE_THRESHOLD", None),
        "iou_threshold": getattr(config, "IOU_THRESHOLD", None),
    }
    return info


def infer_directory(model, image_dir, output_json=None, conf_threshold=None):
    image_dir = Path(image_dir)
    if not image_dir.exists():
        raise FileNotFoundError(f"Image directory not found: {image_dir}")

    images = sorted([p for p in image_dir.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}])
    if not images:
        raise ValueError(f"No supported images found in {image_dir}")

    all_stats = {
        "image_count": len(images),
        "total_detections": 0,
        "per_image": [],
    }

    for image_path in images:
        results = model(str(image_path))
        boxes = results[0].boxes if results else []
        detections = []
        for box in boxes:
            cls = int(box.cls[0].cpu().numpy()) if hasattr(box, 'cls') else None
            conf = float(box.conf[0].cpu().numpy()) if hasattr(box, 'conf') else None
            coords = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = coords
            width = float(x2 - x1)
            height = float(y2 - y1)
            area = float(width * height)
            if conf_threshold is None or conf >= conf_threshold:
                detections.append({
                    "class": cls,
                    "confidence": conf,
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "width": width,
                    "height": height,
                    "area": area,
                })

        all_stats["total_detections"] += len(detections)
        all_stats["per_image"].append({
            "image": str(image_path.name),
            "detections": len(detections),
            "mean_confidence": mean([d["confidence"] for d in detections]) if detections else 0.0,
            "median_confidence": median([d["confidence"] for d in detections]) if detections else 0.0,
            "mean_height": mean([d["height"] for d in detections]) if detections else 0.0,
            "mean_width": mean([d["width"] for d in detections]) if detections else 0.0,
            "mean_area": mean([d["area"] for d in detections]) if detections else 0.0,
            "detections_detail": detections,
        })

    all_stats["average_detections_per_image"] = all_stats["total_detections"] / len(images)
    all_stats["images"] = [item["image"] for item in all_stats["per_image"]]

    if output_json:
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(all_stats, f, indent=2)
        print(f"Saved inference summary to: {output_json}")

    return all_stats


def print_summary(summary):
    print("\n===== Model Summary =====")
    for key, value in summary.items():
        print(f"{key}: {value}")


def print_inference_stats(stats):
    print("\n===== Inference Summary =====")
    print(f"Images processed: {stats['image_count']}")
    print(f"Total detections: {stats['total_detections']}")
    print(f"Average detections/image: {stats['average_detections_per_image']:.2f}")
    print("\nPer-image results:")
    for image_stats in stats["per_image"]:
        print(
            f"- {image_stats['image']}: {image_stats['detections']} detections, "
            f"mean_conf={image_stats['mean_confidence']:.3f}, "
            f"mean_h={image_stats['mean_height']:.1f}px, "
            f"mean_w={image_stats['mean_width']:.1f}px, "
            f"mean_area={image_stats['mean_area']:.1f}px²"
        )


def run_validation(model, data_yaml):
    print(f"Running validation with data config: {data_yaml}")
    results = model.val(data=str(data_yaml))
    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate YOLOv8 canopy model and output current metrics.")
    parser.add_argument("--images", default="test_images", help="Directory containing images to run inference on.")
    parser.add_argument("--output", default="model_evaluation_output.json", help="Output JSON file for inference summary.")
    parser.add_argument("--conf", type=float, default=None, help="Optional confidence threshold filter for inference metrics.")
    parser.add_argument("--validate", action="store_true", help="Run YOLO validation if labeled data is available.")
    parser.add_argument("--data", default=None, help="Dataset YAML file for YOLO validation.")
    args = parser.parse_args()

    model = load_model()
    summary = summarize_model(model)
    print_summary(summary)

    if args.validate:
        if args.data is None:
            raise ValueError("--data is required when using --validate")
        results = run_validation(model, args.data)
        print("\n===== Validation Results =====")
        print(results)
        return

    stats = infer_directory(model, args.images, output_json=args.output, conf_threshold=args.conf)
    print_inference_stats(stats)
    print("\nNOTE: This script reports inference-level metrics only. For true model performance (mAP, precision, recall), provide a labeled validation dataset using --validate and --data.")


if __name__ == "__main__":
    main()
