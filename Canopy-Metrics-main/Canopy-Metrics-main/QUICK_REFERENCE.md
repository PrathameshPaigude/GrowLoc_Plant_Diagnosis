# 🚀 QUICK REFERENCE CARD

## ⚡ START IN 3 COMMANDS

```bash
cd /home/nihal/Documents/growloc/canopy_metrics_ui
chmod +x run.sh           # Make executable (Linux/Mac)
./run.sh                  # or: run.bat (Windows)
```

**✅ App opens at: http://localhost:8501**

---

## 📁 WHAT YOU HAVE

```
✅ app.py            - Main application
✅ utils.py          - Utility functions
✅ requirements.txt  - Dependencies
✅ best.pt           - Pre-loaded model
✅ test_images/      - Add images here!
✅ Documentation     - 7 guide files
✅ Setup scripts     - Automated setup
```

---

## 🎯 MAIN FEATURES

- 📸 Upload or select plant images
- 🔍 Auto-detect plant canopies with YOLOv8
- 📊 Calculate: Height, Width, Area (in pixels)
- 📈 View metrics for each plant
- 📥 Export results as JSON
- 📋 See summary statistics

---

## 📖 DOCUMENTATION

| File | Purpose | Read Time |
|------|---------|-----------|
| **START_HERE.md** | Entry point | 5 min |
| **QUICKSTART.md** | Setup guide | 3 min |
| **README.md** | Full docs | 10 min |
| **INSTALLATION_CHECKLIST.md** | Verify setup | 5 min |

👉 **Start with:** `START_HERE.md`

---

## 🔧 COMMON COMMANDS

```bash
# First Time Setup
python setup.py              # Install everything

# Run Application
streamlit run app.py         # Standard launch
./run.sh                     # Quick launch (Linux/Mac)
run.bat                      # Quick launch (Windows)

# Virtual Environment
python -m venv venv          # Create
source venv/bin/activate     # Activate (Linux/Mac)
venv\Scripts\activate        # Activate (Windows)

# Update Dependencies
pip install -r requirements.txt --force-reinstall
```

---

## 📸 HOW TO USE

### Step 1: Add Images
```bash
cp your_plants.jpg test_images/
```

### Step 2: Run App
```bash
streamlit run app.py
```

### Step 3: Use in Browser
1. Select "Select Test Image" → Pick your image
2. View results in main panel
3. Check metrics on right panel
4. Click "Export" to save JSON

---

## ⚙️ CUSTOMIZE

Edit `config.py` to change:
```python
MODEL_PATH = "best.pt"                    # Model location
CONFIDENCE_THRESHOLD = 0.5                # Detection sensitivity
BBOX_COLOR = (0, 255, 0)                  # Box color (BGR)
MAX_UPLOAD_SIZE_MB = 100                  # Upload limit
```

---

## 🐛 QUICK TROUBLESHOOT

| Problem | Solution |
|---------|----------|
| Module error | `pip install -r requirements.txt --force-reinstall` |
| Model not found | Place `best.pt` in project folder |
| No detections | Lower `CONFIDENCE_THRESHOLD` in config |
| Slow | Enable GPU or reduce image size |
| Won't start | Check Python 3.8+: `python --version` |

---

## 📊 METRICS EXPLAINED

For **each detected plant**:
```
Height (px) = Vertical pixels of box
Width (px)  = Horizontal pixels of box
Area (px²)  = Height × Width
```

**Summary includes:** Average, Min, Max, Std Dev

---

## 🎯 FILE LOCATIONS

```
Project root:           /home/nihal/Documents/growloc/canopy_metrics_ui
Main app:              app.py
Configuration:         config.py
Model:                 best.pt (must be here!)
Test images:           test_images/ (add images here!)
Utilities:             utils.py
Help docs:             *.md files
```

---

## 📞 DOCUMENTATION QUICK LINKS

- 🚀 **Get started:** START_HERE.md
- ⚡ **Fast setup:** QUICKSTART.md  
- 📚 **Full details:** README.md
- ✅ **Verify install:** INSTALLATION_CHECKLIST.md
- 📋 **Project info:** PROJECT_COMPLETION_SUMMARY.md

---

## 💡 PRO TIPS

1. **Batch processing:** Re-upload multiple images one at a time
2. **Export metrics:** Use JSON export for analysis in other tools
3. **Real-world units:** Multiply pixels by calibration factor
4. **Different model:** Change `MODEL_PATH` in `config.py`
5. **More sensitivity:** Lower `CONFIDENCE_THRESHOLD` value

---

## ✨ REQUIREMENTS MET ✅

- [x] Load YOLOv8 model from best.pt
- [x] Upload or select test images
- [x] Run YOLO inference
- [x] Extract bounding boxes
- [x] Calculate height, width, area
- [x] Display metrics clearly
- [x] Draw bounding boxes on image
- [x] Show annotated image
- [x] Support multiple plants
- [x] Simple UI with sidebar
- [x] Run with: streamlit run app.py

---

## 🚀 LAUNCH NOW!

```bash
streamlit run app.py
```

**Browser opens at:** http://localhost:8501 ✅

---

## 📋 SYSTEM REQUIREMENTS

- Python 3.8+
- 4GB RAM minimum
- 5GB disk space
- Internet (first-time setup)

GPU optional but recommended!

---

## 📊 QUICK STATS

- **Python Files:** 5 (app, utils, config, setup, examples)
- **Documentation:** 7 comprehensive guides
- **Setup Scripts:** 3 (for all platforms)
- **Total Code:** ~950 lines
- **Code Quality:** ✅ Validated syntax
- **Status:** ✅ Ready to use

---

## 🎉 YOU'RE ALL SET!

Everything is installed and configured.

**Next step:**
```bash
streamlit run app.py
```

**Questions?** Check START_HERE.md first!

---

**App Status:** ✅ READY  
**Last Updated:** March 2026  
**Version:** 1.0

🌱 **Happy analyzing!**
