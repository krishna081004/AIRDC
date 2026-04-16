import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import numpy as np
import io

# Initialize Flask app
app = Flask(__name__)

# Enable CORS (Cross-Origin Resource Sharing)
# This is crucial to allow your React app (running on a different port) to send requests to the backend
CORS(app)

# --- LOAD YOUR TRAINED MODELS ---

# 1. Gatekeeper Model (MobileNetV2) — verifies image is a lung X-ray
GATEKEEPER_MODEL_PATH = 'mobilenetv2_gatekeeper.keras'
try:
    gatekeeper_model = tf.keras.models.load_model(GATEKEEPER_MODEL_PATH)
    print(f"[OK] Gatekeeper model loaded successfully from {GATEKEEPER_MODEL_PATH}")
except Exception as e:
    print(f"[WARN] Gatekeeper model not found at {GATEKEEPER_MODEL_PATH}: {e}")
    print("   The system will skip gatekeeper validation until the model is available.")
    gatekeeper_model = None

# 2. Disease Classification Model (VGG16) — classifies lung X-rays
MODEL_PATH = 'vgg16_advanced_best_model.keras'
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"[OK] VGG16 model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] Error loading VGG16 model: {e}")
    model = None # Set model to None if loading fails

# Define the labels for your classes
# IMPORTANT: The order must match the output of your model's prediction
CLASS_NAMES = ["Normal", "Pneumonia", "Tuberculosis"]

# Gatekeeper class names (must match training class order)
# class_indices from training: {'lung_xray': 0, 'not_lung_xray': 1}
GATEKEEPER_CLASSES = ["lung_xray", "not_lung_xray"]

# Gatekeeper confidence threshold (85% — adjustable)
GATEKEEPER_THRESHOLD = 0.85

# Allowed file extensions for validation
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    """Check if the uploaded file has a valid image extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- IMAGE PREPROCESSING ---
# This function must resize and format the image EXACTLY as you did during training
def preprocess_image(image_bytes):
    # Target image size for your model (e.g., 224x224)
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    
    # Convert image to numpy array and normalize if needed
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0) # Create a batch

    # If you normalized your training data (e.g., divided by 255.0), do it here too
    img_array = img_array / 255.0
    
    return img_array

# --- GRAD-CAM HEATMAP GENERATION ---
def find_last_conv_layer(target_model):
    """Find the last convolutional layer in the model."""
    for layer in reversed(target_model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer.name
        # Also check inside nested models (e.g., VGG16 base)
        if hasattr(layer, 'layers'):
            for sub_layer in reversed(layer.layers):
                if isinstance(sub_layer, tf.keras.layers.Conv2D):
                    return sub_layer.name
    return None

def generate_gradcam(input_image, target_model, predicted_class_index):
    """
    Generate Grad-CAM heatmap using a single forward pass.
    """
    try:
        # Find the last conv layer
        last_conv_layer = None
        for layer in target_model.layers:
            if hasattr(layer, 'layers'):
                for sub_layer in layer.layers:
                    if isinstance(sub_layer, tf.keras.layers.Conv2D):
                        last_conv_layer = sub_layer
            elif isinstance(layer, tf.keras.layers.Conv2D):
                last_conv_layer = layer
        
        if last_conv_layer is None:
            print("[WARN] No Conv2D layer found for Grad-CAM")
            return None
        
        print(f"[GRADCAM] Using layer: {last_conv_layer.name}")
        
        # Build a SINGLE model that outputs both conv activations AND predictions
        grad_model = tf.keras.Model(
            inputs=target_model.input,
            outputs=[last_conv_layer.output, target_model.output]
        )
        
        input_tensor = tf.cast(input_image, tf.float32)
        
        # Single forward pass — keeps gradient graph connected
        with tf.GradientTape() as tape:
            all_outputs = grad_model(input_tensor)
            
            # First output is always the conv layer (a proper tensor)
            conv_outputs = all_outputs[0]
            
            # Second output might be a nested list — unwrap until we get a tensor
            pred_output = all_outputs[1]
            while isinstance(pred_output, (list, tuple)):
                pred_output = pred_output[0]
            
            # Now pred_output is a tensor, e.g. shape (1, 3) for 3 classes
            class_score = pred_output[0][predicted_class_index]
        
        # Compute gradients of the class score w.r.t. conv layer activations
        grads = tape.gradient(class_score, conv_outputs)
        
        if grads is None:
            print("[WARN] Grad-CAM: gradients are None")
            return None
        
        # Global average pooling of gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Weight feature maps by gradient importance
        conv_out = conv_outputs[0]
        heatmap = conv_out @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        
        # ReLU + normalize
        heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()
        
        print(f"[GRADCAM] Success! shape={heatmap.shape}, max={heatmap.max():.4f}")
        return heatmap
        
    except Exception as e:
        print(f"[WARN] Grad-CAM failed: {e}")
        import traceback
        traceback.print_exc()
        return None

def create_heatmap_overlay(original_image_bytes, heatmap, alpha=0.4):
    """
    Overlay the Grad-CAM heatmap on the original image.
    Returns the overlay image as a base64-encoded PNG string.
    """
    try:
        # Open original image
        img = Image.open(io.BytesIO(original_image_bytes)).convert('RGB')
        img = img.resize((224, 224))
        img_array = np.array(img)
        
        # Resize heatmap to match image dimensions
        heatmap_resized = np.array(Image.fromarray((heatmap * 255).astype(np.uint8)).resize((224, 224), Image.BILINEAR))
        
        # Apply colormap (jet-like: blue -> green -> yellow -> red)
        heatmap_colored = np.zeros((*heatmap_resized.shape, 3), dtype=np.uint8)
        normalized = heatmap_resized.astype(np.float32) / 255.0
        
        # Blue channel: decreases as intensity increases
        heatmap_colored[:, :, 2] = np.clip(255 * (1.0 - 2.0 * normalized), 0, 255).astype(np.uint8)
        # Green channel: peaks in the middle
        heatmap_colored[:, :, 1] = np.clip(255 * (1.0 - np.abs(2.0 * normalized - 1.0)), 0, 255).astype(np.uint8)
        # Red channel: increases as intensity increases
        heatmap_colored[:, :, 0] = np.clip(255 * (2.0 * normalized - 1.0), 0, 255).astype(np.uint8)
        
        # Where heatmap is very low, make it more blue
        low_mask = normalized < 0.25
        heatmap_colored[low_mask, 2] = np.clip(200 * (1.0 - normalized[low_mask] * 4), 50, 200).astype(np.uint8)
        heatmap_colored[low_mask, 1] = 0
        heatmap_colored[low_mask, 0] = 0
        
        # Overlay: blend original image with colored heatmap
        overlay = (img_array * (1 - alpha) + heatmap_colored * alpha).astype(np.uint8)
        
        # Convert to base64
        overlay_img = Image.fromarray(overlay)
        buffer = io.BytesIO()
        overlay_img.save(buffer, format='PNG')
        buffer.seek(0)
        base64_str = base64.b64encode(buffer.read()).decode('utf-8')
        
        return f"data:image/png;base64,{base64_str}"
        
    except Exception as e:
        print(f"[WARN] Heatmap overlay creation failed: {e}")
        return None

# --- GATEKEEPER VALIDATION ---
def gatekeeper_check(processed_image):
    """
    Use MobileNetV2 gatekeeper to verify the image is a lung X-ray.
    
    The gatekeeper model uses binary classification with sigmoid output:
    - Output < 0.5 means 'lung_xray' (class index 0)
    - Output >= 0.5 means 'not_lung_xray' (class index 1)
    
    Returns:
        dict with keys:
            - is_lung_xray (bool): Whether the image passed gatekeeper validation
            - confidence (float): How confident the gatekeeper is
            - gatekeeper_class (str): The predicted class name
    """
    if gatekeeper_model is None:
        # If gatekeeper model isn't loaded, skip validation (pass through)
        return {
            "is_lung_xray": True,
            "confidence": 1.0,
            "gatekeeper_class": "lung_xray",
            "gatekeeper_skipped": True
        }
    
    # Get gatekeeper prediction
    prediction = gatekeeper_model.predict(processed_image, verbose=0)
    
    # Sigmoid output: value close to 0 = lung_xray, close to 1 = not_lung_xray
    raw_score = float(prediction[0][0])
    
    # Determine class and confidence
    if raw_score < 0.5:
        # Model thinks it's a lung X-ray
        gatekeeper_class = "lung_xray"
        confidence = 1.0 - raw_score  # confidence that it IS a lung X-ray
    else:
        # Model thinks it's NOT a lung X-ray
        gatekeeper_class = "not_lung_xray"
        confidence = raw_score  # confidence that it's NOT a lung X-ray
    
    # Apply threshold — only pass if confident enough that it's a lung X-ray
    is_lung_xray = (gatekeeper_class == "lung_xray" and confidence >= GATEKEEPER_THRESHOLD)
    
    return {
        "is_lung_xray": is_lung_xray,
        "confidence": round(confidence, 4),
        "gatekeeper_class": gatekeeper_class,
        "gatekeeper_skipped": False
    }

# --- HEALTH CHECK ENDPOINT ---
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "gatekeeper_loaded": gatekeeper_model is not None,
        "gatekeeper_threshold": GATEKEEPER_THRESHOLD
    })

# --- DEFINE THE PREDICTION API ENDPOINT ---
@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model is not loaded. Please check the server logs."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Only PNG and JPEG images are allowed."}), 400

    if file:
        try:
            # Read image as bytes
            image_bytes = file.read()
            
            # Preprocess the image (same preprocessing for both models — 224x224, normalized)
            processed_image = preprocess_image(image_bytes)
            
            # ========================================
            # STEP 1: GATEKEEPER VALIDATION
            # ========================================
            gatekeeper_result = gatekeeper_check(processed_image)
            
            if not gatekeeper_result["is_lung_xray"]:
                # Image failed gatekeeper — NOT a lung X-ray
                return jsonify({
                    "error": "The uploaded image does not appear to be a chest X-ray. Please upload a valid lung X-ray image for diagnosis.",
                    "gatekeeper": {
                        "passed": False,
                        "predicted_class": gatekeeper_result["gatekeeper_class"],
                        "confidence": gatekeeper_result["confidence"]
                    },
                    "rejection_type": "gatekeeper"
                }), 422  # 422 Unprocessable Entity
            
            # ========================================
            # STEP 2: DISEASE CLASSIFICATION (VGG16)
            # ========================================
            # Image passed gatekeeper — proceed with VGG16 prediction
            prediction = model.predict(processed_image)
            
            # Get the confidence score and the predicted class index
            confidence = float(np.max(prediction))
            predicted_class_index = int(np.argmax(prediction))
            predicted_class_name = CLASS_NAMES[predicted_class_index]
            
            # Build probabilities dict for all classes
            probabilities = {}
            for i, class_name in enumerate(CLASS_NAMES):
                probabilities[class_name] = round(float(prediction[0][i]), 4)
            
            # ========================================
            # STEP 3: GRAD-CAM HEATMAP GENERATION
            # ========================================
            heatmap_base64 = None
            print(f"[DEBUG] Starting Grad-CAM for class index {predicted_class_index}...")
            try:
                heatmap = generate_gradcam(processed_image, model, predicted_class_index)
                print(f"[DEBUG] Grad-CAM returned: {type(heatmap)}")
                if heatmap is not None:
                    heatmap_base64 = create_heatmap_overlay(image_bytes, heatmap)
                    print(f"[GRADCAM] Heatmap generated for class: {predicted_class_name}")
                else:
                    print("[DEBUG] Grad-CAM returned None")
            except Exception as gc_err:
                print(f"[DEBUG] Grad-CAM exception: {gc_err}")
                import traceback
                traceback.print_exc()
            
            # Return the result as JSON with all probabilities + gatekeeper + heatmap
            response_data = {
                "class": predicted_class_name,
                "confidence": confidence,
                "probabilities": probabilities,
                "gatekeeper": {
                    "passed": True,
                    "predicted_class": gatekeeper_result["gatekeeper_class"],
                    "confidence": gatekeeper_result["confidence"],
                    "skipped": gatekeeper_result.get("gatekeeper_skipped", False)
                }
            }
            
            if heatmap_base64:
                response_data["gradcam"] = heatmap_base64
            
            return jsonify(response_data)
            
        except Exception as e:
            return jsonify({"error": f"An error occurred during prediction: {str(e)}"}), 500

    return jsonify({"error": "Invalid request"}), 400


# Run the app
if __name__ == '__main__':
    # Use 0.0.0.0 to make it accessible on your local network
    app.run(host='0.0.0.0', port=5000, debug=True)