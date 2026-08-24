import os
import sys
import numpy as np
import librosa

# Add paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.features.extractor import extract_features, convert_features_to_vector
from ml.models.classifier import ModelManager
from ml.preprocessing.audio import preprocess_audio_array

def test_pipeline_consistency():
    print("=== LIVE VS OFFLINE PIPELINE CONSISTENCY CHECK ===")
    
    # Locate test WAV file
    test_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/genuine/libri_genuine_1.wav"))
    if not os.path.exists(test_file):
        print(f"[-] Test file not found at {test_file}. Creating synthetic test file...")
        y_synth = np.random.normal(0, 0.1, 48000).astype(np.float32)
        import soundfile as sf
        os.makedirs(os.path.dirname(test_file), exist_ok=True)
        sf.write(test_file, y_synth, 16000)
        
    y, sr = librosa.load(test_file, sr=16000, mono=True)
    print(f"Loaded audio sample. Duration: {len(y)/sr:.2f}s, Sample Rate: {sr}Hz")
    
    # 1. Offline Pipeline Evaluation
    print("Running offline pipeline...")
    # Preprocess
    y_proc = preprocess_audio_array(y, sr, 16000)
    features_off = extract_features(y_proc, 16000)
    vec_off = convert_features_to_vector(features_off)
    
    model_manager = ModelManager()
    model_manager.load_model()
    
    prob_offline = model_manager.predict_probability(vec_off)
    print(f" [+] Offline AI Probability: {prob_offline:.4f}")
    
    # 2. Simulated Live WebSocket Pipeline Evaluation
    print("Running simulated live WebSocket pipeline...")
    audio_buffer = []
    chunk_size = 4096 # ~256ms chunk
    offset = 0
    prob_live = 0.0
    
    while offset < len(y):
        chunk = y[offset:offset + chunk_size]
        audio_buffer.extend(chunk.tolist())
        offset += chunk_size
        
        # When 3.0s window is filled, run the WebSocket preprocessing
        if len(audio_buffer) >= 48000:
            analysis_window = np.array(audio_buffer[-48000:], dtype=np.float32)
            
            # VAD / Energy gate
            rms = np.sqrt(np.mean(analysis_window ** 2))
            if rms < 0.003:
                continue
                
            # Loudness normalization
            max_val = np.max(np.abs(analysis_window))
            if max_val > 0.001:
                analysis_window_normalized = analysis_window / max_val
            else:
                analysis_window_normalized = analysis_window
                
            # Extract features on normalized window
            features_live = extract_features(analysis_window_normalized, 16000)
            vec_live = convert_features_to_vector(features_live)
            prob_live = model_manager.predict_probability(vec_live)
            
    print(f" [+] Live AI Probability:    {prob_live:.4f}")
    
    # Compute absolute discrepancy difference
    diff = abs(prob_offline - prob_live)
    print(f"Absolute Discrepancy: {diff:.6f}")
    
    if diff > 0.05:
        print("[-] FAIL: Discrepancy exceeds strict 0.05 limit! Predictions drift between live and offline runs.")
        sys.exit(1)
    else:
        print("[+] PASS: Live and offline pipelines are numerically consistent.")
        sys.exit(0)

if __name__ == "__main__":
    test_pipeline_consistency()
