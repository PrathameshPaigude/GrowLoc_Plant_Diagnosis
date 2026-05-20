# 🍃 Leaf Counting & Phenotypic Color Analyzer (leavescounting27m)

An enterprise-grade computer vision tool built with **YOLOv8** and **OpenCV** to automatically detect, count, and analyze the health of plant leaves. 

Moving beyond simple object detection, this pipeline uses **HSV (Hue, Saturation, Value) pixel mapping** to isolate individual leaves and categorize their phenotypic health based on accurate color profiling—completely bypassing indoor lighting glare.

## ✨ Features
* **Custom AI Brain:** Trained on a massive 39,000+ image dataset using dual Tesla T4 GPUs. Achieved a strict Mask mAP50-95 of 85.2%.
* **Phenotypic Profiling:** Categorizes detected leaves into: `Green`, `Light Green`, `Yellow`, `Orange`, `Red`, `White`, and `Dark/Brown`.
* **Glare Immunity:** Converts raw RGB pixels into HSV space to accurately classify colors even in harsh indoor lighting or bright sun.
* **Production-Ready Output:** Bypasses standard matplotlib popups to natively write high-resolution, labeled analytical images directly to the hard drive.

---

## 🚀 Getting Started

Follow these steps to set up the AI and run predictions on your local machine.

### 1. Clone the Repository 
install ultralytics library

**2. Download the AI Weights (Important!)**
Due to GitHub's file size limits, the 156 MB trained AI weights (YOLOv8_Production_Best.pt) are hosted externally.

3.https://drive.google.com/drive/folders/1BJTC4OeOx-ZAGQwP2-6_JBbqNP_DiMQA?usp=sharing

**4.Download the YOLOv8_Production_Best.pt file.**

5.Place the downloaded .pt file directly into the main **leavescounting27m project folder**

6.Place any test image of a plant into your project folder (e.g., inside a test/ folder).

7.Open predict.py in your code editor.

8.Update the test_image_path variable on line 44 to point to your image:

test_image_path = 'test/your_image_name.jpg'
Run the script from your terminal:


**python predict.py**
