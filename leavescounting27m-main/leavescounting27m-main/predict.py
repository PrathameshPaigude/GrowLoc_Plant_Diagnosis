from ultralytics import YOLO
import cv2
import numpy as np

def get_leaf_color(img_bgr, polygon_points):
    """Isolates the leaf and returns its dominant color category."""
    mask = np.zeros(img_bgr.shape[:2], dtype=np.uint8)
    pts = np.array(polygon_points, np.int32).reshape((-1, 1, 2))
    cv2.fillPoly(mask, [pts], 255)

    # Convert the true colors to HSV
    hsv_img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    valid_pixels = hsv_img[mask == 255]

    if len(valid_pixels) == 0:
        return "Unknown"

    avg_hsv = np.median(valid_pixels, axis=0)
    h, s, v = avg_hsv  

    # 1. Check for White/Pale leaves (Low Saturation, High Brightness)
    if s < 60 and v > 150:
        return "White"
    
    # 2. Check for very dark/dead leaves (Low Brightness)
    if v < 50:
        return "Dark/Brown"

    # 3. Standard Hue check on the 360-degree color wheel
    if h < 10 or h > 165:
        return "Red"
    elif h >= 10 and h < 22:
        return "Orange"
    elif h >= 22 and h < 35:
        return "Yellow"
    elif h >= 35 and h < 45:
        return "Light Green"
    elif h >= 45 and h <= 85:
        return "Green"
    else:
        return "Other"

# ==========================================
# MAIN EXECUTION
# ==========================================
print("Loading model...")
model = YOLO('G:/leavescounting27m/YOLOv8_Production_Best.pt')

# Point it to your beautiful multi-colored plant image
test_image_path = 'G:/leavescounting27m/test/dirtyleaves.jpg' # Update filename if needed

print("Running prediction...")
results = model.predict(source=test_image_path, conf=0.4, save=False)
result = results[0]

color_tally = {"Green": 0, "Light Green": 0, "Yellow": 0, "Orange": 0, "Red": 0, "White": 0, "Dark/Brown": 0, "Other": 0}
total_leaves = len(result.boxes)

# Extract the base image without YOLO's default labels
result_array = result.plot(labels=False)
original_img = result.orig_img

if result.masks is not None:
    for box, mask_polygon in zip(result.boxes.xyxy, result.masks.xy):
        # Calculate the true color
        leaf_color = get_leaf_color(original_img, mask_polygon)
        if leaf_color in color_tally:
            color_tally[leaf_color] += 1
            
        x1, y1, x2, y2 = map(int, box)
        
        # Draw a sleek dark gray background box for the text so it pops
        cv2.rectangle(result_array, (x1, y1 - 20), (x1 + 100, y1), (50, 50, 50), -1)
        cv2.putText(result_array, leaf_color, (x1 + 5, y1 - 5), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

# Build the dynamic title for the terminal and image
title_parts = [f"Total Leaves: {total_leaves}"]
for color, count in color_tally.items():
    if count > 0:
        title_parts.append(f"{color}: {count}")
dynamic_title = " | ".join(title_parts)

# Print to terminal
print("\n" + "="*80)
print(dynamic_title)
print("="*80 + "\n")

# Draw the black title bar across the top of the image
cv2.rectangle(result_array, (0, 0), (result_array.shape[1], 40), (0, 0, 0), -1)
cv2.putText(result_array, dynamic_title, (15, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

# SAVE the image directly to your hard drive (Bypassing Matplotlib entirely)
output_path = 'G:/leavescounting27m/test/final_analyzed_output.jpg'
cv2.imwrite(output_path, result_array)

print(f"✅ Analysis complete! Saved crystal clear image to: {output_path}")