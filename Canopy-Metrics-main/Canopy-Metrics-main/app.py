import streamlit as st
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO
from PIL import Image
import os
import config

# Page configuration
st.set_page_config(
    page_title="Plant Canopy Metrics Estimator", 
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        text-align: center;
        padding: 20px 0;
        margin-bottom: 30px;
        border-bottom: 2px solid #2ecc71;
    }
    .metric-card {
        padding: 15px;
        border-radius: 8px;
        background: rgba(46, 204, 113, 0.1);
        border-left: 4px solid #2ecc71;
        margin: 10px 0;
    }
    .stat-highlight {
        font-size: 1.2em;
        font-weight: bold;
        color: #2ecc71;
    }
</style>
""", unsafe_allow_html=True)

# Title with better styling
col_title1, col_title2, col_title3 = st.columns([1, 2, 1])
with col_title2:
    st.markdown("<div class='main-header'><h1>🌱 Plant Canopy Metrics Estimator</h1></div>", unsafe_allow_html=True)

# Load the model
@st.cache_resource
def load_model():
    """Load the YOLOv8 model from disk."""
    candidates = [
        Path(getattr(config, "MODEL_PATH", "models/best.pt")),
        Path("models/best.pt"),
        Path("best.pt"),
    ]

    model_path = next((p for p in candidates if p.exists()), None)
    if model_path is None:
        st.error(
            "Model file not found. Put your weights at one of:\n"
            "- models/best.pt (recommended)\n"
            "- best.pt (project root)\n"
            f"\nconfig.MODEL_PATH currently points to: {getattr(config, 'MODEL_PATH', None)}"
        )
        st.stop()

    return YOLO(str(model_path))

def draw_bounding_boxes(image, detections):
    """Draw bounding boxes on the image"""
    annotated_image = image.copy()
    
    if detections is None or len(detections) == 0:
        return annotated_image, []
    
    metrics_list = []
    
    # Draw boxes for each detection
    for detection in detections:
        box = detection.xyxy[0].cpu().numpy()
        x1, y1, x2, y2 = map(int, box)
        
        # Calculate canopy metrics
        canopy_height = y2 - y1
        canopy_width = x2 - x1
        canopy_area = canopy_height * canopy_width
        
        # Store metrics
        metrics_list.append({
            "height": canopy_height,
            "width": canopy_width,
            "area": canopy_area,
            "box": (x1, y1, x2, y2)
        })
        
        # Draw bounding box (green rectangle)
        cv2.rectangle(annotated_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        # Add label with metrics
        label = f"H:{canopy_height}px W:{canopy_width}px"
        font_scale = 0.6
        thickness = 1
        text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)[0]
        
        # Draw background for text
        cv2.rectangle(annotated_image, 
                     (x1, y1 - text_size[1] - 10),
                     (x1 + text_size[0] + 5, y1),
                     (0, 255, 0), -1)
        
        # Draw text
        cv2.putText(annotated_image, label, (x1 + 2, y1 - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), thickness)
    
    return annotated_image, metrics_list

def get_test_images():
    """Get list of test images from test_images folder"""
    test_images_dir = Path("test_images")
    if not test_images_dir.exists():
        return []
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}
    images = [f for f in os.listdir(test_images_dir) 
              if Path(f).suffix.lower() in image_extensions]
    return sorted(images)

def process_image(image_path, model):
    """Process image and run YOLO inference"""
    # Read image
    image = cv2.imread(image_path)
    if image is None:
        st.error(f"Could not read image from {image_path}")
        return None, None
    
    # Convert BGR to RGB for display
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Run inference
    results = model(image_path)
    
    # Get detections from results
    detections = results[0].boxes if results else None
    
    # Draw bounding boxes
    annotated_image, metrics_list = draw_bounding_boxes(image, detections)
    annotated_image_rgb = cv2.cvtColor(annotated_image, cv2.COLOR_BGR2RGB)
    
    return annotated_image_rgb, metrics_list


def add_calibrated_metrics(metrics_list, cm_per_pixel):
    """Add cm/cm² fields to each metrics dict (non-destructive copy)."""
    if not metrics_list:
        return []
    if cm_per_pixel is None:
        return [dict(m) for m in metrics_list]
    out = []
    for m in metrics_list:
        h_cm = m["height"] * cm_per_pixel
        w_cm = m["width"] * cm_per_pixel
        a_cm2 = (m["area"] * (cm_per_pixel ** 2))
        m2 = dict(m)
        m2["height_cm"] = float(h_cm)
        m2["width_cm"] = float(w_cm)
        m2["area_cm2"] = float(a_cm2)
        out.append(m2)
    return out

# Main layout
col1, col2 = st.columns([2, 1])

# Sidebar for image selection
with st.sidebar:
    st.header("📷 Image Selection")
    
    image_source = st.radio("Choose image source:", ["Upload Image", "Select Test Image"], label_visibility="collapsed")

    st.divider()
    st.header("⚖️ Calibration (px → cm)")
    enable_calibration = st.checkbox(
        "Enable real-world units",
        value=bool(getattr(config, "CM_PER_PIXEL", None)),
        help="Provide a scale factor to convert pixels to centimeters.",
    )
    cm_per_pixel = None
    if enable_calibration:
        default = getattr(config, "CM_PER_PIXEL", None) or 0.1
        cm_per_pixel = st.number_input(
            "Centimeters per pixel (cm/px)",
            min_value=0.000001,
            value=float(default),
            format="%.6f",
            help="Example: if 100 px = 10 cm, enter 0.1",
        )
    
    image_path = None
    
    if image_source == "Upload Image":
        uploaded_file = st.file_uploader("Upload an image", type=["jpg", "jpeg", "png", "bmp", "gif"])
        if uploaded_file is not None:
            # Save uploaded file temporarily
            temp_dir = Path("temp_uploads")
            temp_dir.mkdir(exist_ok=True)
            image_path = temp_dir / uploaded_file.name
            with open(image_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
    
    else:  # Select Test Image
        test_images = get_test_images()
        if test_images:
            selected_image = st.selectbox("Choose a test image:", test_images)
            image_path = Path("test_images") / selected_image
        else:
            st.warning("No test images found in test_images folder.")

# Main content area
with col1:
    if image_path is not None:
        # Load model
        try:
            model = load_model()
        except Exception as e:
            st.error(f"Error loading model: {e}")
            st.stop()
        
        # Process image
        try:
            annotated_image, metrics_list = process_image(str(image_path), model)
            metrics_list = add_calibrated_metrics(metrics_list, cm_per_pixel)
            
            if annotated_image is not None:
                st.image(annotated_image, caption="Annotated Image with Detections", use_column_width=True)
            else:
                st.error("Could not process the image.")
        except Exception as e:
            st.error(f"Error processing image: {e}")
    else:
        st.info("👈 Please select or upload an image from the sidebar to begin.")
        annotated_image = None
        metrics_list = []

# Metrics panel on the right
with col2:
    st.header("📊 Canopy Metrics")
    
    if annotated_image is not None and metrics_list:
        st.markdown(f"<div class='stat-highlight'>✓ Detected {len(metrics_list)} plant(s)</div>", unsafe_allow_html=True)
        st.markdown("")
        
        # Display metrics for each plant
        for idx, metrics in enumerate(metrics_list, 1):
            with st.expander(f"🌿 Plant {idx}", expanded=(idx == 1)):
                col_m1, col_m2 = st.columns(2)
                
                with col_m1:
                    if cm_per_pixel is not None and "height_cm" in metrics:
                        st.metric("📏 Height", f"{metrics['height_cm']:.2f} cm")
                        st.metric("📐 Area", f"{metrics['area_cm2']:.2f} cm²")
                    else:
                        st.metric("📏 Height", f"{metrics['height']} px")
                        st.metric("📐 Area", f"{metrics['area']} px²")
                
                with col_m2:
                    if cm_per_pixel is not None and "width_cm" in metrics:
                        st.metric("↔️ Width", f"{metrics['width_cm']:.2f} cm")
                    else:
                        st.metric("↔️ Width", f"{metrics['width']} px")

                if cm_per_pixel is not None and "height_cm" in metrics:
                    st.caption(
                        f"**Pixels:** H {metrics['height']} px • "
                        f"W {metrics['width']} px • "
                        f"A {metrics['area']} px²"
                    )
        
        # Summary statistics
        st.divider()
        st.subheader("📈 Summary Statistics")
        
        avg_height = np.mean([m['height'] for m in metrics_list])
        avg_width = np.mean([m['width'] for m in metrics_list])
        avg_area = np.mean([m['area'] for m in metrics_list])
        
        if cm_per_pixel is not None:
            col_s1, col_s2, col_s3 = st.columns(3)
            with col_s1:
                st.metric("Avg Height", f"{(avg_height * cm_per_pixel):.2f} cm")
            with col_s2:
                st.metric("Avg Width", f"{(avg_width * cm_per_pixel):.2f} cm")
            with col_s3:
                st.metric("Avg Area", f"{(avg_area * (cm_per_pixel ** 2)):.2f} cm²")
            st.caption(
                f"**Pixels:** H {avg_height:.1f} px • "
                f"W {avg_width:.1f} px • "
                f"A {avg_area:.1f} px²"
            )
        else:
            col_s1, col_s2, col_s3 = st.columns(3)
            with col_s1:
                st.metric("Avg Height", f"{avg_height:.1f} px")
            with col_s2:
                st.metric("Avg Width", f"{avg_width:.1f} px")
            with col_s3:
                st.metric("Avg Area", f"{avg_area:.1f} px²")
        
        # Export button
        st.divider()
        if st.button("📥 Export Metrics as JSON", use_container_width=True):
            import json
            export_data = {
                "num_plants": len(metrics_list),
                "plants": metrics_list,
                "summary": {
                    "avg_height": float(avg_height),
                    "avg_width": float(avg_width),
                    "avg_area": float(avg_area)
                },
                "calibration": {
                    "cm_per_pixel": (float(cm_per_pixel) if cm_per_pixel is not None else None)
                },
            }
            st.json(export_data)
    
    else:
        st.info("👈 **Select an image to see metrics here**")

# Footer
st.divider()
st.markdown(
    "<p style='text-align: center; color: #888; font-size: 0.85em;'>"
    "🌱 Plant Canopy Metrics Estimator • Powered by YOLOv8 and OpenCV"
    "</p>",
    unsafe_allow_html=True
)
