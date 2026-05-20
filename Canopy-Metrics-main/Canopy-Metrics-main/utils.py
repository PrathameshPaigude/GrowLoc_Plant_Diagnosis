"""
Utility functions for Plant Canopy Metrics Estimator
Provides helper functions for metrics calculation and image processing
"""

import cv2
import numpy as np
from typing import List, Tuple, Dict
from pathlib import Path

class CanopyMetrics:
    """Class for calculating canopy-related metrics"""
    
    @staticmethod
    def calculate_metrics_from_bbox(bbox: Tuple[int, int, int, int]) -> Dict[str, float]:
        """
        Calculate canopy metrics from a bounding box.
        
        Args:
            bbox: Tuple of (x1, y1, x2, y2) coordinates
            
        Returns:
            Dictionary with height, width, and area metrics
        """
        x1, y1, x2, y2 = bbox
        height = y2 - y1
        width = x2 - x1
        area = height * width
        
        return {
            "height": height,
            "width": width,
            "area": area,
            "bbox": bbox
        }
    
    @staticmethod
    def calculate_bounding_box_ratio(bbox: Tuple[int, int, int, int]) -> float:
        """
        Calculate aspect ratio (width/height) of bounding box.
        
        Args:
            bbox: Tuple of (x1, y1, x2, y2) coordinates
            
        Returns:
            Aspect ratio value
        """
        x1, y1, x2, y2 = bbox
        height = y2 - y1
        width = x2 - x1
        
        if height == 0:
            return 0
        return width / height
    
    @staticmethod
    def calculate_perimeter(bbox: Tuple[int, int, int, int]) -> float:
        """
        Calculate perimeter of bounding box.
        
        Args:
            bbox: Tuple of (x1, y1, x2, y2) coordinates
            
        Returns:
            Perimeter value in pixels
        """
        x1, y1, x2, y2 = bbox
        height = y2 - y1
        width = x2 - x1
        return 2 * (height + width)
    
    @staticmethod
    def calculate_centroid(bbox: Tuple[int, int, int, int]) -> Tuple[float, float]:
        """
        Calculate center point (centroid) of bounding box.
        
        Args:
            bbox: Tuple of (x1, y1, x2, y2) coordinates
            
        Returns:
            Tuple of (center_x, center_y)
        """
        x1, y1, x2, y2 = bbox
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2
        return (center_x, center_y)
    
    @staticmethod
    def summary_statistics(metrics_list: List[Dict]) -> Dict[str, float]:
        """
        Calculate summary statistics for multiple detections.
        
        Args:
            metrics_list: List of metric dictionaries
            
        Returns:
            Dictionary with summary statistics
        """
        if not metrics_list:
            return {}
        
        heights = [m['height'] for m in metrics_list]
        widths = [m['width'] for m in metrics_list]
        areas = [m['area'] for m in metrics_list]
        
        return {
            "num_detections": len(metrics_list),
            "avg_height": np.mean(heights),
            "max_height": np.max(heights),
            "min_height": np.min(heights),
            "std_height": np.std(heights),
            "avg_width": np.mean(widths),
            "max_width": np.max(widths),
            "min_width": np.min(widths),
            "std_width": np.std(widths),
            "avg_area": np.mean(areas),
            "max_area": np.max(areas),
            "min_area": np.min(areas),
            "std_area": np.std(areas),
            "total_area": np.sum(areas),
        }


class ImageProcessing:
    """Class for image processing utilities"""
    
    @staticmethod
    def load_image(image_path: str) -> np.ndarray:
        """
        Load image from file path.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Image as numpy array (BGR format)
        """
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image from {image_path}")
        return image
    
    @staticmethod
    def save_image(image: np.ndarray, output_path: str) -> bool:
        """
        Save image to file.
        
        Args:
            image: Image as numpy array
            output_path: Path where to save image
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cv2.imwrite(output_path, image)
            return True
        except Exception as e:
            print(f"Error saving image: {e}")
            return False
    
    @staticmethod
    def resize_image(image: np.ndarray, max_width: int, max_height: int) -> np.ndarray:
        """
        Resize image to fit within max dimensions while preserving aspect ratio.
        
        Args:
            image: Input image (numpy array)
            max_width: Maximum width
            max_height: Maximum height
            
        Returns:
            Resized image
        """
        height, width = image.shape[:2]
        
        # Calculate scaling factor
        scale = min(max_width / width, max_height / height)
        
        if scale >= 1:
            return image
        
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    @staticmethod
    def draw_bounding_box(image: np.ndarray, bbox: Tuple[int, int, int, int],
                          label: str = "", color: Tuple[int, int, int] = (0, 255, 0),
                          thickness: int = 2) -> np.ndarray:
        """
        Draw a single bounding box on an image.
        
        Args:
            image: Input image (numpy array)
            bbox: Bounding box coordinates (x1, y1, x2, y2)
            label: Label text to display
            color: Box color in BGR format
            thickness: Line thickness
            
        Returns:
            Image with drawn bounding box
        """
        image_copy = image.copy()
        x1, y1, x2, y2 = map(int, bbox)
        
        # Draw rectangle
        cv2.rectangle(image_copy, (x1, y1), (x2, y2), color, thickness)
        
        # Draw label if provided
        if label:
            font_scale = 0.5
            font_thickness = 1
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 
                                       font_scale, font_thickness)[0]
            
            # Background for label
            cv2.rectangle(image_copy,
                         (x1, y1 - text_size[1] - 10),
                         (x1 + text_size[0] + 5, y1),
                         color, -1)
            
            # Label text
            cv2.putText(image_copy, label, (x1 + 2, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), font_thickness)
        
        return image_copy
    
    @staticmethod
    def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
        """
        Rotate image by specified angle.
        
        Args:
            image: Input image
            angle: Rotation angle in degrees (positive = counter-clockwise)
            
        Returns:
            Rotated image
        """
        height, width = image.shape[:2]
        center = (width // 2, height // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, matrix, (width, height))
        return rotated
    
    @staticmethod
    def flip_image(image: np.ndarray, direction: str = "horizontal") -> np.ndarray:
        """
        Flip image horizontally or vertically.
        
        Args:
            image: Input image
            direction: "horizontal" or "vertical"
            
        Returns:
            Flipped image
        """
        if direction.lower() == "horizontal":
            return cv2.flip(image, 1)
        elif direction.lower() == "vertical":
            return cv2.flip(image, 0)
        else:
            raise ValueError(f"Invalid direction: {direction}")


class FileUtils:
    """Utility functions for file handling"""
    
    @staticmethod
    def get_image_files(directory: str) -> List[str]:
        """
        Get list of image files in a directory.
        
        Args:
            directory: Directory path
            
        Returns:
            List of image file paths
        """
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff'}
        image_files = []
        
        try:
            for file_path in Path(directory).iterdir():
                if file_path.suffix.lower() in image_extensions:
                    image_files.append(str(file_path))
        except Exception as e:
            print(f"Error reading directory: {e}")
        
        return sorted(image_files)
    
    @staticmethod
    def ensure_directory(directory: str) -> bool:
        """
        Create directory if it doesn't exist.
        
        Args:
            directory: Directory path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
            return True
        except Exception as e:
            print(f"Error creating directory: {e}")
            return False
    
    @staticmethod
    def get_file_size_mb(file_path: str) -> float:
        """
        Get file size in megabytes.
        
        Args:
            file_path: Path to file
            
        Returns:
            File size in MB
        """
        try:
            size_bytes = Path(file_path).stat().st_size
            return size_bytes / (1024 * 1024)
        except Exception as e:
            print(f"Error getting file size: {e}")
            return 0.0


class DataExport:
    """Utilities for exporting metrics data"""
    
    @staticmethod
    def metrics_to_dict(metrics_list: List[Dict]) -> Dict:
        """
        Convert metrics to exportable dictionary format.
        
        Args:
            metrics_list: List of metric dictionaries
            
        Returns:
            Formatted dictionary
        """
        return {
            "num_plants": len(metrics_list),
            "plants": metrics_list,
            "summary": CanopyMetrics.summary_statistics(metrics_list)
        }
    
    @staticmethod
    def metrics_to_csv_string(metrics_list: List[Dict]) -> str:
        """
        Convert metrics to CSV format string.
        
        Args:
            metrics_list: List of metric dictionaries
            
        Returns:
            CSV formatted string
        """
        if not metrics_list:
            return ""
        
        lines = ["Plant_ID,Height_px,Width_px,Area_px2"]
        for idx, metrics in enumerate(metrics_list, 1):
            line = f"{idx},{metrics['height']},{metrics['width']},{metrics['area']}"
            lines.append(line)
        
        return "\n".join(lines)


# Example usage / testing
if __name__ == "__main__":
    # Test bounding box metrics
    bbox = (10, 20, 110, 150)
    metrics = CanopyMetrics.calculate_metrics_from_bbox(bbox)
    print("Metrics:", metrics)
    print("Aspect Ratio:", CanopyMetrics.calculate_bounding_box_ratio(bbox))
    print("Perimeter:", CanopyMetrics.calculate_perimeter(bbox))
    print("Centroid:", CanopyMetrics.calculate_centroid(bbox))
    
    # Test summary statistics
    metrics_list = [
        {"height": 50, "width": 60, "area": 3000},
        {"height": 45, "width": 55, "area": 2475},
        {"height": 60, "width": 70, "area": 4200},
    ]
    summary = CanopyMetrics.summary_statistics(metrics_list)
    print("\nSummary Statistics:")
    for key, value in summary.items():
        print(f"  {key}: {value:.2f}")
