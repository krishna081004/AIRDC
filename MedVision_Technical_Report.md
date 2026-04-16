# MedVision Project: Full Technical Report

---

## 1. Project Overview

MedVision is a web-based medical image classification platform. It allows users to upload chest X-ray images and receive predictions for normal, pneumonia, or tuberculosis. The system consists of a deep learning backend (Python/Flask) and a React frontend, integrated for seamless user experience.

---

## 2. Backend Architecture & Logic

### 2.1 Technologies Used

- Python 3.x
- Flask (API server)
- TensorFlow/Keras (VGG16 model)
- NumPy, Pillow (image processing)

### 2.2 File Structure

- `app.py`: Main Flask app, API endpoints
- `vgg16_advanced_best_model.keras`: Pre-trained model
- `requirements.txt`: Python dependencies

### 2.3 API Flow

#### 2.3.1 Image Upload & Prediction

- User uploads image via frontend.
- Flask receives image, preprocesses it, loads model, predicts class, returns result.

#### 2.3.2 Pseudocode

```
# app.py
from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np

app = Flask(__name__)
model = load_model('vgg16_advanced_best_model.keras')

@app.route('/predict', methods=['POST'])
def predict():
    # Receive image file
    file = request.files['image']
    img = Image.open(file.stream).resize((224, 224))
    arr = np.array(img) / 255.0
    arr = arr.reshape(1, 224, 224, 3)
    pred = model.predict(arr)
    class_idx = np.argmax(pred)
    classes = ['normal', 'pneumonia', 'tuberculosis']
    return jsonify({'class': classes[class_idx], 'confidence': float(pred[0][class_idx])})
```

#### 2.3.3 Model Details

- VGG16 architecture, fine-tuned for 3 classes.
- Input: 224x224 RGB image.
- Output: Softmax probabilities for each class.

#### 2.3.4 Data Preprocessing

- Resize to 224x224
- Normalize pixel values to [0, 1]
- Convert to NumPy array

---

## 3. Frontend Architecture & Logic

### 3.1 Technologies Used

- React (JavaScript)
- CSS for styling
- Axios (for API calls)

### 3.2 File Structure

- `src/App.js`: Main app logic
- `src/components/ImageUploader.js`: Handles image upload
- `src/components/ResultDisplay.js`: Shows prediction
- `src/components/Chatbot.js`: Knowledge base chat
- `src/data/diseaseInfo.js`: Disease info

### 3.3 UI Flow

- User uploads image via `ImageUploader`.
- Axios sends image to `/predict` endpoint.
- Receives prediction, displays in `ResultDisplay`.
- Chatbot provides disease info.

### 3.4 Pseudocode

#### 3.4.1 Image Upload & Prediction

```
// ImageUploader.js
import axios from 'axios';

function handleUpload(file) {
  const formData = new FormData();
  formData.append('image', file);
  axios.post('/predict', formData)
    .then(res => showResult(res.data))
    .catch(err => showError(err));
}
```

#### 3.4.2 Result Display

```
// ResultDisplay.js
function ResultDisplay({ result }) {
  return (
    <div>
      <h2>Prediction: {result.class}</h2>
      <p>Confidence: {result.confidence}</p>
    </div>
  );
}
```

#### 3.4.3 Chatbot Logic

```
// Chatbot.js
import { diseaseInfo } from '../data/diseaseInfo';

function handleUserQuery(query) {
  // Simple keyword matching
  const info = diseaseInfo[query.toLowerCase()];
  return info ? info : "Sorry, I don't have info on that.";
}
```

---

## 4. Dataset Structure & Usage

- `Dataset/Train/`, `Dataset/Test/`, `Dataset/val/`
  - Each contains subfolders: `normal`, `pneumonia`, `tuberculosis`
  - Used for model training, validation, and testing

---

## 5. Integration Flow

- Frontend sends image to backend via HTTP POST.
- Backend processes image, runs model, returns JSON.
- Frontend parses JSON, updates UI.

---

## 6. Technologies Used

- Backend: Python, Flask, TensorFlow/Keras, Pillow, NumPy
- Frontend: React, Axios, CSS
- Dataset: Structured folders for supervised learning

---

## 7. Potential Improvements

- Add user authentication
- Improve model accuracy (ensemble, more data)
- Add explainability (Grad-CAM)
- Enhance chatbot with NLP
- Deploy backend with Docker

---

## 8. Full System Pseudocode

```
User uploads image -> Frontend sends to backend -> Backend preprocesses image -> Model predicts class -> Backend returns result -> Frontend displays result -> User queries chatbot -> Chatbot returns info
```

---

## 9. Conclusion

MedVision is a robust medical image classification platform, combining deep learning and modern web technologies. All technical details, logic, and pseudocode are covered above. For further improvements, consider expanding dataset, model explainability, and advanced chatbot features.
