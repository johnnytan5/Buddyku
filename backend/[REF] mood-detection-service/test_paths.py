#!/usr/bin/env python3
"""
Test script to verify the paths and tokenizer loading
"""

import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.suicide_text_detector import SuicideTextDetector

def test_paths():
    """Test the paths and tokenizer loading"""
    print("🔍 Testing SuicideTextDetector initialization...")
    
    try:
        # Initialize the detector
        detector = SuicideTextDetector()
        
        print("✅ SuicideTextDetector initialized successfully")
        print(f"📁 Model path: {detector.model_path}")
        print(f"📁 Tokenizer path: {detector.tokenizer_path}")
        
        # Check if files exist
        if os.path.exists(detector.model_path):
            print("✅ Model file exists")
        else:
            print("❌ Model file not found")
            
        if os.path.exists(detector.tokenizer_path):
            print("✅ Tokenizer file exists")
        else:
            print("❌ Tokenizer file not found")
        
        # Test the tokenizer
        try:
            test_text = "I am feeling hopeless"
            result = detector.detect_suicide_risk(test_text)
            print("✅ Text detection test successful")
            print(f"📊 Result: {result}")
        except Exception as e:
            print(f"❌ Text detection test failed: {e}")
            
    except Exception as e:
        print(f"❌ Initialization failed: {e}")

if __name__ == "__main__":
    test_paths()
