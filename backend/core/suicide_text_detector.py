import os
import pickle
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import neattext.functions as nfx

class SuicideTextDetector:
    def __init__(self, model_path=None, tokenizer_path=None):
        """Initialize the Suicide Text Detector with model and tokenizer"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Set default paths if not provided
        if model_path is None:
            model_path = os.path.join(current_dir, "..", "notebook", "suicide-text-model.keras")
        if tokenizer_path is None:
            tokenizer_path = os.path.join(current_dir, "..", "notebook", "tokenizer.pkl")
        
        # Load model and tokenizer
        self.model_path = os.path.abspath(model_path)
        self.tokenizer_path = os.path.abspath(tokenizer_path)
        
        print(f"Loading model from: {self.model_path}")
        print(f"Loading tokenizer from: {self.tokenizer_path}")
        
        try:
            self.model = load_model(self.model_path)
            with open(self.tokenizer_path, 'rb') as tokenizer_file:
                self.tokenizer = pickle.load(tokenizer_file)
            print("Model and tokenizer loaded successfully")
        except Exception as e:
            print(f"Error loading model or tokenizer: {str(e)}")
            raise
        
        # Maximum sequence length (should match training)
        self.max_len = 50
        
        # Risk thresholds
        self.high_risk_threshold = 0.8
        self.moderate_risk_threshold = 0.5
    
    def clean_text(self, text):
        """Clean and preprocess text"""
        text = text.lower()
        text = nfx.remove_special_characters(text)
        text = nfx.remove_stopwords(text)
        return text
    
    def detect_suicide_risk(self, text):
        """Detect suicide risk in text and return confidence and risk level"""
        # Clean the text
        cleaned_text = self.clean_text(text)
        
        # Convert to sequence and pad
        sequence = self.tokenizer.texts_to_sequences([cleaned_text])
        padded = pad_sequences(sequence, maxlen=self.max_len)
        
        # Get prediction
        prediction = float(self.model.predict(padded)[0][0])
        
        # Determine risk level
        if prediction >= self.high_risk_threshold:
            risk_level = "HIGH"
        elif prediction >= self.moderate_risk_threshold:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"
        
        # Identify concerning words or phrases
        concerning_phrases = self.identify_concerning_phrases(text.lower())
        
        return {
            "text": text,
            "cleaned_text": cleaned_text,
            "suicide_confidence": prediction,
            "risk_level": risk_level,
            "risk_score": prediction,  # Using prediction as risk score
            "concerning_phrases": concerning_phrases
        }
    
    def identify_concerning_phrases(self, text):
        """Identify specific concerning phrases in the text"""
        concerning_phrases = []
        text_lower = text.lower()
        
        # Dictionary of concerning phrases and their severity (1-10)
        phrase_dict = {
            "kill myself": 10,
            "want to die": 9,
            "end my life": 9,
            "suicide": 8,
            "no reason to live": 8, 
            "better off without me": 7,
            "can't take it anymore": 6,
            "don't want to be here": 6,
            "tired of living": 6,
            "hopeless": 5,
            "worthless": 5,
            "no future": 5,
            "give up": 4,
            "no point": 4
        }
        
        # Check for concerning phrases
        for phrase, severity in phrase_dict.items():
            if phrase in text_lower:
                concerning_phrases.append({
                    "phrase": phrase,
                    "severity": severity
                })
        
        return concerning_phrases
    
    def analyze_chat_history(self, messages):
        """Analyze a list of chat messages for suicide risk patterns"""
        if not messages:
            return {"risk_level": "UNKNOWN", "risk_score": 0, "analysis": "No messages to analyze"}
        
        # Analyze each message
        message_scores = []
        concerning_phrases_count = 0
        high_risk_messages = 0
        
        for msg in messages:
            result = self.detect_suicide_risk(msg)
            message_scores.append(result["suicide_confidence"])
            concerning_phrases_count += len(result["concerning_phrases"])
            if result["risk_level"] == "HIGH":
                high_risk_messages += 1
        
        # Calculate aggregate risk score
        avg_score = sum(message_scores) / len(message_scores)
        max_score = max(message_scores)
        
        # Weight recent messages more heavily (if there are enough messages)
        if len(message_scores) >= 5:
            recent_avg = sum(message_scores[-5:]) / 5
            # Blend recent and overall average (70% recent, 30% overall)
            weighted_score = (recent_avg * 0.7) + (avg_score * 0.3)
        else:
            weighted_score = avg_score
        
        # Apply modifiers
        if high_risk_messages >= 2:
            weighted_score += 0.1  # Increase score if multiple high-risk messages
        
        if concerning_phrases_count >= 3:
            weighted_score += 0.1  # Increase score if multiple concerning phrases
        
        # Cap the score at 1.0
        final_score = min(weighted_score, 1.0)
        
        # Determine overall risk level
        if final_score >= 0.8:
            risk_level = "HIGH"
        elif final_score >= 0.5:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"
        
        return {
            "risk_level": risk_level,
            "risk_score": final_score,
            "max_message_score": max_score,
            "avg_message_score": avg_score,
            "high_risk_messages": high_risk_messages,
            "concerning_phrases_count": concerning_phrases_count,
            "message_count": len(messages)
        }


if __name__ == "__main__":
    # Test the detector
    detector = SuicideTextDetector()
    
    # Test with sample messages
    test_messages = [
        "I'm feeling good today!",
        "I don't think I can go on anymore, life is too hard",
        "I'm considering ending it all",
        "Just had a great lunch with friends"
    ]
    
    print("\nTesting individual messages:")
    for message in test_messages:
        result = detector.detect_suicide_risk(message)
        print(f"\nMessage: {message}")
        print(f"Risk Level: {result['risk_level']}")
        print(f"Confidence Score: {result['suicide_confidence']:.4f}")
        if result['concerning_phrases']:
            print("Concerning phrases found:")
            for phrase in result['concerning_phrases']:
                print(f"  - {phrase['phrase']} (Severity: {phrase['severity']})")
    
    # Test chat history analysis
    print("\nTesting chat history analysis:")
    chat_result = detector.analyze_chat_history(test_messages)
    print(f"Overall Risk Level: {chat_result['risk_level']}")
    print(f"Risk Score: {chat_result['risk_score']:.4f}")
    print(f"High Risk Messages: {chat_result['high_risk_messages']}")
    print(f"Concerning Phrases Count: {chat_result['concerning_phrases_count']}")