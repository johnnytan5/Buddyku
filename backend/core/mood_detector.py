import os

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "..", "notebook")

model_path = os.path.abspath(model_path)
print(f"Model Path: {model_path}")

import cv2
print(cv2.__version__)
import numpy as np
import tensorflow as tf

class MoodDetector:
    def __init__(self, model_path, img_size=(48,48), class_labels = None):
        self.model = tf.keras.models.load_model(model_path)
        self.img_size = img_size
        self.class_labels = class_labels
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    
    def detect_mood(self,frame):
        """OpenCV detect face and predict mood in a single frame"""
        results = []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # detect faces in image
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x,y,w,h) in faces:
            roi = frame[y:y+h, x:x+w] # extract region of interst of face
            roi = cv2.resize(roi, self.img_size) # resize to match input size expected by trained model
            roi = roi.astype("float32") / 255.0 # normalize pixel values
            roi = np.expand_dims(roi, axis=0) # add batch dimension

            preds = self.model.predict(roi, verbose=0)[0] # get model predictions
            label = self.class_labels[np.argmax(preds)] # get the class with highest prob
            score = float(np.max(preds)) # confidence score

            results.append({
                "bbox": (x,y,w,h), # bounding box coordinates
                "mood": label, #predicted mood
                "confidence": score,
            })

            # draw rectangle around face
            cv2.rectangle(frame, (x,y), (x+w, y+h), (0, 255, 0), 2)

            cv2.putText(frame, f"{label} ({score:.2f})", (x, y-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36,255,12), 2)
            
            return frame, results
        
    def start_webcam(self):
            """Run mood detection on webcam feed"""

            # webcam init
            cap = cv2.VideoCapture(0) 

            while True:
                ret, frame = cap.read()

                if not ret:
                    break
                frame, _ = self.detect_mood(frame)
                cv2.imshow("Mood Detection", frame)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
            
            cap.release()
            cv2.destroyAllWindows()

def open_webcam():
    cap = cv2.VideoCapture(0)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        cv2.imshow("Webcam", frame)
        
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # detector = MoodDetector(model_path=model_path)
    # detector.start_webcam()

    open_webcam()

