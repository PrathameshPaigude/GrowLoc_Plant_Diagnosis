# Project Summary: Plant Canopy Metrics Estimator

## ✅ Project Complete

A fully functional Streamlit application for estimating plant canopy metrics using YOLOv8 object detection has been created.

## 📁 Project Structure

```
canopy_metrics_ui/
├── app.py                    # Main Streamlit application (7.1 KB)
├── utils.py                  # Utility functions for metrics & image processing (11.7 KB)
├── config.py                 # Configuration settings (1.5 KB)
├── requirements.txt          # Python dependencies
├── setup.py                  # Python setup script (4.6 KB)
├── setup.sh                  # Bash setup script (1.9 KB)
├── README.md                 # Full documentation (4.9 KB) 
├── QUICKSTART.md             # Quick start guide (4.0 KB)
├── SUMMARY.md                # This file
├── .gitignore                # Git ignore patterns
├── .streamlit/
│   └── config.toml           # Streamlit configuration
├── best.pt/                  # YOLOv8 model (pre-existing)
├── test_images/              # Directory for test images (empty, add your own)
└── temp_uploads/             # Temporary upload storage (auto-created)
```

## 🎯 Key Features Implemented

### 1. **Image Input Management**
   - Upload custom images via UI
   - Select test images from `test_images/` folder
   - Support for JPG, PNG, BMP, GIF formats
   - Temporary storage for uploaded files

### 2. **YOLO Inference**
   - Loads YOLOv8 model from `best.pt`
   - Runs inference on uploaded/selected images
   - Extracts bounding boxes for detections
   - Cached model for performance

### 3. **Canopy Metrics Calculation**
   - Canopy Height: Vertical extent of bounding box (pixels)
   - Canopy Width: Horizontal extent of bounding box (pixels)
   - Canopy Area: Height × Width (pixels²)
   - Calculated for each detected plant

### 4. **Visualization**
   - Green bounding boxes on detected plants
   - Height and width labels on each box
   - Annotated image display
   - Clean, organized UI layout

### 5. **UI Components**

   **Sidebar:**
   - Image source selection (Upload/Test Images)
   - File uploader widget
   - Test image dropdown selector

   **Main Panel:**
   - Annotated image with detections
   - Full-width image display

   **Metrics Panel (Right):**
   - Individual plant metrics (expandable)
   - Summary statistics
   - Metrics export as JSON

### 6. **Additional Features**
   - Summary statistics (averages, min, max)
   - Multiple plant support
   - JSON export functionality
   - Error handling and validation
   - Responsive layout

## 📊 Metrics Displayed

For each detected plant:
- **Canopy Height**: Based on bounding box height
- **Canopy Width**: Based on bounding box width
- **Canopy Area**: Calculated as height × width

Summary includes:
- Total number of plants detected
- Average metrics across all plants
- Min/Max values
- Standard deviations

## 🚀 How to Run

### Quick Start (Recommended)

```bash
# Navigate to project directory
cd /home/nihal/Documents/growloc/canopy_metrics_ui

# Run setup (Linux/Mac)
chmod +x setup.sh
./setup.sh

# Or use Python setup (All platforms)
python setup.py

# Run the application
streamlit run app.py
```

### Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run application
streamlit run app.py
```

## 📦 Dependencies

- **streamlit** (1.28.1) - Web UI framework
- **ultralytics** (8.0.206) - YOLOv8 implementation
- **opencv-python** (4.8.1.78) - Image processing
- **torch** (2.0.1) - Deep learning framework
- **torchvision** (0.15.2) - Computer vision utilities
- **numpy** (1.24.3) - Numerical computing
- **Pillow** (10.0.1) - Image handling

## ⚙️ Configuration

Key settings in `config.py`:
- Model path: `best.pt`
- Confidence threshold: 0.5
- Bounding box color: Green (0, 255, 0)
- Supported image formats: JPG, PNG, BMP, GIF
- Max upload size: 100 MB

## 📝 Usage Instructions

1. **Start the application**: `streamlit run app.py`
2. **Upload or select an image** from the sidebar
3. **View detections** in the main panel
4. **Check metrics** in the right panel
5. **Export results** using the JSON export button (if needed)

## 🔧 Customization Options

### Change Model
Edit `config.py`:
```python
MODEL_PATH = "path/to/your/model.pt"
```

### Adjust Detection Sensitivity
Edit `config.py`:
```python
CONFIDENCE_THRESHOLD = 0.3  # Lower = more detections
```

### Customize Bounding Box Color
Edit `config.py`:
```python
BBOX_COLOR = (255, 0, 0)  # BGR format (Blue, Green, Red)
```

### Add Test Images
Place image files in `test_images/` folder

## 🛠️ Helper Utilities

`utils.py` provides reusable classes:

### CanopyMetrics
- `calculate_metrics_from_bbox()` - Get metrics from bounding box
- `calculate_bounding_box_ratio()` - Get aspect ratio
- `calculate_perimeter()` - Get box perimeter
- `calculate_centroid()` - Get center point
- `summary_statistics()` - Aggregate statistics

### ImageProcessing
- `load_image()` - Load from file
- `save_image()` - Save to file
- `resize_image()` - Resize with aspect ratio
- `draw_bounding_box()` - Draw single box
- `rotate_image()` - Rotate by angle
- `flip_image()` - Flip horizontally/vertically

### FileUtils
- `get_image_files()` - List images in directory
- `ensure_directory()` - Create directory if needed
- `get_file_size_mb()` - Get file size

### DataExport
- `metrics_to_dict()` - Convert to dictionary
- `metrics_to_csv_string()` - Convert to CSV format

## 🎓 Understanding the Application

### Data Flow
1. User uploads/selects image
2. Image is processed with OpenCV
3. YOLO model runs inference
4. Bounding boxes are extracted
5. Metrics calculated for each box
6. Results displayed with visualization
7. User can export metrics

### Key Functions in app.py
- `load_model()` - Loads YOLOv8 with caching
- `draw_bounding_boxes()` - Annotates image
- `get_test_images()` - Lists available test images
- `process_image()` - Runs inference and extracts metrics

## 📈 Performance Considerations

- Model is cached to memory after first load
- Images are processed on-demand
- Temporary uploads cleaned after session
- GPU acceleration available if CUDA installed

## ✨ Features Ready to Use

✅ Image upload functionality  
✅ Test image selection  
✅ YOLO inference  
✅ Bounding box extraction  
✅ Canopy metrics calculation  
✅ Metrics visualization  
✅ Individual plant metrics display  
✅ Summary statistics  
✅ JSON export  
✅ Error handling  
✅ Responsive UI  
✅ Configuration system  

## 🔍 Testing the App

1. Ensure `best.pt` model is in the project root
2. Run `streamlit run app.py`
3. Select or upload a plant image
4. View detected canopies and metrics
5. Export metrics if needed

## 📖 Documentation Files

- **README.md** - Full documentation with troubleshooting
- **QUICKSTART.md** - Quick setup guide
- **SUMMARY.md** - This project overview
- **config.py** - Inline configuration documentation

## 🐛 Troubleshooting

**Model not found?**
- Ensure `best.pt` is in project root

**No detections?**
- Check model is trained for your plant type
- Try images similar to training data

**Dependencies error?**
- Run: `pip install -r requirements.txt --force-reinstall`

**Memory issues?**
- Resize images before uploading
- Close other applications

See README.md for more troubleshooting tips.

## 🎯 Next Steps

1. **Setup Environment**
   ```bash
   python setup.py
   ```

2. **Add Test Images**
   - Copy images to `test_images/` folder

3. **Run Application**
   ```bash
   streamlit run app.py
   ```

4. **Use & Customize**
   - Test with your plant images
   - Modify config.py as needed
   - Export and analyze metrics

## 📄 License & Attribution

This application uses:
- Streamlit (Apache 2.0)
- YOLOv8 / Ultralytics (AGPL-3.0)
- OpenCV (Apache 2.0)
- PyTorch (BSD)

---

**Project Status:** ✅ Complete and Ready to Use  
**Created:** March 12, 2026  
**Application Name:** Plant Canopy Metrics Estimator  
**Version:** 1.0
