@echo off
REM Plant Canopy Metrics Estimator - Quick Start Script (Windows)
REM Simple script to run the application on Windows

cls
echo.
echo ============================================================
echo    Plant Canopy Metrics Estimator - Launcher (Windows)
echo ============================================================
echo.

REM Check if best.pt exists
if not exist "best.pt" (
    echo [WARNING] best.pt model not found
    echo This file is required to run the application
    echo Please ensure best.pt is in this directory
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if requirements are installed
python -c "import streamlit" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -q -r requirements.txt
    echo Dependencies installed
)

REM Launch Streamlit
cls
echo.
echo ============================================================
echo Starting Streamlit Application...
echo ============================================================
echo.
echo The application will open in your browser at:
echo http://localhost:8501
echo.
echo To stop the application, press: Ctrl+C
echo.

REM Run Streamlit
streamlit run app.py

pause
