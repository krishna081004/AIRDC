# Welcome to MedVision: Complete Project Onboarding Guide 🏥

Welcome to **MedVision**! This guide is designed to act as your complete, from-scratch onboarding document. Whether you are a new developer, a project manager, or an AI enthusiast, reading through this document will equip you with a deep understanding of what this project is, how it works, and how to run it.

---

## 1. What is MedVision? 🩺

**Problem Statement:** Rapidly diagnosing chest X-rays can be a bottleneck in medical environments. 
**Solution:** MedVision offers a web-based, AI-powered medical image classification platform. 

It allows users (like clinicians or patients) to upload chest X-ray images through a simple web interface. The system then processes the uploaded X-ray and provides a real-time prediction classifying the image into one of three categories:
- **Normal**
- **Pneumonia**
- **Tuberculosis**

---

## 2. High-Level System Architecture 🏗️

The project is divided into three primary layers:
1. **Frontend (User Interface):** Built with **React** (JavaScript). This is what the user interacts with. It handles image uploads and displays predictions.
2. **Backend (API Server):** Built with **Flask** (Python). This serves as the bridge between the UI and the AI model. It receives the image, transforms it, and feeds it to the predictive model.
3. **Machine Learning Model:** Built with **TensorFlow / Keras**. We utilize a fine-tuned **VGG16** deep learning architecture trained specifically on chest X-rays to output the probabilities for the medical conditions.

---

## 3. How the Application Flows 🌊 

Understanding the data flow is essential:
1. **Upload:** The user selects a chest X-ray image in the React frontend.
2. **Transmission:** The frontend uses **Axios** to send this image via an HTTP `POST` request to the backend `/predict` endpoint.
3. **Preprocessing:** The Flask backend receives the image. Before the ML model can understand it, the backend resizes it to a `224x224` pixel format and normalizes the pixel values.
4. **Prediction:** The preprocessed array is passed into the pre-loaded `vgg16_advanced_best_model.keras` model.
5. **Response:** The model returns a confidence score (probability) for each of the three classes. The backend sends the class with the highest score back to the frontend in a JSON format.
6. **Display:** The React frontend updates the UI to show the user the condition along with the AI's confidence percentage.
*(Bonus)* **Chatbot Integration:** The frontend also features a chatbot component where users can ask for information regarding specific diseases.

---

## 4. Directory Structure 📁

The source code is organized into distinct, clean directories:

```text
MedVision/
├── frontend/                 # All React.js frontend code
│   ├── public/               # Static assets
│   ├── src/                  # React components (App.js, ImageUploader, ResultDisplay, Chatbot)
│   ├── package.json          # Node dependencies
│   └── README.md             # Frontend-specific instructions
│
├── backend/                  # All Python Flask & AI modeling code
│   ├── app.py                # Main Flask API server
│   ├── vgg16_advanced_best_model.keras # The trained Machine Learning weights
│   ├── requirements.txt      # Python dependencies (Flask, TensorFlow, Pillow, etc.)
│   └── venv/                 # Virtual environment (local to machine)
│
├── Dataset/                  # Data used for training the AI (Separated into classes)
│   ├── Train/
│   ├── Test/
│   └── val/
│
└── MedVision_Technical_Report.md # Historical technical documentation
```

---

## 5. Detailed Component Breakdown 🔬

### 5.1 The Machine Learning Model (VGG16)
The brain of the platform. VGG16 is a convolutional neural network (CNN) model usually used for image recognition. We have initialized it and fine-tuned its deeper layers exclusively for chest X-rays so that it recognizes features unique to pneumonia and tuberculosis.

### 5.2 Preprocessing Logic
Models are very strict about the data they accept. Therefore, `app.py` ensures:
- The image is opened using the `Pillow (PIL)` library.
- Resized to `224x224` (the required input dimension for VGG16).
- Scaled so that pixel values are strictly between `0` and `1` (normalization).
- Formatted into a multidimensional NumPy array `(1, 224, 224, 3)`.

### 5.3 Frontend Components (`frontend/src/`)
- `ImageUploader.js`: Renders the Drag & Drop/selection box. Prepares the HTTP form-data payload.
- `ResultDisplay.js`: A dedicated view area to render the server's response distinctly.
- `Chatbot.js`: A simple keyword-matching helper that searches a local `diseaseInfo.js` dictionary if users have general queries about the predicted conditions.

---

## 6. How to Run the Project Locally 🚀

Follow these steps carefully to run both the frontend and the backend on your own machine.

### Prerequisites:
- **Node.js & npm** (For the Frontend)
- **Python 3.8+** (For the Backend)

### Step 1: Start the Backend server
Open a terminal and navigate to the project root directory, then into the backend.
```bash
# 1. Navigate to backend
cd backend

# 2. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 3. Install required packages (if you haven't yet)
pip install -r requirements.txt

# 4. Run the Flask server
python app.py
```
*Your backend is now running, typically at `http://localhost:5000`.*

### Step 2: Start the Frontend React App
Open a **new, separate terminal tab** and navigate to the frontend directory.
```bash
# 1. Navigate to frontend
cd frontend

# 2. Install Node modules (first time only)
npm install

# 3. Start the React development server
npm start
```
*Your browser will automatically open to `http://localhost:3000` displaying the user interface.*

---

## 7. Future Roadmap & Enhancements 🛣️

As you get comfortable with the platform, here are areas where we plan to grow:
1. **Explainable AI (Grad-CAM):** Displaying a heatmap over the X-ray highlighting *where* the AI saw the disease.
2. **User Authentication:** Allowing doctors to log in, save patient histories, and track diagnoses over time.
3. **Containerization (Docker):** Packaging frontend and backend together for rapid deployment to AWS/GCP.
4. **NLP Chatbot:** Upgrading the static rules-based chatbot to an LLM-based RAG architecture for dynamic medical Q&A.

---

## 8. Interview Preparation & Common Q&A 🎤

If you are using this project for an interview or presentation, you need to explain the system using clear, simple analogies. 

### 8.1 The Elevator Pitch (30 Seconds)
"I built MedVision, an AI-powered diagnostic aide for chest X-rays. It uses a deep learning model (VGG16) to automatically classify X-rays into Normal, Pneumonia, or Tuberculosis. I developed the backend API using Python/Flask to handle the machine learning inference, and I built an interactive React frontend so that doctors can drag-and-drop images and get instant predictions."

### 8.2 System Architecture using Simple Analogies 🧠
- **The Frontend (React) is "The Receptionist":** The receptionist takes the patient's X-ray at the front desk. They don't analyze it; they just make sure it's handed off to the right department.
- **The Backend (Flask) is "The Courier":** The courier takes the X-ray from the receptionist, makes sure the image is the correct size and format (preprocessing), and carries it to the specialist.
- **The AI Model (VGG16) is "The Specialist Doctor":** The specialist has seen thousands of X-rays before. They look at the courier's prepared image, make a diagnosis based on their training, and hand their written prediction back to the courier to bring to the front desk.

### 8.3 Anticipated Interview Questions & Answers

**Q: Why did you choose VGG16 instead of a newer model like ResNet or EfficientNet?**
**A:** "For this specific medical image problem, VGG16 acts as an excellent feature extractor. Its simpler, sequential architecture makes it easier to fine-tune on smaller datasets like chest X-rays without severe overfitting. While newer models are faster or deeper, VGG16 provided an optimal balance of accuracy and interpretability for our prototype."

**Q: How do you handle image data safely before passing it to the model? (Preprocessing)**
**A:** "The model requires very specific inputs. When the backend receives the image, it uses the Pillow library to force a resize to exactly 224x224 pixels. It then converts it into a NumPy array and divides by 255.0 to normalize the pixel values to a zero-to-one range. This uniform scaling helps the model make faster and more stable predictions."

**Q: What were the biggest challenges when connecting the React frontend to the Flask backend?**
**A:** "Managing the asynchronous data flow. Image uploads require formatting the payload as `multipart/form-data` instead of standard JSON. I had to ensure React's `Axios` requests were properly formatted, and that the Flask backend used `request.files['image']` correctly to catch the binary stream before converting it into a readable image format."

**Q: How could you improve the platform for production?**
**A:** "Beyond just giving a percentage score, doctors need to trust the AI. I would implement Grad-CAM to generate a heatmap over the original X-ray, visually highlighting the specific area of the lungs that caused the model to predict 'Pneumonia'. This turns a 'black box' into an interpretable tool."

**Welcome to the team (and good luck on your interview)!** We are excited to have you contribute to making reliable medical screening accessible to everyone.
