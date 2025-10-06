import os
import cv2
import numpy as np
import tensorflow as tf
import time

# ==========================
# CONFIGURATION
# ==========================
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, ".", "mood_detection_model", "happy_sad_model.keras")
model_path = os.path.abspath(model_path)
print(f"Model Path: {model_path}")

IMG_SIZE = (48, 48)
CLASS_LABELS = ["happy", "sad"]

# ==========================
# MOOD DETECTOR CLASS
# ==========================
class HappySadDetector:
    def __init__(self, model_path, img_size=(48, 48), class_labels=None):
        self.model = tf.keras.models.load_model(model_path, compile=False)
        self.img_size = img_size
        self.class_labels = class_labels or ["Happy", "Sad"]
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.mood_history = []
        self.max_history_length = 50

        # For time-based inference
        self.last_inference_time = 0
        self.inference_interval = 2  # seconds

        # For showing last prediction
        self.last_results = []

    def track_mood_changes(self, mood, score):
        """Track emotion changes and visualize trends."""
        self.mood_history.append({"mood": mood, "score": score, "time": time.time()})
        if len(self.mood_history) > self.max_history_length:
            self.mood_history.pop(0)

        if len(self.mood_history) < 5:
            return None, 0, 0

        recent = self.mood_history[-5:]
        happy_count = sum(1 for m in recent if m["mood"] == "happy")
        sad_count = 5 - happy_count

        alert = None
        if sad_count >= 4:
            alert = "Consistently Sad"
        elif happy_count >= 4:
            alert = "Consistently Happy"

        return alert, happy_count, sad_count

    def detect_emotion(self, frame):
        """Run emotion detection every 2 seconds."""
        now = time.time()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        if now - self.last_inference_time >= self.inference_interval:
            self.last_results = []  # reset results
            for (x, y, w, h) in faces:
                face = gray[y:y+h, x:x+w]
                face_resized = cv2.resize(face, self.img_size)
                face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_GRAY2RGB)
                face_input = np.expand_dims(face_rgb, axis=0).astype("float32") / 255.0

                preds = self.model.predict(face_input, verbose=0)[0]
                label = self.class_labels[np.argmax(preds)]
                confidence = float(np.max(preds))

                alert, happy_count, sad_count = self.track_mood_changes(label, confidence)

                self.last_results.append({
                    "bbox": (x, y, w, h),
                    "emotion": label,
                    "confidence": confidence,
                    "alert": alert,
                    "happy_count": happy_count,
                    "sad_count": sad_count
                })

            self.last_inference_time = now  # ⏱️ update timestamp

        # Draw the last detected results even if not inferring this frame
        for res in self.last_results:
            (x, y, w, h) = res["bbox"]
            label = res["emotion"]
            confidence = res["confidence"]
            color = (0, 255, 0) if label == "happy" else (0, 0, 255)

            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            cv2.putText(frame, f"{label} ({confidence:.2f})", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

            if res["alert"]:
                cv2.putText(frame, res["alert"], (x, y + h + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

            cv2.putText(frame, f"Recent H:{res['happy_count']} S:{res['sad_count']}",
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 255, 200), 2)

        return frame, self.last_results

    def start_webcam(self):
        cap = None
        for i in range(3):  # try webcam indices 0,1,2
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                print(f"[INFO] Using webcam index {i}")
                break
        if not cap or not cap.isOpened():
            print("[ERROR] Could not open webcam.")
            return

        print("[INFO] Press 'q' to quit.")
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame, _ = self.detect_emotion(frame)
            cv2.putText(frame, "Happy/Sad Emotion Detector (2s refresh)",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.imshow("Emotion Detection", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        cap.release()
        cv2.destroyAllWindows()

# ==========================
# MAIN EXECUTION
# ==========================
if __name__ == "__main__":
    detector = HappySadDetector(model_path=model_path)
    detector.start_webcam()
