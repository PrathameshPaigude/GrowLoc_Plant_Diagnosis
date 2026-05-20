#!/bin/bash

# Plant Canopy Metrics Estimator - Setup Script
# This script sets up the environment and runs the application

echo "=========================================="
echo "Plant Canopy Metrics Estimator - Setup"
echo "=========================================="
echo ""

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or later."
    exit 1
fi

echo "✓ Python version: $(python3 --version)"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"

echo ""

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Error installing dependencies"
    exit 1
fi

echo ""

# Check for best.pt
if [ ! -f "best.pt" ]; then
    echo "⚠️  Warning: best.pt model file not found in $(pwd)"
    echo "   Please ensure your trained YOLOv8 model is placed as 'best.pt' in this directory"
    echo "   The application will fail to run without it."
    echo ""
fi

# Create test_images directory if needed
if [ ! -d "test_images" ]; then
    mkdir -p test_images
    echo "✓ test_images directory created"
fi

echo ""
echo "=========================================="
echo "Setup complete! ✓"
echo "=========================================="
echo ""
echo "To run the application, use:"
echo "  streamlit run app.py"
echo ""
echo "The app will open at: http://localhost:8501"
echo ""
