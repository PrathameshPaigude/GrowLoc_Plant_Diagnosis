"""
Example usage of Plant Canopy Metrics Estimator utilities

This script demonstrates how to use the utility functions
programmatically without the Streamlit UI.
"""

import cv2
from pathlib import Path
from ultralytics import YOLO
from utils import CanopyMetrics, ImageProcessing, FileUtils, DataExport
import json


def example_1_basic_inference():
    """Example 1: Basic YOLO inference and metrics extraction"""
    print("=" * 60)
    print("Example 1: Basic YOLO Inference")
    print("=" * 60)
    
    # Load model
    model = YOLO("best.pt")
    
    # Run inference
    image_path = "path/to/your/image.jpg"  # Change this
    
    try:
        results = model(image_path)
        detections = results[0].boxes
        
        if detections is not None and len(detections) > 0:
            print(f"Found {len(detections)} plants")
            
            # Extract metrics for each detection
            metrics_list = []
            for detection in detections:
                bbox = detection.xyxy[0].cpu().numpy()
                metrics = CanopyMetrics.calculate_metrics_from_bbox(tuple(map(int, bbox)))
                metrics_list.append(metrics)
                print(f"  Plant: H={metrics['height']}px, W={metrics['width']}px, A={metrics['area']}px²")
        else:
            print("No plants detected")
    
    except Exception as e:
        print(f"Error: {e}")


def example_2_draw_boxes():
    """Example 2: Draw bounding boxes on image"""
    print("\n" + "=" * 60)
    print("Example 2: Drawing Bounding Boxes")
    print("=" * 60)
    
    try:
        # Load image
        image_path = "path/to/your/image.jpg"  # Change this
        image = ImageProcessing.load_image(image_path)
        
        # Run inference
        model = YOLO("best.pt")
        results = model(image_path)
        detections = results[0].boxes
        
        # Draw boxes
        if detections is not None:
            for idx, detection in enumerate(detections, 1):
                bbox = tuple(map(int, detection.xyxy[0].cpu().numpy()))
                metrics = CanopyMetrics.calculate_metrics_from_bbox(bbox)
                label = f"Plant {idx}: {metrics['height']}px x {metrics['width']}px"
                image = ImageProcessing.draw_bounding_box(image, bbox, label)
        
        # Save annotated image
        output_path = "annotated_image.jpg"
        ImageProcessing.save_image(image, output_path)
        print(f"✓ Annotated image saved: {output_path}")
    
    except Exception as e:
        print(f"Error: {e}")


def example_3_batch_processing():
    """Example 3: Process multiple images"""
    print("\n" + "=" * 60)
    print("Example 3: Batch Processing")
    print("=" * 60)
    
    try:
        # Get all images in test_images folder
        image_files = FileUtils.get_image_files("test_images")
        
        if not image_files:
            print("No images found in test_images folder")
            return
        
        model = YOLO("best.pt")
        all_metrics = []
        
        for image_path in image_files[:3]:  # Process first 3 images
            print(f"\nProcessing: {Path(image_path).name}")
            
            results = model(image_path)
            detections = results[0].boxes
            
            if detections is not None:
                for detection in detections:
                    bbox = tuple(map(int, detection.xyxy[0].cpu().numpy()))
                    metrics = CanopyMetrics.calculate_metrics_from_bbox(bbox)
                    all_metrics.append(metrics)
                    print(f"  Detected: H={metrics['height']}px, W={metrics['width']}px")
        
        # Show summary statistics
        if all_metrics:
            summary = CanopyMetrics.summary_statistics(all_metrics)
            print("\n" + "-" * 60)
            print("Summary Statistics:")
            print(f"  Total detections: {summary['num_detections']}")
            print(f"  Avg height: {summary['avg_height']:.1f}px")
            print(f"  Avg width: {summary['avg_width']:.1f}px")
            print(f"  Avg area: {summary['avg_area']:.1f}px²")
    
    except Exception as e:
        print(f"Error: {e}")


def example_4_advanced_metrics():
    """Example 4: Calculate advanced metrics"""
    print("\n" + "=" * 60)
    print("Example 4: Advanced Metrics")
    print("=" * 60)
    
    # Example bounding boxes
    boxes = [
        (10, 20, 110, 150),    # Plant 1
        (150, 30, 250, 180),   # Plant 2
        (300, 40, 400, 200),   # Plant 3
    ]
    
    print("\nBounding Box Analysis:")
    for idx, bbox in enumerate(boxes, 1):
        metrics = CanopyMetrics.calculate_metrics_from_bbox(bbox)
        ratio = CanopyMetrics.calculate_bounding_box_ratio(bbox)
        perimeter = CanopyMetrics.calculate_perimeter(bbox)
        centroid = CanopyMetrics.calculate_centroid(bbox)
        
        print(f"\nPlant {idx}:")
        print(f"  Height: {metrics['height']}px")
        print(f"  Width: {metrics['width']}px")
        print(f"  Area: {metrics['area']}px²")
        print(f"  Aspect Ratio (W/H): {ratio:.2f}")
        print(f"  Perimeter: {perimeter}px")
        print(f"  Center Point: ({centroid[0]:.1f}, {centroid[1]:.1f})")
    
    # Summary statistics
    metrics_list = [CanopyMetrics.calculate_metrics_from_bbox(b) for b in boxes]
    summary = CanopyMetrics.summary_statistics(metrics_list)
    
    print("\n" + "-" * 60)
    print("Summary Statistics:")
    for key, value in summary.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.2f}")
        else:
            print(f"  {key}: {value}")


def example_5_export_metrics():
    """Example 5: Export metrics in different formats"""
    print("\n" + "=" * 60)
    print("Example 5: Export Metrics")
    print("=" * 60)
    
    # Sample metrics
    metrics_list = [
        {"height": 85, "width": 120, "area": 10200, "box": (10, 20, 130, 105)},
        {"height": 72, "width": 95, "area": 6840, "box": (150, 30, 245, 102)},
        {"height": 95, "width": 110, "area": 10450, "box": (300, 40, 410, 135)},
    ]
    
    # Export as JSON
    json_data = DataExport.metrics_to_dict(metrics_list)
    print("\n📋 JSON Export:")
    print(json.dumps(json_data, indent=2))
    
    # Export as CSV
    csv_data = DataExport.metrics_to_csv_string(metrics_list)
    print("\n📊 CSV Export:")
    print(csv_data)
    
    # Save JSON to file
    with open("metrics.json", "w") as f:
        json.dump(json_data, f, indent=2)
    print("\n✓ Metrics exported to metrics.json")


def example_6_image_processing():
    """Example 6: Image processing operations"""
    print("\n" + "=" * 60)
    print("Example 6: Image Processing")
    print("=" * 60)
    
    try:
        image_path = "path/to/your/image.jpg"  # Change this
        
        # Load image
        image = ImageProcessing.load_image(image_path)
        height, width = image.shape[:2]
        print(f"Original image size: {width}x{height}")
        
        # Resize image
        resized = ImageProcessing.resize_image(image, max_width=640, max_height=480)
        print(f"Resized image size: {resized.shape[1]}x{resized.shape[0]}")
        
        # You can also:
        # - Rotate: rotated = ImageProcessing.rotate_image(image, 45)
        # - Flip horizontal: flipped = ImageProcessing.flip_image(image, "horizontal")
        # - Draw box: annotated = ImageProcessing.draw_bounding_box(image, (x1,y1,x2,y2))
        
    except Exception as e:
        print(f"Error: {e}")


def example_7_file_utilities():
    """Example 7: File and directory operations"""
    print("\n" + "=" * 60)
    print("Example 7: File Utilities")
    print("=" * 60)
    
    # List images in directory
    images = FileUtils.get_image_files("test_images")
    print(f"\nImages in test_images/: {len(images)}")
    for img in images[:5]:
        size_mb = FileUtils.get_file_size_mb(img)
        print(f"  - {Path(img).name} ({size_mb:.1f} MB)")
    
    # Ensure directories exist
    FileUtils.ensure_directory("outputs")
    print("\n✓ Created 'outputs' directory if it didn't exist")


def run_all_examples():
    """Run all examples"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "Plant Canopy Metrics - Usage Examples" + " " * 12 + "║")
    print("╚" + "=" * 58 + "╝")
    
    # Note: Examples 1 and 2 require actual image files
    # Uncomment to run if you have images
    
    # example_1_basic_inference()
    # example_2_draw_boxes()
    # example_3_batch_processing()
    
    example_4_advanced_metrics()
    example_5_export_metrics()
    # example_6_image_processing()
    example_7_file_utilities()
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_all_examples()
