#!/bin/bash

# Plant Canopy Metrics Estimator - Quick Start Script
# Simple script to run the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Header
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       Plant Canopy Metrics Estimator - Launcher           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if best.pt exists
if [ ! -f "best.pt" ]; then
    echo -e "${YELLOW}⚠️  Warning: best.pt model not found${NC}"
    echo "   This file is required to run the application"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Check if requirements are installed
echo -e "${YELLOW}Checking dependencies...${NC}"
python -c "import streamlit" 2>/dev/null || {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip install -q -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Launch Streamlit
echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════"
echo "Starting Streamlit Application..."
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo "The application will open in your browser at:"
echo -e "${GREEN}http://localhost:8501${NC}"
echo ""
echo "To stop the application, press: ${YELLOW}Ctrl+C${NC}"
echo ""

# Run Streamlit
streamlit run app.py
