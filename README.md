# 🏥 AIRDC — AI-Driven Respiratory Disease Classification

A comprehensive web-based diagnostic platform that uses deep learning to classify chest X-ray images into **Normal**, **Pneumonia**, and **Tuberculosis**, with explainable AI visualizations using Grad-CAM.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21-orange?logo=tensorflow)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Flask](https://img.shields.io/badge/Flask-3.x-black?logo=flask)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Two-Stage Pipeline** | MobileNetV2 gatekeeper validates input + VGG16 classifies disease |
| 🧠 **Grad-CAM Explainability** | Interactive heatmap overlay showing AI attention regions |
| 🩺 **3-Class Classification** | Normal, Pneumonia, Tuberculosis detection |
| 📊 **Probability Distribution** | Per-class confidence scores with animated bars |
| 📜 **Prediction History** | Persistent history with thumbnails via localStorage |
| 🎨 **Premium UI** | Glassmorphism, particle animations, responsive design |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│                FRONTEND (React)                  │
│  ImageUploader → ResultDisplay → GradCAMViewer   │
│  Features, History, Chatbot, ParticleBackground  │
│                  Port 3000                       │
└──────────────────────┬──────────────────────────┘
                       │ HTTP POST /predict
                       │ (multipart form)
┌──────────────────────▼──────────────────────────┐
│               BACKEND (Flask API)                │
│                                                  │
│  1. Preprocess (224x224, normalize)              │
│  2. Gatekeeper (MobileNetV2) → Pass/Reject      │
│  3. Classify (VGG16) → Normal/Pneumonia/TB       │
│  4. Grad-CAM (GradientTape) → Heatmap overlay   │
│                  Port 5000                       │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 16+
- npm

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/AIRDC.git
cd AIRDC
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Download models (not included in repo due to size)
# Place these files in the backend/ directory:
#   - vgg16_advanced_best_model.keras    (~307 MB)
#   - mobilenetv2_gatekeeper.keras       (~24 MB)

# Start server
python app.py
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Open the app
Navigate to **http://localhost:3000**

---

## 📁 Project Structure

```
AIRDC/
├── backend/
│   ├── app.py                              # Flask API + Grad-CAM
│   ├── requirements.txt                    # Python dependencies
│   ├── vgg16_advanced_best_model.keras     # VGG16 classifier (not in repo)
│   └── mobilenetv2_gatekeeper.keras        # Gatekeeper model (not in repo)
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js                          # Main app with state management
│   │   ├── App.css                         # Global styles + hero section
│   │   ├── index.css                       # Design system variables
│   │   └── components/
│   │       ├── ImageUploader.js/css        # Drag-and-drop upload
│   │       ├── ResultDisplay.js/css        # Results + GradCAMViewer
│   │       ├── Features.js/css             # How It Works cards
│   │       ├── History.js/css              # Prediction history drawer
│   │       ├── Chatbot.js/css              # AI chat assistant
│   │       └── ParticleBackground.js/css   # Animated background
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🔬 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React.js, Framer Motion | Interactive UI |
| Backend | Flask, Flask-CORS | REST API |
| ML Framework | TensorFlow / Keras | Model inference |
| Gatekeeper | MobileNetV2 | Input validation |
| Classifier | VGG16 (transfer learning) | Disease classification |
| Explainability | Grad-CAM | Visual heatmaps |

---

## 📝 License

This project is for academic purposes.
