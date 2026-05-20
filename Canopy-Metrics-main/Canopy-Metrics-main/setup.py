"""
Plant Canopy Metrics Estimator - Setup Script (Python version)
Run this to set up the environment and check dependencies
"""

import os
import sys
import subprocess
from pathlib import Path

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 50)
    print(f"  {text}")
    print("=" * 50 + "\n")

def check_python_version():
    """Check if Python version is 3.8 or later"""
    print("Python version: ", end="")
    if sys.version_info >= (3, 8):
        print(f"✓ {sys.version}")
        return True
    else:
        print(f"✗ {sys.version}")
        print("Error: Python 3.8 or later is required.")
        return False

def create_venv():
    """Create virtual environment if it doesn't exist"""
    venv_path = Path("venv")
    if venv_path.exists():
        print("✓ Virtual environment already exists")
        return True
    
    try:
        print("Creating virtual environment...")
        subprocess.check_call([sys.executable, "-m", "venv", "venv"])
        print("✓ Virtual environment created")
        return True
    except Exception as e:
        print(f"✗ Error creating virtual environment: {e}")
        return False

def install_requirements():
    """Install requirements from requirements.txt"""
    try:
        print("Installing dependencies from requirements.txt...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
        return True
    except Exception as e:
        print(f"✗ Error installing dependencies: {e}")
        return False

def check_model_file():
    """Check if best.pt model file exists"""
    model_path = Path("best.pt")
    if model_path.exists():
        size_mb = model_path.stat().st_size / (1024 * 1024)
        print(f"✓ Model file found: best.pt ({size_mb:.1f} MB)")
        return True
    else:
        print("⚠  Warning: best.pt model file not found")
        print("   Place your trained YOLOv8 model as 'best.pt' in this directory")
        return False

def create_directories():
    """Create necessary directories"""
    dirs = [
        Path("test_images"),
        Path("temp_uploads")
    ]
    
    for dir_path in dirs:
        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"✓ Created directory: {dir_path}")
        else:
            print(f"✓ Directory exists: {dir_path}")

def verify_imports():
    """Try importing key packages"""
    print("\nVerifying package imports...")
    packages = {
        "streamlit": "Streamlit",
        "ultralytics": "Ultralytics",
        "cv2": "OpenCV",
        "numpy": "NumPy",
        "PIL": "Pillow",
    }
    
    all_ok = True
    for package, name in packages.items():
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ✗ {name} - NOT INSTALLED")
            all_ok = False
    
    return all_ok

def main():
    """Main setup function"""
    print_header("Plant Canopy Metrics Estimator - Setup")
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Create virtual environment
    if not create_venv():
        sys.exit(1)
    
    # Install requirements
    print("\n" + "=" * 50)
    print("Installing requirements...")
    print("=" * 50)
    
    if not install_requirements():
        print("Note: Installation may have failed. Check the output above.")
    
    # Create directories
    print("\n" + "=" * 50)
    print("Creating directories...")
    print("=" * 50 + "\n")
    create_directories()
    
    # Check model file
    print("\n" + "=" * 50)
    print("Checking model file...")
    print("=" * 50 + "\n")
    check_model_file()
    
    # Verify imports
    print("\n" + "=" * 50)
    print("Package verification...")
    print("=" * 50)
    verify_imports()
    
    # Summary
    print_header("Setup Complete!")
    print("✓ Environment is ready")
    print("\nTo run the application:")
    print("  1. Activate virtual environment (if using):")
    print("     - Linux/Mac: source venv/bin/activate")
    print("     - Windows: venv\\Scripts\\activate")
    print("\n  2. Run Streamlit:")
    print("     streamlit run app.py")
    print("\nThe app will open at: http://localhost:8501")
    print("\nNotes:")
    print("- Ensure best.pt is in the current directory")
    print("- Add test images to the test_images/ folder")
    print("- Check README.md for more information")
    print()

if __name__ == "__main__":
    main()
