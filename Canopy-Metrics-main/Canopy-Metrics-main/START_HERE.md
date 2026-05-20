# 🌱 Plant Canopy Metrics Estimator - START HERE

## ⚡ Quick Start (60 seconds)

### Option 1: Linux/Mac Users
```bash
cd /home/nihal/Documents/growloc/canopy_metrics_ui
chmod +x run.sh
./run.sh
```

### Option 2: Windows Users
```bash
cd C:\path\to\canopy_metrics_ui
run.bat
```

### Option 3: All Platforms
```bash
# Activate virtual environment and run
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

pip install -r requirements.txt
streamlit run app.py
```

**That's it!** The app opens at `http://localhost:8501`

---

## 📋 What You Got

A complete Streamlit application that:
- ✅ Loads YOLOv8 plant detection model
- ✅ Processes uploaded plant images
- ✅ Detects individual plant canopies
- ✅ Calculates canopy metrics (height, width, area)
- ✅ Displays annotated images with bounding boxes
- ✅ Shows metrics in a clean dashboard
- ✅ Exports results as JSON

---

## 📁 File Structure

```
canopy_metrics_ui/
├── 🚀 app.py              ← Main Streamlit application
├── 🛠️  utils.py            ← Utility functions library  
├── ⚙️  config.py           ← Configuration settings
├── 📋 requirements.txt    ← Dependencies list
├── 🔧 setup.py           ← Python setup helper
├── 📖 DOCUMENTATION/
│   ├── README.md              ← Full documentation
│   ├── QUICKSTART.md          ← Quick setup guide
│   ├── SUMMARY.md             ← Project overview
│   ├── INSTALLATION_CHECKLIST.md  ← Verification checklist
│   └── START_HERE.md          ← This file!
├── 🎯 SCRIPTS/
│   ├── run.sh             ← Linux/Mac launcher
│   ├── run.bat            ← Windows launcher
│   ├── setup.sh           ← Linux/Mac setup
│   └── setup.py           ← Platform-independent setup
├── 📚 examples.py        ← Code examples & utilities
├── 🤖 best.pt            ← Your YOLOv8 model
├── 📸 test_images/       ← Your test images (add here!)
├── 🌐 .streamlit/
│   └── config.toml       ← Streamlit configuration
└── ✨ .gitignore         ← Git ignore patterns
```

---

## 🎯 Your First Run

### 1️⃣ Prerequisites
- Python 3.8+ installed
- `best.pt` model in project folder
- Internet for first-time setup (~5GB downloads)

### 2️⃣ Run Application
```bash
# Linux/Mac
./run.sh

# Windows
run.bat

# Manual
streamlit run app.py
```

### 3️⃣ Use the App
1. **Sidebar:** Upload an image or select test image
2. **Main:** See detected plants with boxes
3. **Right Panel:** View metrics for each plant
4. **Export:** Save results as JSON (optional)

---

## 📊 Understanding the Results

### What the app calculates:

For **each detected plant**:
- **Height (px)**: Vertical pixels of bounding box
- **Width (px)**: Horizontal pixels of bounding box  
- **Area (px²)**: Height × Width

**Summary statistics:**
- Average metrics across all detected plants
- Min/Max values
- Standard deviations

### Example Output:
```
Plant 1: Height: 85px | Width: 120px | Area: 10,200px²
Plant 2: Height: 72px | Width: 95px | Area: 6,840px²
Plant 3: Height: 95px | Width: 110px | Area: 10,450px²

Average: Height 84px | Width 108px | Area 9,163px²
```

---

## 🔧 Common Tasks

### Add Test Images
```bash
# Copy images to test_images folder
cp image1.jpg test_images/
cp image2.png test_images/
```
Images will appear in app's dropdown!

### Change Model
Edit `config.py`:
```python
MODEL_PATH = "path/to/another/model.pt"
```

### Adjust Detection Sensitivity
Edit `config.py`:
```python
CONFIDENCE_THRESHOLD = 0.3  # Lower = more detections
```

### Change Bounding Box Color
Edit `config.py`:
```python
BBOX_COLOR = (255, 0, 0)  # BGR: (B,G,R) - currently Green
```

### Export Metrics Programmatically
```python
# Use utils.py functions
from utils import CanopyMetrics, DataExport
metrics_list = [...]
export_data = DataExport.metrics_to_dict(metrics_list)
```

---

## 🐛 Troubleshooting

### "Module not found" error
```bash
pip install -r requirements.txt --force-reinstall
```

### "best.pt not found"
- Copy model to project root
- Check: `ls -la best.pt`

### No detections appear
- Verify model trained for your plants
- Try images similar to training data
- Lower confidence: `CONFIDENCE_THRESHOLD = 0.3`

### Slow performance
- Enable GPU if available (CUDA)
- Reduce image size
- First inference slowest, then cached

### Application won't start
- Check Python: `python --version` (3.8+)
- Check model exists
- Check internet connection
- Try: `streamlit run app.py --logger.level=debug`

---

## 📖 Documentation

For more information:
- **README.md** - Complete documentation
- **QUICKSTART.md** - Quick setup guide  
- **INSTALLATION_CHECKLIST.md** - Verification checklist
- **SUMMARY.md** - Project overview
- **config.py** - Configuration options (commented)

---

## 💻 System Requirements

### Minimum
- Python 3.8+
- 4GB RAM
- 5GB free disk

### Recommended
- Python 3.10+
- 8GB+ RAM
- GPU with CUDA
- 10GB free disk

### GPU Support
To use GPU (much faster):
```bash
# Uninstall torch
pip uninstall torch -y

# Install CUDA version
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

---

## 🚀 Next Steps

1. **Setup (pick one):**
   ```bash
   ./run.sh              # Linux/Mac
   run.bat               # Windows
   ./setup.sh            # Linux/Mac detailed setup
   python setup.py       # All platforms
   ```

2. **Add Images:**
   ```bash
   cp your_plants.jpg test_images/
   ```

3. **Run App:**
   ```bash
   streamlit run app.py
   ```

4. **Analyze:**
   - Upload/select images
   - View detection results
   - Check metrics
   - Export if needed

---

## 💡 Pro Tips

1. **Batch Processing:** Re-upload multiple images one at a time
2. **JSON Export:** Use exported metrics in other tools
3. **Real-world Calibration:** Multiply pixel measurements by a calibration factor
4. **Custom Model:** Train your own YOLOv8 model on your plants
5. **Integration:** Use `utils.py` functions in your own code

---

## 📞 Quick Reference

### Launch Commands
```bash
streamlit run app.py              # Standard run
streamlit run app.py --logger.level=debug  # Debug mode
streamlit run app.py --port 8502          # Custom port
```

### Virtual Environment
```bash
python -m venv venv                # Create
source venv/bin/activate           # Linux/Mac activate
venv\Scripts\activate              # Windows activate
deactivate                         # Deactivate
```

### Dependencies
```bash
pip install -r requirements.txt            # Install all
pip list                                  # Show installed
pip install package==version --upgrade    # Update one
```

---

## ✅ Verification

Run this to verify everything:
```bash
python -c "import streamlit; print('✓ Streamlit')"
python -c "import ultralytics; print('✓ Ultralytics')"
python -c "import cv2; print('✓ OpenCV')"
python -c "import torch; print('✓ PyTorch')"
ls best.pt && echo "✓ Model exists"
```

All should show ✓

---

## 🎉 You're Ready!

Everything is installed and configured. Your application is ready to:
- Detect plants in images
- Calculate canopy metrics
- Visualize results
- Export data

### Last Step:
```bash
streamlit run app.py
```

**Enjoy analyzing plant canopies!** 🌱

---

## 📧 Questions?

1. Check **README.md** for full documentation
2. Review **INSTALLATION_CHECKLIST.md** to verify setup
3. Check console output for error details
4. Review code comments in **app.py** and **utils.py**

---

**Application:** Plant Canopy Metrics Estimator v1.0  
**Created:** March 2026  
**Status:** ✅ Ready to Use

---

### Quick Summary Table

| What | Command | Time |
|------|---------|------|
| First-time setup | `./run.sh` or `run.bat` | 5 min |
| Run app | `streamlit run app.py` | Instant |
| Add test image | Copy to `test_images/` | 1 sec |
| Process image | Upload in app | Seconds |
| View metrics | Check right panel | Instant |
| Export results | Click JSON button | 1 sec |

---

🚀 **Ready? Start with:** `streamlit run app.py`
