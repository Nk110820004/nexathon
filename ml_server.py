import base64
import json
import math
import os
import sys
import numpy as np
import cv2
import mediapipe as mp
import psycopg2
import joblib
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PoseParfaite ML Server", version="1.1.0")

# Enable CORS for Next.js frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load custom trained ML model
MODEL_FILE = "pose_model.pkl"
try:
    if os.path.exists(MODEL_FILE):
        pose_classifier = joblib.load(MODEL_FILE)
        print(f"[ML Server] Loaded custom model {MODEL_FILE} successfully.")
    else:
        pose_classifier = None
        print(f"[ML Server] Warning: {MODEL_FILE} not found. Running in heuristic mode only.")
except Exception as e:
    pose_classifier = None
    print(f"[ML Server] Failed to load {MODEL_FILE}: {e}")

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

DB_FALLBACK_FILE = "db_fallback.json"

# Helper to read fallback DB
def read_fallback_db():
    if not os.path.exists(DB_FALLBACK_FILE):
        default_schema = {
            "users": [],
            "user_goals": [],
            "chat_messages": [],
            "food_logs": [],
            "workout_logs": [],
            "water_logs": [],
            "coupons": []
        }
        with open(DB_FALLBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_schema, f, indent=2)
        return default_schema
    try:
        with open(DB_FALLBACK_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"users": [], "workout_logs": [], "user_goals": [], "chat_messages": [], "food_logs": [], "water_logs": [], "coupons": []}

# Helper to write fallback DB
def write_fallback_db(db):
    try:
        with open(DB_FALLBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"[ML Server Fallback] Error writing fallback DB: {e}")

# PostgreSQL connection check
def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    pg_host = os.environ.get("PGHOST")
    if db_url or pg_host:
        try:
            if db_url:
                conn = psycopg2.connect(db_url)
            else:
                conn = psycopg2.connect(
                    host=pg_host,
                    user=os.environ.get("PGUSER", "postgres"),
                    password=os.environ.get("PGPASSWORD", ""),
                    database=os.environ.get("PGDATABASE", "vit"),
                    port=os.environ.get("PGPORT", "5432")
                )
            return conn
        except Exception as e:
            print(f"[ML Server] PostgreSQL connection failed: {e}")
            return None
    return None

# Save workout session metrics
class WorkoutSavePayload(BaseModel):
    user_id: int
    exercise_name: str
    reps: int
    duration_seconds: int
    accuracy_score: int

@app.post("/save_workout")
async def save_workout(payload: WorkoutSavePayload):
    conn = get_db_connection()
    points_awarded = max(10, int(payload.reps * 0.5) + int(payload.duration_seconds / 10))

    if conn:
        try:
            cursor = conn.cursor()
            # 1. Insert workout log
            cursor.execute(
                "INSERT INTO workout_logs (user_id, exercise_name, reps, duration_seconds, accuracy_score) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (payload.user_id, payload.exercise_name, payload.reps, payload.duration_seconds, payload.accuracy_score)
            )
            # 2. Award user points
            cursor.execute(
                "UPDATE users SET points = points + %s WHERE id = %s RETURNING points",
                (points_awarded, payload.user_id)
            )
            conn.commit()
            updated_points = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return {"success": True, "points_awarded": points_awarded, "updated_points": updated_points}
        except Exception as e:
            print(f"[ML Server DB Error] PostgreSQL query failed: {e}")
            if conn:
                conn.close()

    # Fallback to Local JSON DB file
    db = read_fallback_db()
    
    # Save workout log
    workout_log = {
        "id": len(db["workout_logs"]) + 1,
        "user_id": payload.user_id,
        "exercise_name": payload.exercise_name,
        "reps": payload.reps,
        "duration_seconds": payload.duration_seconds,
        "accuracy_score": payload.accuracy_score,
        "log_date": np.datetime64('today').astype(str)
    }
    db["workout_logs"].append(workout_log)

    # Update points
    updated_points = 0
    for idx, u in enumerate(db["users"]):
        if u["id"] == payload.user_id:
            db["users"][idx]["points"] = (db["users"][idx].get("points", 0)) + points_awarded
            updated_points = db["users"][idx]["points"]
            break
            
    write_fallback_db(db)
    return {"success": True, "points_awarded": points_awarded, "updated_points": updated_points}

# Math helper: Angle calculations
def calculate_angle(p1, p2, p3):
    try:
        radians = math.atan2(p3[1] - p2[1], p3[0] - p2[0]) - math.atan2(p1[1] - p2[1], p1[0] - p2[0])
        angle = abs(radians * 180.0 / math.pi)
        if angle > 180.0:
            angle = 360.0 - angle
        return angle
    except Exception:
        return 180.0

@app.websocket("/pose")
async def pose_websocket(websocket: WebSocket):
    await websocket.accept()
    print(f"[ML Server WebSocket] Client connected.")

    # State per connection
    reps = 0
    stage = "down"  # Curls default state. For squats we will use "up"
    accuracy_list = []
    exercise_name = "curls"

    try:
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            payload = json.loads(data)

            exercise_name = payload.get("exercise", "curls")
            image_data = payload.get("image")
            
            if not image_data:
                await websocket.send_json({"error": "No image data provided."})
                continue

            # Decode base64 image
            try:
                if "," in image_data:
                    header, encoded = image_data.split(",", 1)
                else:
                    encoded = image_data
                
                image_bytes = base64.b64decode(encoded)
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError("Decoding returned None image")
            except Exception as e:
                await websocket.send_json({"error": f"Base64 image decoding failed: {e}"})
                continue

            h, w, c = img.shape
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = pose.process(img_rgb)

            landmarks_list = None
            form_alert = "Stand in frame to begin..."
            is_critical = False

            if results.pose_landmarks:
                # Compile landmarks list to project back to client canvas
                landmarks_list = [
                    {
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,
                        "visibility": lm.visibility
                    }
                    for lm in results.pose_landmarks.landmark
                ]

                # Extract features for ML model classification
                flat_features = []
                for lm in results.pose_landmarks.landmark:
                    flat_features.extend([lm.x, lm.y, lm.z, lm.visibility])
                
                features_arr = np.array(flat_features).reshape(1, -1)

                # ML Classification inference
                predicted_class = -1
                if pose_classifier:
                    try:
                        predicted_class = int(pose_classifier.predict(features_arr)[0])
                    except Exception as e:
                        print(f"[ML Server Inference Error] {e}")

                # Perform evaluation
                landmarks = results.pose_landmarks.landmark
                
                if exercise_name == "curls":
                    # Curls keypoints: shoulder (11), elbow (13), wrist (15)
                    shoulder = [landmarks[11].x * w, landmarks[11].y * h]
                    elbow = [landmarks[13].x * w, landmarks[13].y * h]
                    wrist = [landmarks[15].x * w, landmarks[15].y * h]

                    if (landmarks[11].visibility > 0.5 and 
                        landmarks[13].visibility > 0.5 and 
                        landmarks[15].visibility > 0.5):
                        
                        angle = calculate_angle(shoulder, elbow, wrist)

                        # Standard stages (Fallbacks/Heuristics)
                        if angle > 150 or predicted_class == 1: # Curl Down
                            if stage == "up":
                                form_alert = "Good extension! Curl up now."
                                accuracy_list.append(100)
                            stage = "down"
                        
                        if (angle < 35 or predicted_class == 2) and stage == "down": # Curl Up
                            stage = "up"
                            reps += 1
                            form_alert = "Rep complete! Lower your arm slowly."
                            accuracy_list.append(100)
                        
                        # Warning / Wrong form triggers
                        if (50 < angle < 140 and stage == "up") or predicted_class == 5:
                            form_alert = "Warning: Incomplete extension! Extend your arm fully down."
                            is_critical = True
                            accuracy_list.append(60)

                elif exercise_name == "squats":
                    # Squats keypoints: shoulder (11), hip (23), knee (25), ankle (27)
                    shoulder = [landmarks[11].x * w, landmarks[11].y * h]
                    hip = [landmarks[23].x * w, landmarks[23].y * h]
                    knee = [landmarks[25].x * w, landmarks[25].y * h]
                    ankle = [landmarks[27].x * w, landmarks[27].y * h]

                    if (landmarks[23].visibility > 0.5 and 
                        landmarks[25].visibility > 0.5 and 
                        landmarks[27].visibility > 0.5):

                        knee_angle = calculate_angle(hip, knee, ankle)
                        back_angle = calculate_angle(shoulder, hip, knee)

                        # Set squats default starting state
                        if reps == 0 and stage == "down":
                            stage = "up"

                        # Squat reps and stage evaluation
                        if knee_angle < 100 or predicted_class == 4: # Squat Down
                            stage = "down"
                            if back_angle < 65 or predicted_class == 5:
                                form_alert = "Warning: Keep your back straight, chest up!"
                                is_critical = True
                                accuracy_list.append(50)
                            elif knee_angle < 75:
                                form_alert = "Warning: Going too deep! Protect your knees."
                                is_critical = True
                                accuracy_list.append(70)
                            else:
                                form_alert = "Good depth! Press through your heels."
                                accuracy_list.append(100)

                        if (knee_angle > 165 or predicted_class == 3) and stage == "down": # Squat Up
                            stage = "up"
                            reps += 1
                            form_alert = "Great rep! Squat down again."
                            accuracy_list.append(100)

            # Calculate current average accuracy
            avg_accuracy = int(sum(accuracy_list) / len(accuracy_list)) if accuracy_list else 100

            # Send response back to user
            response = {
                "detected": results.pose_landmarks is not None,
                "landmarks": landmarks_list,
                "reps": reps,
                "formAlert": form_alert,
                "isAlertCritical": is_critical,
                "accuracy": avg_accuracy
            }
            await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        print(f"[ML Server WebSocket] Client disconnected.")
    except Exception as e:
        print(f"[ML Server WebSocket Error] Loop terminated: {e}")
        try:
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_server:app", host="0.0.0.0", port=3001, reload=True)
