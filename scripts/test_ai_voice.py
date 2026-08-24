import os
import sys
import time
import numpy as np
import librosa

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.features.extractor import extract_features, convert_features_to_vector
from ml.models.classifier import ModelManager
from ml.preprocessing.audio import preprocess_audio_array
from backend.app.ml.language_id import identify_language

def test_ai_voice(audio_path: str):
    if not os.path.exists(audio_path):
        print(f"[-] Error: Audio file {audio_path} not found.")
        sys.exit(1)
        
    print(f"=== TESTING AI VOICE REGRESSION: {os.path.basename(audio_path)} ===")
    
    model_manager = ModelManager()
    model_manager.load_model()
    
    t0 = time.perf_counter()
    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    y_proc = preprocess_audio_array(y, sr, 16000)
    
    features = extract_features(y_proc, 16000)
    vector = convert_features_to_vector(features)
    
    prob = model_manager.predict_probability(vector)
    t_latency = (time.perf_counter() - t0) * 1000
    
    lang_code, lang_conf = identify_language(vector, duration=len(y)/16000)
    
    prediction = "SYNTHETIC" if prob >= 0.50 else "HUMAN"
    
    print("--------------------------------------------------")
    print(f"File:               {os.path.basename(audio_path)}")
    print(f"Language Detected:  {lang_code} ({lang_conf*100:.1f}%)")
    print(f"AI Probability:     {prob*100:.2f}%")
    print(f"Prediction:         {prediction}")
    print(f"Processing Time:    {t_latency:.2f} ms")
    print("--------------------------------------------------")
    
    if prediction == "SYNTHETIC":
        print("[+] PASS: AI voice correctly identified as SYNTHETIC.")
        sys.exit(0)
    else:
        print("[-] FAIL: AI voice misclassified as HUMAN.")
        sys.exit(1)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "/Users/swapnil/Base Zero /voiceguard/data/failed_ai_voice.mp3"
    test_ai_voice(target)
