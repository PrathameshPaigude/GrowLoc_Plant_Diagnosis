# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Download and Prepare

1. Navigate to the project directory:
   ```bash
   cd /home/nihal/Documents/growloc/canopy_metrics_ui
   ```

2. Ensure your trained `best.pt` model file is in this directory

### Step 2: Install Dependencies

**Option A: Using setup script (Linux/Mac)**
```bash
chmod +x setup.sh
./setup.sh
```

**Option B: Using Python setup script (All platforms)**
```bash
python setup.py
```

**Option C: Manual installation**
```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### Step 3: Prepare Test Images (Optional)

Add sample plant images to the `test_images/` folder:
- Copy JPG, PNG, or other image files into `test_images/`
- Images will appear in the app's "Select Test Image" dropdown

### Step 4: Run the Application

```bash
streamlit run app.py
```

The app will open automatically at `http://localhost:8501`

### Step 5: Use the Application

1. **Sidebar** (Left side):
   - Choose to upload an image or select a test image
   - Upload using the file uploader
   - Or select from test images dropdown

2. **Main Panel** (Center):
   - View the plant image with detection boxes
   - Green boxes show detected plant canopies
   - Labels show height and width for each plant

3. **Metrics Panel** (Right):
   - View individual plant measurements
   - See summary statistics
   - Export metrics as JSON if needed

## 📊 Understanding the Metrics

- **Canopy Height**: Vertical pixels of the bounding box
- **Canopy Width**: Horizontal pixels of the bounding box  
- **Canopy Area**: Height × Width (in square pixels)

## 🔧 Troubleshooting

### Issue: "Model file not found"
**Solution**: Ensure `best.pt` is in the same directory as `app.py`

### Issue: No detections found
**Solution**: 
- Verify the model is trained for your use case
- Try images similar to training data
- Check model confidence threshold in `config.py`

### Issue: Module not found errors
**Solution**: Reinstall dependencies
```bash
pip install -r requirements.txt --force-reinstall
```

### Issue: Out of memory
**Solution**: 
- Resize images before uploading
- Close other applications
- Use GPU if available

## 📁 Project Files

```
canopy_metrics_ui/
├── app.py              ← Main application (run this!)
├── config.py           ← Configuration settings
├── requirements.txt    ← Dependencies
├── setup.sh           ← Linux/Mac setup script
├── setup.py           ← Python setup script
├── README.md          ← Full documentation
├── best.pt            ← Your model (add this)
├── test_images/       ← Add sample images here
└── temp_uploads/      ← Temporary file storage
```

## 💡 Tips

1. **Batch Processing**: Process multiple images by re-uploading
2. **Export Results**: Use the JSON export button to save metrics
3. **Calibration**: Real-world measurements need pixel-to-distance calibration
4. **Model Path**: To use a different model, edit `config.py`

## 📖 More Information

For detailed information, see:
- `README.md` - Full documentation
- `config.py` - Configuration options
- `app.py` - Source code comments

## 🎯 Next Steps

1. ✓ Set up the environment
2. ✓ Add your best.pt model
3. ✓ Add test images (optional)
4. ✓ Run: `streamlit run app.py`
5. ✓ Start analyzing plant canopies!

## ❓ Common Questions

**Q: How do I add more test images?**
A: Copy image files to the `test_images/` folder

**Q: Can I use my own model?**
A: Yes, replace `best.pt` with your own YOLOv8 model

**Q: What if detections are incorrect?**
A: Train a new model on your specific plant type

**Q: How do I get real-world measurements?**
A: You need to calibrate pixels to real units (requires reference object)

---

**Ready? Run:** `streamlit run app.py`

Enjoy analyzing plant canopies! 🌱
