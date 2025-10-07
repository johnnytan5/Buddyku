import os

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "..", "notebook", "suicide_mood_model.keras")


model_path = os.path.abspath(model_path)
print(f"Model Path: {model_path}")

import cv2
print(cv2.__version__)
import numpy as np
import tensorflow as tf

class MoodDetector:
    def __init__(self, model_path, img_size=(224,224), class_labels=None):
        self.model = tf.keras.models.load_model(model_path, compile=False)
        self.img_size = img_size
        self.class_labels = class_labels or ["Negative", "Positive"]  # Binary classification
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        # Initialize mood history for temporal tracking
        self.mood_history = []
        # Maximum history length to prevent memory issues
        self.max_history_length = 100
    
    def calculate_risk(self, emotion_probs):
        """Calculate suicide risk score from binary emotion probabilities"""
        # For binary model - risk is directly related to negative emotion probability
        risk_score = emotion_probs[0]  # Probability of negative emotion
        
        # Determine risk level based on negative emotion probability
        if risk_score >= 0.75:
            risk_level = "HIGH"
            color = (0, 0, 255)  # Red for high risk
        elif risk_score >= 0.5:
            risk_level = "MODERATE"
            color = (0, 165, 255)  # Orange for moderate risk
        else:
            risk_level = "LOW"
            color = (0, 255, 0)  # Green for low risk
            
        return risk_score, risk_level, color
    
    def track_mood_changes(self, mood, score):
        """Track mood changes over time to detect concerning patterns"""
        import time
        
        # Add current mood to history with timestamp
        self.mood_history.append({
            "mood": mood,
            "score": score,
            "timestamp": time.time()
        })
        
        # Limit history length
        if len(self.mood_history) > self.max_history_length:
            self.mood_history.pop(0)
            
        # Analyze only if we have enough data
        if len(self.mood_history) < 5:
            return None
        
        # Look for concerning patterns
        recent_moods = self.mood_history[-5:]
        
        # Check for sustained negative emotions (4+ of last 5 predictions are Negative)
        negative_count = sum(1 for entry in recent_moods if entry["mood"] == "Negative")
        if negative_count >= 4:
            return "ALERT: Sustained negative emotions detected"
        
        # Check for emotional instability (rapid changes between emotions)
        changes = 0
        for i in range(1, len(recent_moods)):
            if recent_moods[i]["mood"] != recent_moods[i-1]["mood"]:
                changes += 1
        
        if changes >= 3:  # 3+ changes in last 5 detections
            return "ALERT: Emotional instability detected"
            
        return None
    
    def detect_mood(self, frame):
        """OpenCV detect face and predict mood in a single frame"""
        results = []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # detect faces in image
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x,y,w,h) in faces:
            roi = frame[y:y+h, x:x+w] # extract region of interest of face
            roi = cv2.resize(roi, self.img_size) # resize to match input size expected by trained model
            roi = roi.astype("float32") / 255.0 # normalize pixel values
            roi = np.expand_dims(roi, axis=0) # add batch dimension

            preds = self.model.predict(roi, verbose=0)[0] # get model predictions
            label = self.class_labels[np.argmax(preds)] # get the class with highest prob
            score = float(np.max(preds)) # confidence score
            
            # Calculate suicide risk based on negative emotion probability
            risk_score, risk_level, risk_color = self.calculate_risk(preds)
            
            # Track mood changes
            alert = self.track_mood_changes(label, score)
            
            # For displaying emotions more specifically - parse if fearful or sad
            emotion_description = label
            if label == "Negative" and score > 0.85:
                emotion_description = "Negative (High)"

            results.append({
                "bbox": (x,y,w,h), # bounding box coordinates
                "mood": label, # predicted mood
                "emotion_description": emotion_description,
                "confidence": score,
                "negative_prob": float(preds[0]),  # Specifically track negative emotion probability
                "positive_prob": float(preds[1]),  # Specifically track positive emotion probability
                "risk_score": risk_score,
                "risk_level": risk_level,
                "alert": alert
            })

            # Draw rectangle around face
            cv2.rectangle(frame, (x,y), (x+w, y+h), (0, 255, 0), 2)

            # Display mood and confidence - use different colors based on emotion
            text_color = (0, 0, 255) if label == "Negative" else (0, 255, 0)  
            cv2.putText(frame, f"{label} ({score:.2f})", (x, y-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, text_color, 2)
            
            # Display risk assessment
            cv2.putText(frame, f"Risk: {risk_level} ({risk_score:.2f})", 
                      (x, y+h+25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, risk_color, 2)
            
            # Display alert if present
            if alert:
                cv2.putText(frame, alert, (x, y+h+50), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
        return frame, results
        
    def start_webcam(self):
        """Run mood detection on webcam feed"""
        # webcam init
        cap = cv2.VideoCapture(0) 

        while True:
            ret, frame = cap.read()

            if not ret:
                break
                
            frame, results = self.detect_mood(frame)
            
            # Add overall title
            cv2.putText(frame, "Suicide Risk Detection System", 
                      (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                      
            # Add binary classification explanation
            cv2.putText(frame, "Negative = Sad/Fearful, Positive = Happy", 
                      (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Display risk threshold explanation
            cv2.putText(frame, "Risk: <0.5=LOW, 0.5-0.75=MODERATE, >0.75=HIGH", 
                      (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Display guidance at bottom of frame
            cv2.putText(frame, "Press 'q' to quit", (10, frame.shape[0]-10),
                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow("Suicide Risk Detection", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        
        cap.release()
        cv2.destroyAllWindows()

    def process_image(self, image_path):
        """Process a single image file instead of webcam feed"""
        frame = cv2.imread(image_path)
        if frame is None:
            return None, "Could not read image file"
        
        processed_frame, results = self.detect_mood(frame)
        return processed_frame, results
        
    def process_batch(self, image_dir, output_dir=None):
        """Process a directory of images and save results"""
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        results_dict = {}
        
        for img_file in os.listdir(image_dir):
            if img_file.lower().endswith(('.png', '.jpg', '.jpeg')):
                img_path = os.path.join(image_dir, img_file)
                processed_frame, face_results = self.process_image(img_path)
                
                if processed_frame is not None and output_dir:
                    output_path = os.path.join(output_dir, f"processed_{img_file}")
                    cv2.imwrite(output_path, processed_frame)
                
                results_dict[img_file] = face_results
                
        return results_dict

if __name__ == "__main__":
    detector = MoodDetector(model_path=model_path)
    detector.start_webcam()