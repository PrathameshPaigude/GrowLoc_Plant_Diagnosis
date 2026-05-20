import cv2
from ultralytics import YOLO

print("🚀 Booting up Strawberry AI (Image Mode)...")

# 1. Load your local model
# Ensure this file is in the same folder as this script
model = YOLO('strawberry_master_model.pt')

# 2. Apply our Ultimate Fix to sync the class IDs
model.model.names = {0: 'Green', 1: 'Pink', 2: 'Red', 3: 'White'}

# 3. 🎯 THE TARGET IMAGE
# Put a picture of strawberries in the same folder, and type its name here:
image_path = 'G:\STRAWBERRY_AI\mytrial_images\9inOne.jpeg' 

# Load the image
frame = cv2.imread(image_path)

if frame is None:
    print(f"❌ Error: Could not load image '{image_path}'. Make sure the file exists and the name matches exactly!")
    exit()

print(f"📸 Analyzing image: {image_path}")

# 4. Run inference (keeping the strict IOU filtering)
results = model(frame, conf=0.5, iou=0.4, verbose=False)

# 5. Extract and print the counts
counts = {'Green': 0, 'White': 0, 'Pink': 0, 'Red': 0}
for c in results[0].boxes.cls:
    label = results[0].names[int(c)]
    counts[label] += 1

print("\n" + "="*30)
print("🍓 HARVEST COUNT 🍓")
print("="*30)
total = sum(counts.values())
print(f"Total Strawberries: {total}")
for color, count in counts.items():
    print(f"- {color}: {count}")
print("="*30 + "\n")

# 6. Draw the bounding boxes natively
annotated_frame = results[0].plot()

# 7. Smart Resize (Just in case your gallery photos are massive 4K images)
height, width = annotated_frame.shape[:2]
max_display_height = 800 # Limits the window height to 800 pixels

if height > max_display_height:
    scale = max_display_height / height
    annotated_frame = cv2.resize(annotated_frame, (int(width * scale), int(height * scale)))

# 8. Display the final image
cv2.imshow("Strawberry AI - Image Analysis", annotated_frame)
print("Press any key on the image window to close it.")

# This tells Python to keep the window open until you press a button
cv2.waitKey(0)
cv2.destroyAllWindows()