import os
import sys
import pickle
import time
import numpy as np
import librosa
import torch
from transformers import AutoProcessor, Wav2Vec2Model

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.preprocessing.audio import preprocess_audio_array
from ml.training.train_deep_model import DeepAntiSpoofHead
from backend.app.ml.language_id import identify_language
from ml.features.extractor import extract_features, convert_features_to_vector

def extract_deep_representation(y: np.ndarray, processor, encoder, device) -> np.ndarray:
    y_slice = y[:48000] if len(y) >= 48000 else np.pad(y, (0, 48000 - len(y)))
    inputs = processor(y_slice, sampling_rate=16000, return_tensors="pt").input_values.to(device)
    with torch.no_grad():
        outputs = encoder(inputs, output_hidden_states=True)
        l3 = outputs.hidden_states[3].mean(dim=1)
        l6 = outputs.hidden_states[6].mean(dim=1)
        l12 = outputs.hidden_states[12].mean(dim=1)
        vec = torch.cat([l3, l6, l12], dim=1).squeeze().cpu().numpy()
    return vec

def run_regression_test():
    print("========================================")
    print("     VOICEGUARD AI REGRESSION TEST      ")
    print("========================================")
    
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    saved_dir = os.path.join(base_dir, "ml/models/saved_models")
    
    head_path = os.path.join(saved_dir, "voiceguard_deep_v1.0.pt")
    cal_path = os.path.join(saved_dir, "voiceguard_deep_calibrator.pkl")
    lid_path = os.path.join(saved_dir, "voiceguard_lid.pkl")
    
    if not os.path.exists(head_path) or not os.path.exists(cal_path):
        print(f"[-] Error: Deep model weights not found at {head_path}.")
        sys.exit(1)
        
    # Load Models
    processor = AutoProcessor.from_pretrained("facebook/wav2vec2-base")
    encoder = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(device)
    encoder.eval()
    
    head_model = DeepAntiSpoofHead(input_dim=2304).to(device)
    head_model.load_state_dict(torch.load(head_path, map_location=device))
    head_model.eval()
    
    scaler_path = os.path.join(saved_dir, "voiceguard_deep_scaler.pkl")
    with open(scaler_path, "rb") as f:
        scaler = pickle.load(f)

    with open(cal_path, "rb") as f:
        calibrator = pickle.load(f)
        
    test_cases = [
        ("failed_ai_voice.mp3", "data/failed_ai_voice.mp3", "SYNTHETIC"),
        ("ai_sample2.mp3", "data/ai_sample2.mp3", "SYNTHETIC"),
        ("genuine_control_01.wav", "data/corpus/genuine/eng_gen_spk_09.wav", "HUMAN"),
        ("genuine_control_02.wav", "data/corpus/genuine/eng_gen_spk_10.wav", "HUMAN")
    ]
    
    for label, rel_path, expected_target in test_cases:
        full_path = os.path.join(base_dir, rel_path)
        if not os.path.exists(full_path):
            print(f"[-] Skipping {label}: File {full_path} not found.")
            continue
            
        t0 = time.perf_counter()
        y, sr = librosa.load(full_path, sr=16000, mono=True)
        y_proc = preprocess_audio_array(y, sr, 16000)
        
        # Deep representation
        vec = extract_deep_representation(y_proc, processor, encoder, device)
        vec_scaled = scaler.transform(vec.reshape(1, -1)).astype(np.float32)
        
        with torch.no_grad():
            raw_logit = head_model(torch.tensor(vec_scaled).to(device))
            raw_score = torch.sigmoid(raw_logit).cpu().item()
            prob = float(calibrator.predict_proba(np.array([[raw_score]]))[:, 1][0])
            
        t_latency_ms = (time.perf_counter() - t0) * 1000
        
        # Language ID
        feat_vec = convert_features_to_vector(extract_features(y_proc, 16000))
        lang_code, lang_conf = identify_language(feat_vec, duration=len(y)/16000)
        
        pred_class = "SYNTHETIC" if prob >= 0.50 else "HUMAN"
        status = "PASS" if pred_class == expected_target else "FAIL"
        
        print(f"\nFile:               {label}")
        print(f"Path:               {rel_path}")
        print(f"Language Detected:  {lang_code} ({lang_conf*100:.1f}%)")
        print(f"AI Probability:     {prob*100:.2f}%")
        print(f"Prediction:         {pred_class}")
        print(f"Latency:            {t_latency_ms:.2f} ms")
        print(f"Status:             {status}")
        print("-" * 40)
        
    print("\n========================================")

if __name__ == "__main__":
    run_regression_test()
