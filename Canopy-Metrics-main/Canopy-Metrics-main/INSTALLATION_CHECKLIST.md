# Installation & Verification Checklist

## ✅ Pre-Installation Requirements

- [ ] Python 3.8 or later installed
- [ ] pip (Python package manager) available
- [ ] ~5GB disk space for dependencies
- [ ] Internet connection for downloads (one-time)
- [ ] GPU optional but recommended for faster inference

**Check Python version:**
```bash
python --version
```

Should show: `Python 3.8.x` or higher

---

## 📥 Step 1: Download/Setup Project

- [ ] Project folder: `/home/nihal/Documents/growloc/canopy_metrics_ui`
- [ ] `best.pt` model file is in project root
- [ ] `test_images/` directory exists (now ready for images)
- [ ] All Python files present:
  - [ ] app.py
  - [ ] utils.py
  - [ ] config.py
  - [ ] setup.py
  - [ ] examples.py

**Verify files:**
```bash
cd /home/nihal/Documents/growloc/canopy_metrics_ui
ls -la *.py
```

Should show: `app.py`, `config.py`, `examples.py`, `setup.py`, `utils.py`

---

## 🔧 Step 2: Create Virtual Environment

- [ ] Virtual environment created
- [ ] Activation command works

**Create venv:**
```bash
python -m venv venv
```

**Activate venv:**
```bash
# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**Verify activation:** Prompt should show `(venv)` prefix

---

## 📦 Step 3: Install Dependencies

- [ ] requirements.txt file present
- [ ] All packages installed successfully
- [ ] No error messages during installation

**Install packages:**
```bash
pip install -r requirements.txt
```

**Verify installation:**
```bash
pip list
```

Should show:
- [ ] streamlit (≥1.28.0)
- [ ] ultralytics (≥8.0.0)
- [ ] opencv-python (≥4.8.0)
- [ ] torch (≥2.0.0)
- [ ] numpy (≥1.24.0)

---

## ✨ Step 4: Verify Model & Configuration

- [ ] `best.pt` exists in project root
- [ ] `config.py` is readable
- [ ] `.streamlit/config.toml` exists

**Check model:**
```bash
ls -lh best.pt
```

Should show file size (typically 100-200+ MB)

**Check configuration:**
```bash
head -5 config.py
```

Should show model path configuration

---

## 📸 Step 5: Prepare Test Images (Optional)

- [ ] `test_images/` directory exists
- [ ] At least one test image added (optional)
- [ ] Image formats supported: JPG, PNG, BMP, GIF

**Add test images:**
```bash
# Copy image file to test_images folder
cp /path/to/image.jpg test_images/
```

**List test images:**
```bash
ls -la test_images/
```

---

## 🚀 Step 6: Run the Application

- [ ] Terminal in correct directory
- [ ] Virtual environment activated
- [ ] Streamlit command executes

**Start application:**
```bash
streamlit run app.py
```

**Expected output:**
```
  You can now view your Streamlit app in your browser.

  Local URL: http://localhost:8501
  Network URL: http://[your-ip]:8501
```

- [ ] Browser opens automatically or you can navigate to URL
- [ ] Application loads without errors

---

## 🧪 Step 7: Test Functionality

### Upload Image Test
- [ ] Click "Upload Image" radio button
- [ ] Upload a plant image
- [ ] Image displays in main panel

### Detection Test
- [ ] If detections exist, green boxes appear
- [ ] Metrics panel shows detected plants
- [ ] Numbers appear in metrics (Height, Width, Area)

### Test Images Test
- [ ] Click "Select Test Image" radio button
- [ ] Select a test image from dropdown
- [ ] Image loads and processes
- [ ] Detections and metrics appear

### Export Test
- [ ] Metrics appear for detected plants
- [ ] Click "📥 Export Metrics as JSON" button
- [ ] JSON data displays in expandable section
- [ ] Data is readable and valid

---

## 🐛 Troubleshooting Checklist

### Issue: Python not found
- [ ] Install Python 3.8+
- [ ] Add Python to PATH
- [ ] Restart terminal
- [ ] Try `python3 --version`

### Issue: Module not found
```bash
pip install -r requirements.txt --force-reinstall
```
- [ ] Try reinstalling

### Issue: Model not found
- [ ] Copy `best.pt` to project root
- [ ] Verify file exists: `ls -la best.pt`
- [ ] Check file size > 50MB
- [ ] Restart Streamlit

### Issue: No detections
- [ ] Check model is YOLOv8 format
- [ ] Try image similar to training data
- [ ] Lower confidence in config: `CONFIDENCE_THRESHOLD = 0.3`
- [ ] Check image size reasonable

### Issue: Out of memory
- [ ] Close other applications
- [ ] Resize images before uploading
- [ ] Use system with more RAM
- [ ] Consider GPU with CUDA

### Issue: Slow inference
- [ ] Install CUDA if GPU available
- [ ] Use GPU version of PyTorch
- [ ] Reduce image resolution
- [ ] Update to latest Ultralytics

---

## 📊 Performance Verification

Run this to check system performance:

```python
import torch
from ultralytics import YOLO

print("PyTorch Version:", torch.__version__)
print("CUDA Available:", torch.cuda.is_available())
print("GPU Name:", torch.cuda.get_device_name() if torch.cuda.is_available() else "N/A")

model = YOLO("best.pt")
print("Model Loaded Successfully")
print("Model Device:", next(model.model.parameters()).device)
```

Performance notes:
- [ ] GPU significantly faster than CPU
- [ ] First inference slower (model initialization)
- [ ] Subsequent inferences cached and faster

---

## 📝 Final Verification Checklist

- [ ] All files created successfully
- [ ] Virtual environment working
- [ ] All dependencies installed
- [ ] best.pt model accessible
- [ ] Streamlit runs without errors
- [ ] Application opens in browser
- [ ] Image upload works
- [ ] YOLO detections appear
- [ ] Metrics display correctly
- [ ] Export functionality works
- [ ] No error messages in console

---

## 🎉 Success Indicators

### Green Light ✅
- Application starts: `streamlit run app.py`
- Browser opens at `http://localhost:8501`
- Sidebar shows image upload/selection
- Main panel ready for images
- Metrics panel displays
- No red error boxes

### What to do next
1. Add your plant images to `test_images/`
2. Upload test plant images
3. View detection results
4. Customize in `config.py` as needed
5. Export and analyze metrics

---

## 🆘 Get Help

1. Check error message in terminal
2. Review console output in browser (F12)
3. Check README.md for detailed docs
4. Review QUICKSTART.md for setup help
5. Verify requirements in this checklist

---

## 📞 Common Questions

**Q: Application won't run**
A: Check Python version (3.8+), verify dependencies installed, ensure model exists

**Q: No detections found**
A: Verify model trained for your use case, try different images, check confidence threshold

**Q: Very slow inference**
A: Enable GPU with CUDA, reduce image size, wait for first inference to complete

**Q: Can't find test_images folder**
A: It's created automatically, add images to: `test_images/` in project root

---

## ✅ Completion

When all items are checked:
1. You have ✅ successfully installed the application
2. You have ✅ verified all components work
3. You are ✅ ready to analyze plant canopy metrics

**Next Step:** Add plant images and start using the application!

```bash
streamlit run app.py
```

---

**Setup Complete:** 🎉  
**Date:** March 12, 2026  
**Application:** Plant Canopy Metrics Estimator v1.0
