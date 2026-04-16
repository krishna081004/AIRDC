"""
============================================================
MedVision — MobileNetV2 Gatekeeper Model Training Script
============================================================
Purpose: Train a binary classifier to distinguish lung X-rays 
         from non-lung images (other X-rays, photos, etc.)

Platform: Kaggle Notebook (GPU recommended: P100 or T4)
Output:   mobilenetv2_gatekeeper.keras

INSTRUCTIONS FOR KAGGLE:
=========================
1. Create a new Kaggle Notebook
2. Add these datasets (click "+ Add Data" in Kaggle):
   
   REQUIRED DATASETS:
   ------------------
   a) Your lung X-ray dataset (upload your Dataset11 as a Kaggle dataset)
      OR use a public chest X-ray dataset like:
      - "Chest X-Ray Images (Pneumonia)" by Paul Mooney
        Search on Kaggle: "chest-xray-pneumonia" by paultimothymooney
      
   b) Bone Fracture Multi-Region X-ray Data (for non-lung X-ray images):
      Search on Kaggle: "fracture multi region x-ray data" by bmadushanirodrigo
      Direct link: kaggle.com/datasets/bmadushanirodrigo/fracture-multi-region-x-ray-data
      
   c) Natural Images (for non-medical negative examples):
      Search on Kaggle: "natural-images" by prasunroy
   
3. Enable GPU: Settings → Accelerator → GPU
4. Copy-paste this entire script into a code cell and run it

DATASET FOLDER STRUCTURE (what this script expects):
====================================================
After adding datasets, Kaggle mounts them under /kaggle/input/
This script will automatically organize them into:

/kaggle/working/gatekeeper_dataset/
├── train/
│   ├── lung_xray/      (chest X-ray images)
│   └── not_lung_xray/  (other X-rays + natural images)
└── val/
    ├── lung_xray/
    └── not_lung_xray/
"""

import os
import shutil
import random
import glob
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from PIL import ImageFile

# Fix for truncated/corrupted images in datasets
ImageFile.LOAD_TRUNCATED_IMAGES = True

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import (
    Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
)
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import (
    EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

# ============================================================
# CONFIGURATION — Adjust these paths based on your Kaggle setup
# ============================================================

# Set random seeds for reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

# Image settings (MobileNetV2 standard input)
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 30  # Early stopping will likely kick in before this

# Output directory for organized dataset
DATASET_DIR = "/kaggle/working/gatekeeper_dataset"
TRAIN_DIR = os.path.join(DATASET_DIR, "train")
VAL_DIR = os.path.join(DATASET_DIR, "val")

# Model output path
MODEL_SAVE_PATH = "/kaggle/working/mobilenetv2_gatekeeper.keras"

# Target number of images per class for balanced training
TARGET_PER_CLASS_TRAIN = 8000
TARGET_PER_CLASS_VAL = 1000

# ============================================================
# STEP 0: AUTO-DISCOVER KAGGLE DATASET PATHS
# ============================================================
# This scans /kaggle/input/ to find your datasets automatically
# so you don't need to manually type exact paths.

KAGGLE_INPUT = "/kaggle/input"

def discover_datasets():
    """Auto-discover dataset paths from /kaggle/input/"""
    print("=" * 60)
    print("STEP 0: Auto-Discovering Kaggle Datasets")
    print("=" * 60)
    
    # List everything in /kaggle/input/
    if not os.path.exists(KAGGLE_INPUT):
        print("ERROR: /kaggle/input/ does not exist. Are you running on Kaggle?")
        return [], [], [], ""
    
    available = os.listdir(KAGGLE_INPUT)
    print(f"\n📂 Found {len(available)} datasets in /kaggle/input/:")
    for d in sorted(available):
        full = os.path.join(KAGGLE_INPUT, d)
        if os.path.isdir(full):
            # Show first-level contents
            children = os.listdir(full)
            print(f"   📁 {d}/")
            for c in children[:10]:
                child_path = os.path.join(full, c)
                if os.path.isdir(child_path):
                    grandchildren = os.listdir(child_path)
                    print(f"      📁 {c}/ ({len(grandchildren)} items)")
                else:
                    print(f"      📄 {c}")
            if len(children) > 10:
                print(f"      ... and {len(children) - 10} more")
    
    # --- Find CHEST X-RAY dataset (positive class) ---
    lung_train_dirs = []
    lung_val_dirs = []
    
    print("\n🔍 Searching for CHEST X-RAY dataset...")
    for d in available:
        base = os.path.join(KAGGLE_INPUT, d)
        # Look for common chest x-ray folder patterns
        for root, dirs, files in os.walk(base):
            # Pattern: .../train/NORMAL or .../train/normal
            if os.path.basename(root).lower() == 'train':
                subdirs = [sd.lower() for sd in os.listdir(root)]
                if 'normal' in subdirs or 'pneumonia' in subdirs:
                    for sd in os.listdir(root):
                        lung_train_dirs.append(os.path.join(root, sd))
                    break
        for root, dirs, files in os.walk(base):
            if os.path.basename(root).lower() == 'val':
                subdirs = [sd.lower() for sd in os.listdir(root)]
                if 'normal' in subdirs or 'pneumonia' in subdirs:
                    for sd in os.listdir(root):
                        lung_val_dirs.append(os.path.join(root, sd))
                    break
            # Also check 'test' as fallback for validation
            if os.path.basename(root).lower() == 'test' and not lung_val_dirs:
                subdirs = [sd.lower() for sd in os.listdir(root)]
                if 'normal' in subdirs or 'pneumonia' in subdirs:
                    for sd in os.listdir(root):
                        lung_val_dirs.append(os.path.join(root, sd))
                    break
    
    if lung_train_dirs:
        print(f"   ✅ Found lung X-ray training dirs:")
        for d in lung_train_dirs:
            count = len([f for f in os.listdir(d) if os.path.isfile(os.path.join(d, f))]) if os.path.isdir(d) else 0
            print(f"      {d} ({count} files)")
    else:
        print("   ❌ No chest X-ray training data found!")
    
    if lung_val_dirs:
        print(f"   ✅ Found lung X-ray validation dirs:")
        for d in lung_val_dirs:
            count = len([f for f in os.listdir(d) if os.path.isfile(os.path.join(d, f))]) if os.path.isdir(d) else 0
            print(f"      {d} ({count} files)")
    else:
        print("   ⚠️  No validation set found, will split from training")
    
    # Track which FULL PATHS are already used for lung X-rays
    used_paths = set()
    for d in lung_train_dirs + lung_val_dirs:
        used_paths.add(d)
    
    # --- Find NON-LUNG datasets (negative class) ---
    # Since Kaggle may nest all datasets under a single "datasets/" folder,
    # we scan ALL subdirectories recursively to find non-chest-xray data
    bone_dirs = []
    natural_dir = ""
    
    print("\n🔍 Searching for NON-LUNG datasets (negative class)...")
    
    # Collect ALL leaf dataset directories (2-3 levels deep)
    all_dataset_roots = []
    for root, dirs, files in os.walk(KAGGLE_INPUT):
        depth = root.replace(KAGGLE_INPUT, "").count(os.sep)
        # Look at directories 1-3 levels deep
        if 1 <= depth <= 3 and dirs:
            for d in dirs:
                full = os.path.join(root, d)
                all_dataset_roots.append((d.lower(), full))
    
    # Also add top-level datasets
    for d in available:
        full = os.path.join(KAGGLE_INPUT, d)
        all_dataset_roots.append((d.lower(), full))
    
    # Search through all discovered directories
    for name_lower, full_path in all_dataset_roots:
        # Skip if this path is part of chest X-ray data
        is_chest = False
        for used in used_paths:
            if full_path in used or used.startswith(full_path):
                is_chest = True
                break
        if is_chest:
            continue
        
        # Match bone/fracture datasets by keyword
        if any(kw in name_lower for kw in ['fracture', 'bone', 'mura', 'musculoskeletal', 'ortho']):
            if full_path not in bone_dirs:
                total = sum(len(files) for _, _, files in os.walk(full_path))
                if total > 50:  # Only use if it has meaningful content
                    bone_dirs.append(full_path)
                    print(f"   ✅ Found bone/medical X-ray: {full_path} (~{total} files)")
        
        # Match natural image datasets by keyword
        elif any(kw in name_lower for kw in ['natural', 'random', 'imagenet', 'cifar', 'animal', 'object']):
            if not natural_dir:
                total = sum(len(files) for _, _, files in os.walk(full_path))
                if total > 50:
                    natural_dir = full_path
                    print(f"   ✅ Found natural images: {full_path} (~{total} files)")
    
    # Also try direct known paths (based on Kaggle author names we saw)
    known_paths = [
        ("/kaggle/input/datasets/bmadushanirodrigo", "bone"),
        ("/kaggle/input/datasets/prasunroy", "natural"),
        ("/kaggle/input/fracture-multi-region-x-ray-data", "bone"),
        ("/kaggle/input/natural-images", "natural"),
    ]
    for known_path, dtype in known_paths:
        if os.path.exists(known_path):
            total = sum(len(files) for _, _, files in os.walk(known_path))
            if total > 50:
                if dtype == "bone" and known_path not in bone_dirs:
                    bone_dirs.append(known_path)
                    print(f"   ✅ Found (direct path): {known_path} (~{total} files)")
                elif dtype == "natural" and not natural_dir:
                    natural_dir = known_path
                    print(f"   ✅ Found (direct path): {known_path} (~{total} files)")
    
    if not bone_dirs and not natural_dir:
        print("   ❌ No negative class datasets found at all!")
        print("\n   DEBUG: All directories found at depth 1-3:")
        for name, path in all_dataset_roots[:20]:
            print(f"      {path}")
    
    print("\n" + "=" * 60)
    return lung_train_dirs, lung_val_dirs, bone_dirs, natural_dir

# ============================================================

def collect_image_files(directories, extensions=("*.png", "*.jpg", "*.jpeg", "*.PNG", "*.JPG", "*.JPEG")):
    """Recursively collect all image files from given directories."""
    all_files = []
    for directory in directories:
        if not os.path.exists(directory):
            print(f"  ⚠️  Directory not found, skipping: {directory}")
            continue
        for ext in extensions:
            found = glob.glob(os.path.join(directory, "**", ext), recursive=True)
            all_files.extend(found)
    print(f"  Found {len(all_files)} images")
    return all_files


def copy_files_to_dir(file_list, target_dir, max_count=None):
    """Copy files to target directory, optionally limiting count."""
    os.makedirs(target_dir, exist_ok=True)
    
    if max_count and len(file_list) > max_count:
        file_list = random.sample(file_list, max_count)
    
    copied = 0
    for src in file_list:
        fname = f"{copied}_{os.path.basename(src)}"
        dst = os.path.join(target_dir, fname)
        try:
            shutil.copy2(src, dst)
            copied += 1
        except Exception as e:
            pass  # Skip problematic files silently
    
    print(f"  Copied {copied} files to {target_dir}")
    return copied


def organize_dataset(lung_train_dirs, lung_val_dirs, bone_dirs, natural_dir):
    """Organize all source datasets into the gatekeeper training structure."""
    print("=" * 60)
    print("STEP 1: Organizing Dataset")
    print("=" * 60)
    
    # Clean previous runs
    if os.path.exists(DATASET_DIR):
        shutil.rmtree(DATASET_DIR)
    
    # --- Collect LUNG X-RAY images (positive class) ---
    print("\n📋 Collecting LUNG X-RAY images (positive class)...")
    
    print("  Training lung X-rays:")
    lung_train_files = collect_image_files(lung_train_dirs)
    
    print("  Validation lung X-rays:")
    lung_val_files = collect_image_files(lung_val_dirs)
    
    # If validation set is too small, split from training
    if len(lung_val_files) < 200:
        print("  ⚠️  Validation set too small, splitting 15% from training...")
        random.shuffle(lung_train_files)
        split_idx = int(len(lung_train_files) * 0.85)
        lung_val_files = lung_train_files[split_idx:]
        lung_train_files = lung_train_files[:split_idx]
    
    # --- Collect NON-LUNG images (negative class) ---
    print("\n📋 Collecting NON-LUNG images (negative class)...")
    
    non_lung_files = []
    
    # Bone Fracture X-rays (hand, elbow, knee, hip, etc.)
    if bone_dirs:
        print("  Bone Fracture X-rays:")
        bone_files = collect_image_files(bone_dirs)
        non_lung_files.extend(bone_files)
    
    # Natural images
    if natural_dir and os.path.exists(natural_dir):
        print("  Natural images:")
        natural_files = collect_image_files([natural_dir])
        non_lung_files.extend(natural_files)
    
    if len(non_lung_files) == 0:
        print("\n❌ ERROR: No non-lung images found! Cannot train without negative examples.")
        print("   Please add a bone fracture or natural images dataset to your Kaggle notebook.")
        return False
    
    random.shuffle(non_lung_files)
    
    # Split non-lung into train/val
    split_idx = int(len(non_lung_files) * 0.85)
    non_lung_train = non_lung_files[:split_idx]
    non_lung_val = non_lung_files[split_idx:]
    
    # --- Copy files to organized structure ---
    print("\n📁 Copying files to organized directories...")
    
    print("\n  [TRAIN] Lung X-rays:")
    copy_files_to_dir(lung_train_files, os.path.join(TRAIN_DIR, "lung_xray"), TARGET_PER_CLASS_TRAIN)
    
    print("  [TRAIN] Not Lung X-rays:")
    copy_files_to_dir(non_lung_train, os.path.join(TRAIN_DIR, "not_lung_xray"), TARGET_PER_CLASS_TRAIN)
    
    print("\n  [VAL] Lung X-rays:")
    copy_files_to_dir(lung_val_files, os.path.join(VAL_DIR, "lung_xray"), TARGET_PER_CLASS_VAL)
    
    print("  [VAL] Not Lung X-rays:")
    copy_files_to_dir(non_lung_val, os.path.join(VAL_DIR, "not_lung_xray"), TARGET_PER_CLASS_VAL)
    
    # Final counts
    print("\n✅ Dataset organization complete!")
    for split in ["train", "val"]:
        for cls in ["lung_xray", "not_lung_xray"]:
            path = os.path.join(DATASET_DIR, split, cls)
            if os.path.exists(path):
                count = len(os.listdir(path))
                print(f"   {split}/{cls}: {count} images")
    
    return True


# ============================================================
# STEP 2: CREATE DATA GENERATORS WITH AUGMENTATION
# ============================================================

def create_data_generators():
    """Create training and validation data generators with augmentation."""
    print("\n" + "=" * 60)
    print("STEP 2: Creating Data Generators")
    print("=" * 60)
    
    # Training data: with augmentation for better generalization
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        shear_range=0.1,
        zoom_range=0.15,
        horizontal_flip=True,
        brightness_range=[0.85, 1.15],
        fill_mode='nearest'
    )
    
    # Validation data: only rescale, no augmentation
    val_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0
    )
    
    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',  # Binary: lung_xray (0) vs not_lung_xray (1)
        shuffle=True,
        seed=SEED,
        color_mode='rgb'
    )
    
    val_generator = val_datagen.flow_from_directory(
        VAL_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        shuffle=False,
        seed=SEED,
        color_mode='rgb'
    )
    
    print(f"\n  Class indices: {train_generator.class_indices}")
    print(f"  Training samples: {train_generator.samples}")
    print(f"  Validation samples: {val_generator.samples}")
    
    return train_generator, val_generator


# ============================================================
# STEP 3: BUILD MOBILENETV2 MODEL
# ============================================================

def build_gatekeeper_model():
    """Build MobileNetV2 transfer learning model for binary classification."""
    print("\n" + "=" * 60)
    print("STEP 3: Building MobileNetV2 Gatekeeper Model")
    print("=" * 60)
    
    # Load MobileNetV2 pretrained on ImageNet, without the top classification head
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3)
    )
    
    # Freeze the base model layers initially (transfer learning)
    base_model.trainable = False
    
    # Add custom classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    x = BatchNormalization()(x)
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.3)(x)
    
    # Single output neuron with sigmoid for binary classification
    output = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=output)
    
    # Compile with binary crossentropy
    model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"\n  Total parameters: {model.count_params():,}")
    trainable = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
    print(f"  Trainable parameters: {trainable:,}")
    print(f"  Non-trainable parameters: {model.count_params() - trainable:,}")
    
    return model, base_model


# ============================================================
# STEP 4: TRAIN THE MODEL (Two-Phase Training)
# ============================================================

def train_model(model, base_model, train_gen, val_gen):
    """Train model in two phases: frozen base → fine-tuned base."""
    print("\n" + "=" * 60)
    print("STEP 4: Training the Model")
    print("=" * 60)
    
    # === PHASE 1: Train only the classification head (base frozen) ===
    print("\n🔒 PHASE 1: Training classification head (base frozen)...")
    
    callbacks_phase1 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1
        ),
    ]
    
    history1 = model.fit(
        train_gen,
        epochs=10,
        validation_data=val_gen,
        callbacks=callbacks_phase1,
        verbose=1
    )
    
    # === PHASE 2: Fine-tune the last 30 layers of MobileNetV2 ===
    print("\n🔓 PHASE 2: Fine-tuning last 30 layers of MobileNetV2...")
    
    # Unfreeze the last 30 layers of the base model
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    
    # Recompile with a lower learning rate for fine-tuning
    model.compile(
        optimizer=Adam(learning_rate=1e-4),  # Lower LR for fine-tuning
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    trainable = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
    print(f"  Trainable parameters after unfreezing: {trainable:,}")
    
    callbacks_phase2 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=7,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            MODEL_SAVE_PATH,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
    ]
    
    history2 = model.fit(
        train_gen,
        epochs=EPOCHS,
        validation_data=val_gen,
        callbacks=callbacks_phase2,
        verbose=1
    )
    
    return history1, history2


# ============================================================
# STEP 5: EVALUATE & VISUALIZE
# ============================================================

def evaluate_model(model, val_gen, history1, history2):
    """Evaluate model performance and generate plots."""
    print("\n" + "=" * 60)
    print("STEP 5: Evaluation & Visualization")
    print("=" * 60)
    
    # Final evaluation
    val_loss, val_accuracy = model.evaluate(val_gen, verbose=0)
    print(f"\n  ✅ Final Validation Accuracy: {val_accuracy * 100:.2f}%")
    print(f"  ✅ Final Validation Loss: {val_loss:.4f}")
    
    # Classification report
    val_gen.reset()
    predictions = model.predict(val_gen, verbose=0)
    predicted_classes = (predictions > 0.5).astype(int).flatten()
    true_classes = val_gen.classes
    class_labels = list(val_gen.class_indices.keys())
    
    print("\n📊 Classification Report:")
    print(classification_report(true_classes, predicted_classes, target_names=class_labels))
    
    # --- Plot Training History ---
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('MobileNetV2 Gatekeeper Training History', fontsize=16, fontweight='bold')
    
    # Phase 1 - Accuracy
    axes[0, 0].plot(history1.history['accuracy'], label='Train Acc', color='#2196F3')
    axes[0, 0].plot(history1.history['val_accuracy'], label='Val Acc', color='#FF5722')
    axes[0, 0].set_title('Phase 1: Head Training - Accuracy')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # Phase 1 - Loss
    axes[0, 1].plot(history1.history['loss'], label='Train Loss', color='#2196F3')
    axes[0, 1].plot(history1.history['val_loss'], label='Val Loss', color='#FF5722')
    axes[0, 1].set_title('Phase 1: Head Training - Loss')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)
    
    # Phase 2 - Accuracy
    axes[1, 0].plot(history2.history['accuracy'], label='Train Acc', color='#4CAF50')
    axes[1, 0].plot(history2.history['val_accuracy'], label='Val Acc', color='#9C27B0')
    axes[1, 0].set_title('Phase 2: Fine-Tuning - Accuracy')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    
    # Phase 2 - Loss
    axes[1, 1].plot(history2.history['loss'], label='Train Loss', color='#4CAF50')
    axes[1, 1].plot(history2.history['val_loss'], label='Val Loss', color='#9C27B0')
    axes[1, 1].set_title('Phase 2: Fine-Tuning - Loss')
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('/kaggle/working/training_history.png', dpi=150, bbox_inches='tight')
    plt.show()
    
    # --- Confusion Matrix ---
    cm = confusion_matrix(true_classes, predicted_classes)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_labels, yticklabels=class_labels)
    plt.title('Confusion Matrix — Gatekeeper Model', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.tight_layout()
    plt.savefig('/kaggle/working/confusion_matrix.png', dpi=150, bbox_inches='tight')
    plt.show()
    
    return val_accuracy


# ============================================================
# STEP 6: SAVE & EXPORT
# ============================================================

def save_model(model, val_accuracy):
    """Save the final model and print instructions."""
    print("\n" + "=" * 60)
    print("STEP 6: Saving Model")
    print("=" * 60)
    
    # Save final model
    model.save(MODEL_SAVE_PATH)
    
    # Get file size
    model_size_mb = os.path.getsize(MODEL_SAVE_PATH) / (1024 * 1024)
    
    print(f"\n  ✅ Model saved to: {MODEL_SAVE_PATH}")
    print(f"  📦 Model size: {model_size_mb:.1f} MB")
    print(f"  🎯 Validation accuracy: {val_accuracy * 100:.2f}%")
    
    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("""
    1. Download 'mobilenetv2_gatekeeper.keras' from Kaggle Output
       (Click on the "Output" tab → Download)
    
    2. Place the file in your MedVision backend directory:
       MedVision22/backend/mobilenetv2_gatekeeper.keras
    
    3. Update your app.py to load and use the gatekeeper model
       (Code will be provided by Antigravity)
    
    4. Test by uploading:
       - A chest X-ray image → should PASS gatekeeper
       - A random photo → should be REJECTED by gatekeeper
       - A hand X-ray → should be REJECTED by gatekeeper
    """)


# ============================================================
# MAIN EXECUTION
# ============================================================

if __name__ == "__main__":
    print("🏥 MedVision — MobileNetV2 Gatekeeper Training")
    print("=" * 60)
    print(f"TensorFlow version: {tf.__version__}")
    print(f"GPU available: {len(tf.config.list_physical_devices('GPU')) > 0}")
    
    if tf.config.list_physical_devices('GPU'):
        print(f"GPU device: {tf.config.list_physical_devices('GPU')[0]}")
    
    # Step 0: Auto-discover dataset paths
    lung_train_dirs, lung_val_dirs, bone_dirs, natural_dir = discover_datasets()
    
    if not lung_train_dirs:
        print("\n❌ FATAL: No chest X-ray dataset found!")
        print("   Please add 'chest-xray-pneumonia' dataset to your Kaggle notebook.")
        print("   Go to: + Add Data → Search 'chest xray pneumonia' → Add")
    elif not bone_dirs and not natural_dir:
        print("\n❌ FATAL: No negative class dataset found!")
        print("   Please add at least one of these datasets:")
        print("   1. Search 'fracture multi region x-ray' → Add")
        print("   2. Search 'natural images prasunroy' → Add")
    else:
        # Step 1: Organize dataset
        success = organize_dataset(lung_train_dirs, lung_val_dirs, bone_dirs, natural_dir)
        
        if not success:
            print("\n❌ Dataset organization failed. Please check the errors above.")
        else:
            # Step 2: Create data generators
            train_gen, val_gen = create_data_generators()
            
            # Step 3: Build model
            model, base_model = build_gatekeeper_model()
            
            # Step 4: Train model
            history1, history2 = train_model(model, base_model, train_gen, val_gen)
            
            # Step 5: Evaluate
            val_accuracy = evaluate_model(model, val_gen, history1, history2)
            
            # Step 6: Save
            save_model(model, val_accuracy)
            
            print("\n🎉 Training complete! Download your model from the Output tab.")

