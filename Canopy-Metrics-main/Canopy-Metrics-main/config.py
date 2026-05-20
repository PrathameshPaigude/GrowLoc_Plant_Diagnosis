# Configuration file for Plant Canopy Metrics Estimator
# Customize these settings as needed

# Model Configuration
MODEL_PATH = "models/best.pt"              # Path to YOLOv8 model file
CONFIDENCE_THRESHOLD = 0.5                # Minimum confidence for detections
IOU_THRESHOLD = 0.45                      # IoU threshold for NMS

# UI Configuration
APP_TITLE = "Plant Canopy Metrics Estimator"
APP_ICON = "🌱"
PAGE_LAYOUT = "wide"                      # "wide" or "centered"

# Image Processing
SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'bmp', 'gif']
MAX_UPLOAD_SIZE_MB = 100
IMAGE_QUALITY = 95

# Bounding Box Visualization
BBOX_COLOR = (0, 255, 0)                  # BGR format: Green
BBOX_THICKNESS = 2
LABEL_FONT_SCALE = 0.6
LABEL_THICKNESS = 1

# Metrics
UNITS = "pixels"                          # Unit for measurements
AREA_UNIT = "pixels²"                     # Unit for area measurements

# Calibration (pixel -> real-world). Set to None to require per-image entry.
# Example: if 100 px = 10 cm, then CM_PER_PIXEL = 10/100 = 0.1
CM_PER_PIXEL = None

# Directories
TEST_IMAGES_DIR = "test_images"
TEMP_UPLOAD_DIR = "temp_uploads"

# Feature Flags
ENABLE_EXPORT = True                      # Enable metrics export
ENABLE_BATCH_PROCESSING = False           # Enable batch processing (future)
ENABLE_CALIBRATION = False                # Enable pixel-to-real-world conversion
ENABLE_STATISTICS = True                  # Show summary statistics

# Advanced Options
DEVICE = "auto"                           # "cpu", "cuda", or "auto"
WORKERS = 2                               # Number of workers for inference
VERBOSE = False                           # Verbose logging
