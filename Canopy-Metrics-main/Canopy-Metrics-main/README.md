# Plant Canopy Metrics Estimator

A Streamlit application that estimates plant canopy metrics using YOLOv8 object detection.

## Features

- 🎯 **YOLOv8 Detection**: Uses trained YOLOv8 model for plant detection
- 📊 **Canopy Metrics**: Calculates height, width, and area for each detected plant
- 🖼️ **Bounding Box Visualization**: Displays annotated images with detection boxes
- 📁 **Flexible Input**: Upload custom images or use test images
- 💾 **Metrics Export**: Export detection metrics in JSON format
- 📈 **Summary Statistics**: View average metrics across all detected plants

## Installation

### Prerequisites
- Python 3.8+
- pip

### Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd /home/nihal/Documents/growloc/canopy_metrics_ui
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Ensure the model file exists:**
   - Place your trained `best.pt` model file in the project root directory
   - The model should be a YOLOv8 model trained for plant/canopy detection

5. **Prepare test images (optional):**
   - Create image files in the `test_images/` folder
   - Supported formats: JPG, JPEG, PNG, BMP, GIF

## Usage

### Running the Application

```bash
streamlit run app.py
```

The application will open in your default web browser at `http://localhost:8501`

### Using the Application

1. **Sidebar - Image Selection:**
   - Choose "Upload Image" to upload your own image
   - Or select "Select Test Image" to choose from pre-loaded examples

2. **Main Panel:**
   - The annotated image with bounding boxes will be displayed
   - Each detection shows canopy height and width labels

3. **Metrics Panel (Right):**
   - View individual plant metrics (Height, Width, Area)
   - See summary statistics (averages across all plants)
   - Export metrics to JSON

## Metrics Explained

For each detected plant canopy:

- **Canopy Height (px)**: Vertical extent of the bounding box
- **Canopy Width (px)**: Horizontal extent of the bounding box
- **Canopy Area (px²)**: Total area = Height × Width

## File Structure

```
canopy_metrics_ui/
├── app.py                 # Main Streamlit application
├── requirements.txt       # Python dependencies
├── best.pt               # YOLOv8 model (place here or in subdirectory)
├── test_images/          # Sample images for testing
│   └── (your test images here)
├── temp_uploads/         # Temporary storage for uploaded images (auto-created)
└── README.md            # This file
```

## Customization

### Adding Test Images
Copy image files to the `test_images/` folder. Supported formats:
- JPG/JPEG
- PNG
- BMP
- GIF

### Model Configuration
The application loads the model from `best.pt` in the project root. To use a different model:

Edit `app.py` line where `model_path = "best.pt"` and change to your model path.

## Troubleshooting

### Model not found error
- Ensure `best.pt` file exists in the project root directory
- Check file permissions

### No detections found
- Verify the model is properly trained for your use case
- Check that input images match the model's training data

### Out of memory errors
- Reduce image size before processing
- Use a GPU if available (CUDA)

### Installation issues
- Try installing dependencies one by one:
  ```bash
  pip install streamlit ultralytics opencv-python numpy Pillow torch
  ```

## Requirements

See `requirements.txt` for full list:
- **Streamlit**: Web UI framework
- **Ultralytics**: YOLOv8 implementation
- **OpenCV**: Image processing
- **PyTorch**: Deep learning backend
- **NumPy**: Numerical computing
- **Pillow**: Image handling

## Performance Tips

1. Use GPU for faster inference: Install CUDA-compatible PyTorch
2. Pre-process images: Resize large images before uploading
3. Cache model: The application caches the model in memory
4. Batch processing: For multiple images, process them individually

## Example Workflow

1. Start the app: `streamlit run app.py`
2. Choose "Select Test Image" from sidebar
3. View detected plants in main panel
4. Check metrics in right panel
5. Export metrics if needed
6. Try different images or upload your own

## Notes

- Bounding boxes are drawn in green with height and width labels
- Metrics are in pixels - calibration needed for real-world measurements
- Multiple detections per image are supported
- Temporary upload files are stored in `temp_uploads/`

## Support

For issues or questions:
1. Check that all dependencies are installed correctly
2. Verify model file is available
3. Ensure input images are in supported formats
4. Check console output for detailed error messages

---

**Application Version**: 1.0  
**Last Updated**: March 2026
