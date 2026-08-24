import os
import sys
import csv
import json
import pickle
import time
import numpy as np
import soundfile as sf
import librosa
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from transformers import AutoProcessor, Wav2Vec2Model
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, precision_recall_curve, roc_curve

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.preprocessing.audio import preprocess_audio_array

class DeepAntiSpoofHead(nn.Module):
    """
    Neural Classification Head built on top of 2304-dim multi-layer Wav2Vec2 embeddings (L3+L6+L12).
    Uses LayerNorm for stable evaluation without running mean drift.
    """
    def __init__(self, input_dim: int = 2304):
        super(DeepAntiSpoofHead, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.LayerNorm(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.LayerNorm(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

def augment_waveform(y: np.ndarray, sr: int = 16000, mode: str = "clean") -> np.ndarray:
    if mode == "telephony":
        import scipy.signal
        b, a = scipy.signal.butter(4, 3400 / (sr / 2), btype='low')
        return scipy.signal.filtfilt(b, a, y)
    elif mode == "noisy":
        noise = np.random.normal(0, 0.005, len(y))
        return y + noise
    elif mode == "gain":
        gain = np.random.uniform(0.6, 1.4)
        return y * gain
    return y

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

def train_and_evaluate_deep_pipeline():
    print("=== LAUNCHING PRETRAINED DEEP ANTI-SPOOF MODEL TRAINING ===")
    
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"[*] Target Compute Device: {device}")
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    manifest_path = os.path.join(base_dir, "data/manifest.csv")
    
    if not os.path.exists(manifest_path):
        print(f"[-] Manifest {manifest_path} not found. Run build_full_dataset.py first.")
        sys.exit(1)
        
    print("[*] Loading Wav2Vec2 Base encoder...")
    processor = AutoProcessor.from_pretrained("facebook/wav2vec2-base")
    encoder = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(device)
    encoder.eval()
    
    # Read manifest
    train_x, train_y = [], []
    val_x, val_y = [], []
    test_x, test_y, test_meta = [], [], []
    unseen_x, unseen_y, unseen_meta = [], [], []
    
    modes = ["clean", "telephony", "noisy", "gain"]
    
    with open(manifest_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fpath = os.path.join(base_dir, row["file"])
            if not os.path.exists(fpath):
                continue
                
            y, sr = librosa.load(fpath, sr=16000, mono=True)
            y_proc = preprocess_audio_array(y, sr, 16000)
            
            split = row["split"]
            label = int(row["label"])
            
            if split == "train":
                for m in modes:
                    y_aug = augment_waveform(y_proc, 16000, m)
                    vec = extract_deep_representation(y_aug, processor, encoder, device)
                    train_x.append(vec)
                    train_y.append(label)
            elif split == "val":
                for m in ["clean", "telephony"]:
                    y_aug = augment_waveform(y_proc, 16000, m)
                    vec = extract_deep_representation(y_aug, processor, encoder, device)
                    val_x.append(vec)
                    val_y.append(label)
            elif split == "test":
                vec = extract_deep_representation(y_proc, processor, encoder, device)
                test_x.append(vec)
                test_y.append(label)
                test_meta.append(row)
            elif split == "unseen_test":
                vec = extract_deep_representation(y_proc, processor, encoder, device)
                unseen_x.append(vec)
                unseen_y.append(label)
                unseen_meta.append(row)
                
    X_train = np.array(train_x, dtype=np.float32)
    y_train = np.array(train_y, dtype=np.float32)
    X_val = np.array(val_x, dtype=np.float32)
    y_val = np.array(val_y, dtype=np.float32)
    X_test = np.array(test_x, dtype=np.float32)
    y_test = np.array(test_y, dtype=np.float32)
    X_unseen = np.array(unseen_x, dtype=np.float32)
    y_unseen = np.array(unseen_y, dtype=np.float32)

    # Fit StandardScaler on Wav2Vec2 embeddings
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_val = scaler.transform(X_val)
    X_test = scaler.transform(X_test)
    X_unseen = scaler.transform(X_unseen)

    scaler_path = os.path.join(base_dir, "ml/models/saved_models/voiceguard_deep_scaler.pkl")
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    print(f"[+] Saved Deep Scaler to {scaler_path}")

    # Calculate pos_weight for class imbalance balancing
    num_pos = float(sum(y_train))
    num_neg = float(len(y_train) - num_pos)
    pos_weight = torch.tensor([num_neg / max(num_pos, 1.0)]).to(device)
    print(f"[*] Class ratio: {int(num_neg)} Genuine / {int(num_pos)} Synthetic. Weight: {pos_weight.item():.4f}")

    train_dataset = TensorDataset(torch.tensor(X_train).to(device), torch.tensor(y_train).unsqueeze(1).to(device))
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    
    head_model = DeepAntiSpoofHead(input_dim=2304).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.AdamW(head_model.parameters(), lr=0.001, weight_decay=1e-3)
    
    head_model.train()
    for epoch in range(50):
        total_loss = 0.0
        for bx, by in train_loader:
            optimizer.zero_grad()
            out = head_model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (epoch+1) % 10 == 0:
            print(f" Epoch {epoch+1:02d}/50 | Loss: {total_loss/len(train_loader):.4f}")
            
    # Save Model Weights
    saved_dir = os.path.join(base_dir, "ml/models/saved_models")
    os.makedirs(saved_dir, exist_ok=True)
    
    head_path = os.path.join(saved_dir, "voiceguard_deep_v1.0.pt")
    torch.save(head_model.state_dict(), head_path)
    
    # Calibrate on Val
    head_model.eval()
    with torch.no_grad():
        val_inputs = torch.tensor(X_val).to(device)
        val_logits = head_model(val_inputs)
        val_raw = torch.sigmoid(val_logits).cpu().numpy().flatten()
        
    calibrator = LogisticRegression()
    calibrator.fit(val_raw.reshape(-1, 1), y_val)
    
    cal_path = os.path.join(saved_dir, "voiceguard_deep_calibrator.pkl")
    with open(cal_path, "wb") as f:
        pickle.dump(calibrator, f)
        
    print(f"[+] Saved Deep Classifier to {head_path}")
    print(f"[+] Saved Platt Calibrator to {cal_path}")
    
    # Evaluate Disjoint Test Set
    with torch.no_grad():
        test_inputs = torch.tensor(X_test).to(device)
        test_logits = head_model(test_inputs)
        test_raw = torch.sigmoid(test_logits).cpu().numpy().flatten()
        test_probs = calibrator.predict_proba(test_raw.reshape(-1, 1))[:, 1]
        
    # EER threshold optimization on val set
    val_probs = calibrator.predict_proba(val_raw.reshape(-1, 1))[:, 1]
    fpr_v, tpr_v, thresh_v = roc_curve(y_val, val_probs)
    fnr_v = 1 - tpr_v
    optimal_idx = np.nanargmin(np.abs(fpr_v - fnr_v))
    opt_thresh = float(thresh_v[optimal_idx]) if len(thresh_v) > optimal_idx else 0.50
    print(f"[*] Optimal Validation Threshold (EER): {opt_thresh:.4f}")
    
    test_preds = (test_probs >= opt_thresh).astype(int)
        
    acc = accuracy_score(y_test, test_preds)
    prec = precision_score(y_test, test_preds, zero_division=0)
    rec = recall_score(y_test, test_preds, zero_division=0)
    f1 = f1_score(y_test, test_preds, zero_division=0)
    roc_auc = roc_auc_score(y_test, test_probs)
    
    fpr = float(sum(1 for yt, yp in zip(y_test, test_preds) if yt == 0 and yp == 1) / (sum(1 for yt in y_test if yt == 0) + 1e-6))
    fnr = float(sum(1 for yt, yp in zip(y_test, test_preds) if yt == 1 and yp == 0) / (sum(1 for yt in y_test if yt == 1) + 1e-6))
    
    # Evaluate Unseen Case Files
    with torch.no_grad():
        unseen_inputs = torch.tensor(X_unseen).to(device)
        unseen_logits = head_model(unseen_inputs)
        unseen_raw = torch.sigmoid(unseen_logits).cpu().numpy().flatten()
        unseen_probs = calibrator.predict_proba(unseen_raw.reshape(-1, 1))[:, 1]
        
    print("\n==================================================")
    print("      DISJOINT TEST SET EVALUATION METRICS       ")
    print("==================================================")
    print(f"Accuracy:        {acc*100:.2f}%")
    print(f"Precision:       {prec*100:.2f}%")
    print(f"Recall:          {rec*100:.2f}%")
    print(f"F1 Score:        {f1*100:.2f}%")
    print(f"ROC-AUC:         {roc_auc:.4f}")
    print(f"False Pos Rate:  {fpr*100:.2f}%")
    print(f"False Neg Rate:  {fnr*100:.2f}%")
    print("==================================================\n")
    
    print("==================================================")
    print("      UNSEEN REGRESSION TEST CASE EVALUATION     ")
    print("==================================================")
    for row, prob, raw in zip(unseen_meta, unseen_probs, unseen_raw):
        fname = os.path.basename(row["file"])
        pred_label = "SYNTHETIC" if prob >= 0.50 else "HUMAN"
        status = "PASS" if pred_label == "SYNTHETIC" else "FAIL"
        print(f"File:           {fname:<25}")
        print(f"Raw Head Score: {raw:.6f}")
        print(f"AI Probability: {prob*100:.2f}%")
        print(f"Prediction:     {pred_label}")
        print(f"Regression Test:{status}")
        print("-" * 50)
        
    # Write evaluation metrics to json
    metrics = {
        "model_accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc),
        "fpr": float(fpr),
        "fnr": float(fnr),
        "unseen_case_1_prob": float(unseen_probs[0]) if len(unseen_probs) > 0 else 0.0,
        "unseen_case_2_prob": float(unseen_probs[1]) if len(unseen_probs) > 1 else 0.0
    }
    metrics_path = os.path.join(base_dir, "ml/evaluation/evaluation_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

if __name__ == "__main__":
    train_and_evaluate_deep_pipeline()
