import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Pose Classes:
# 0: Stand / Idle
# 1: Bicep Curl (Down position)
# 2: Bicep Curl (Up position)
# 3: Squat (Up / Standing position)
# 4: Squat (Down / Parallel position)
# 5: Incorrect Form (Excessive lean or partial extension)

NUM_CLASSES = 6
SAMPLES_PER_CLASS = 200
FEATURE_DIM = 33 * 4  # 33 landmarks * 4 (x, y, z, visibility)

def generate_synthetic_pose_data():
    X = []
    y = []

    print("[ML Train] Synthesizing pose landmarks dataset...")

    # Class 0: Stand / Idle
    for _ in range(SAMPLES_PER_CLASS):
        # Baseline standing joints mapping
        landmarks = np.zeros((33, 4))
        for idx in range(33):
            landmarks[idx, 0] = 0.5 + np.random.normal(0, 0.02)  # X centered
            landmarks[idx, 1] = (idx / 33.0) + np.random.normal(0, 0.03)  # Y increases linearly downwards
            landmarks[idx, 2] = np.random.normal(0, 0.02)  # Z depth
            landmarks[idx, 3] = 0.9 + np.random.normal(0, 0.05)  # Visibility
        X.append(landmarks.flatten())
        y.append(0)

    # Class 1: Bicep Curl (Down)
    for _ in range(SAMPLES_PER_CLASS):
        landmarks = np.zeros((33, 4))
        # Shoulder (11), Elbow (13), Wrist (15) extended downwards
        for idx in range(33):
            landmarks[idx, 0] = 0.5 + np.random.normal(0, 0.02)
            landmarks[idx, 1] = (idx / 33.0) + np.random.normal(0, 0.02)
            landmarks[idx, 3] = 0.95
        # Set elbow below shoulder, wrist below elbow (Straight line downwards)
        landmarks[11] = [0.45, 0.30, 0.0, 0.98] # Shoulder
        landmarks[13] = [0.45, 0.55, 0.0, 0.98] # Elbow
        landmarks[15] = [0.45, 0.80, 0.0, 0.98] # Wrist
        # Add random noise to all
        X.append(landmarks.flatten() + np.random.normal(0, 0.015, FEATURE_DIM))
        y.append(1)

    # Class 2: Bicep Curl (Up)
    for _ in range(SAMPLES_PER_CLASS):
        landmarks = np.zeros((33, 4))
        for idx in range(33):
            landmarks[idx, 0] = 0.5 + np.random.normal(0, 0.02)
            landmarks[idx, 1] = (idx / 33.0) + np.random.normal(0, 0.02)
            landmarks[idx, 3] = 0.95
        # Elbow bent, wrist curled up close to shoulder
        landmarks[11] = [0.45, 0.30, 0.0, 0.98] # Shoulder
        landmarks[13] = [0.45, 0.55, 0.0, 0.98] # Elbow
        landmarks[15] = [0.46, 0.35, 0.0, 0.98] # Wrist (Curled Up)
        X.append(landmarks.flatten() + np.random.normal(0, 0.015, FEATURE_DIM))
        y.append(2)

    # Class 3: Squat (Up)
    for _ in range(SAMPLES_PER_CLASS):
        landmarks = np.zeros((33, 4))
        for idx in range(33):
            landmarks[idx, 0] = 0.5 + np.random.normal(0, 0.02)
            landmarks[idx, 1] = (idx / 33.0) + np.random.normal(0, 0.02)
            landmarks[idx, 3] = 0.95
        # Standing upright, leg joints vertical
        landmarks[23] = [0.48, 0.55, 0.0, 0.98] # Hip
        landmarks[25] = [0.48, 0.75, 0.0, 0.98] # Knee
        landmarks[27] = [0.48, 0.95, 0.0, 0.98] # Ankle
        X.append(landmarks.flatten() + np.random.normal(0, 0.015, FEATURE_DIM))
        y.append(3)

    # Class 4: Squat (Down / Correct depth)
    for _ in range(SAMPLES_PER_CLASS):
        landmarks = np.zeros((33, 4))
        for idx in range(33):
            landmarks[idx, 0] = 0.5 + np.random.normal(0, 0.02)
            landmarks[idx, 1] = (idx / 33.0) + np.random.normal(0, 0.02)
            landmarks[idx, 3] = 0.95
        # Hip dropped near knee level, knees bent
        landmarks[23] = [0.42, 0.73, 0.0, 0.98] # Hip dropped
        landmarks[25] = [0.48, 0.74, 0.0, 0.98] # Knee bent
        landmarks[27] = [0.48, 0.95, 0.0, 0.98] # Ankle
        X.append(landmarks.flatten() + np.random.normal(0, 0.015, FEATURE_DIM))
        y.append(4)

    # Class 5: Incorrect Form
    # (Representing forward leaning back in squats or half-curls)
    for _ in range(SAMPLES_PER_CLASS):
        landmarks = np.zeros((33, 4))
        for idx in range(33):
            landmarks[idx, 0] = 0.5 + np.random.normal(0, 0.02)
            landmarks[idx, 1] = (idx / 33.0) + np.random.normal(0, 0.02)
            landmarks[idx, 3] = 0.95
            
        if np.random.rand() > 0.5:
            # Squat forward leaning back (Shoulder is forward relative to hips)
            landmarks[11] = [0.30, 0.40, 0.0, 0.98] # Shoulder leaning forward
            landmarks[23] = [0.45, 0.70, 0.0, 0.98] # Hip
            landmarks[25] = [0.48, 0.72, 0.0, 0.98] # Knee
            landmarks[27] = [0.48, 0.95, 0.0, 0.98] # Ankle
        else:
            # Half-curl (wrist stopped at 90 degrees angle)
            landmarks[11] = [0.45, 0.30, 0.0, 0.98] # Shoulder
            landmarks[13] = [0.45, 0.55, 0.0, 0.98] # Elbow
            landmarks[15] = [0.55, 0.55, 0.0, 0.98] # Wrist out at 90°
            
        X.append(landmarks.flatten() + np.random.normal(0, 0.015, FEATURE_DIM))
        y.append(5)

    return np.array(X), np.array(y)

def main():
    X, y = generate_synthetic_pose_data()
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Random Forest Classifier
    clf = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42)
    print("[ML Train] Training Random Forest pose classifier...")
    clf.fit(X_train, y_train)
    
    # Validation evaluation
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"[ML Train] Validation Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=[
        "Stand / Idle",
        "Curl (Down)",
        "Curl (Up)",
        "Squat (Up)",
        "Squat (Down)",
        "Incorrect Form"
    ]))
    
    # Export Model
    model_filename = "pose_model.pkl"
    print(f"[ML Train] Saving model to {model_filename}...")
    joblib.dump(clf, model_filename)
    print("[ML Train] Model successfully exported!")

if __name__ == "__main__":
    main()
