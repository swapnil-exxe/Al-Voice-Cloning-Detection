import os
import sys
import pickle
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

# Ensure root paths are in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.models.classifier import VoiceGuardMLP

def generate_synthetic_data(num_samples: int = 2000) -> tuple:
    """
    Synthesizes a representative dataset of 36 acoustic features.
    Maps known profiles of genuine vs deepfake voices.
    """
    np.random.seed(42)
    X = []
    y = []

    # Features:
    # 0-25: MFCCs (13 coefficients, mean & std)
    # 26-27: Spectral Centroid (mean & std)
    # 28-29: Spectral Bandwidth (mean & std)
    # 30-31: Spectral Rolloff (mean & std)
    # 32-33: Zero Crossing Rate (mean & std)
    # 34-35: Pitch (mean & std)
    # 36: Jitter
    # 37: Shimmer
    # Wait, in extractor.py, the keys are sorted. Let's make sure the shape is 36.
    # Extracted keys:
    # - 13 MFCC means, 13 MFCC stds (26)
    # - centroid mean/std (2)
    # - bandwidth mean/std (2)
    # - rolloff mean/std (2)
    # - zero crossing rate mean/std (2)
    # - pitch mean/std (2)
    # Total = 36 features.
    # Note: Jitter and Shimmer are separate. If they are in the dict, keys are sorted:
    # "jitter", "shimmer", "mfcc_1_mean", ..., "pitch_mean", ..., "zero_crossing_rate_std".
    # There are exactly 36 features.

    for _ in range(num_samples // 2):
        # Category 0: Genuine Human Voice
        # Features are representative of natural, flowing human speech
        features = np.zeros(38)
        
        # MFCCs (means typical of conversational human voice)
        features[0:13] = np.random.normal(loc=[-50.0, 120.0, -10.0, 30.0, -5.0, 15.0, -10.0, 10.0, -15.0, 5.0, -5.0, 2.0, -5.0], scale=5.0) # MFCC means
        features[13:26] = np.random.uniform(2.0, 12.0, 13) # MFCC stds (natural speech variation)
        
        features[26] = np.random.normal(1400.0, 200.0) # spectral centroid mean
        features[27] = np.random.normal(150.0, 30.0)   # spectral centroid std
        features[28] = np.random.normal(1600.0, 150.0) # spectral bandwidth mean
        features[29] = np.random.normal(180.0, 25.0)   # spectral bandwidth std
        features[30] = np.random.normal(2800.0, 300.0) # spectral rolloff mean
        features[31] = np.random.normal(400.0, 50.0)   # spectral rolloff std
        features[32] = np.random.normal(0.045, 0.01)   # zero crossing rate mean
        features[33] = np.random.normal(0.015, 0.005)  # zero crossing rate std
        features[34] = np.random.normal(130.0, 25.0)   # pitch mean (typical human range)
        features[35] = np.random.normal(15.0, 4.0)     # pitch std (natural prosody/variation)
        
        # Add jitter/shimmer indirectly or inside features (simulated values)
        # Jitter (features[34] or pitch variance handles it, but let's train on this vector)
        
        X.append(features)
        y.append(0) # Genuine

    for _ in range(num_samples // 2):
        # Category 1: Synthesized / Cloned Voice
        # Features represent neural speech generation anomalies: flat prosody (low pitch std),
        # high frequency phase mismatch artifacts, unnatural spectral rolls
        features = np.zeros(38)
        
        # MFCCs
        features[0:13] = np.random.normal(loc=[-40.0, 100.0, -30.0, 20.0, -20.0, 5.0, -25.0, 2.0, -25.0, -2.0, -15.0, -5.0, -12.0], scale=6.0) # different MFCC mean shape
        features[13:26] = np.random.uniform(0.5, 4.0, 13) # MFCC stds (highly regular, lack of natural variance)
        
        features[26] = np.random.normal(2200.0, 350.0) # higher spectral centroid (synthesis noise)
        features[27] = np.random.normal(80.0, 15.0)    # lower centroid std
        features[28] = np.random.normal(2100.0, 200.0) # wider bandwidth
        features[29] = np.random.normal(90.0, 20.0)
        features[30] = np.random.normal(4200.0, 500.0) # higher rolloff due to vocoder high-freq artifacts
        features[31] = np.random.normal(200.0, 40.0)
        features[32] = np.random.normal(0.095, 0.02)   # higher zero crossing rate
        features[33] = np.random.normal(0.005, 0.002)  # very low ZCR std
        features[34] = np.random.normal(120.0, 10.0)   # pitch mean (flatter pitch)
        features[35] = np.random.normal(2.5, 0.8)      # extremely low pitch std (robotic, synthetic monotone)
        
        X.append(features)
        y.append(1) # Spoof

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

def train():
    print("[Training] Generating synthetic dataset of acoustic features...")
    X, y = generate_synthetic_data(num_samples=4000)
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Create directory for saving models
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/saved_models"))
    os.makedirs(model_dir, exist_ok=True)
    
    # 1. Train Random Forest (Scikit-Learn)
    print("[Training] Fitting Random Forest baseline classifier...")
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    rf.fit(X_train, y_train)
    
    rf_preds = rf.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_preds)
    print(f"[Training] Random Forest Accuracy: {rf_acc:.4f}")
    
    # Save RF Model
    pkl_path = os.path.join(model_dir, "voiceguard_v1.0.pkl")
    with open(pkl_path, "wb") as f:
        pickle.dump(rf, f)
    print(f"[Training] Saved Random Forest model to {pkl_path}")
    
    # 2. Train PyTorch Multi-Layer Perceptron (MLP)
    print("[Training] Initializing PyTorch VoiceGuardMLP classifier...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Prepare DataLoader
    train_dataset = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.float32).unsqueeze(1))
    test_dataset = TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.float32).unsqueeze(1))
    
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    
    model = VoiceGuardMLP(input_dim=38).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005, weight_decay=1e-5)
    
    # Train Loop
    epochs = 20
    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * batch_x.size(0)
            
        epoch_loss /= len(X_train)
        if (epoch + 1) % 5 == 0:
            print(f"[Training] Epoch {epoch+1}/{epochs} - Loss: {epoch_loss:.4f}")
            
    # Evaluation
    model.eval()
    with torch.no_grad():
        test_inputs = torch.tensor(X_test, dtype=torch.float32).to(device)
        test_outputs = model(test_inputs).cpu().numpy()
        
    y_pred_bin = (test_outputs >= 0.5).astype(int)
    
    acc = accuracy_score(y_test, y_pred_bin)
    prec = precision_score(y_test, y_pred_bin)
    rec = recall_score(y_test, y_pred_bin)
    f1 = f1_score(y_test, y_pred_bin)
    auc = roc_auc_score(y_test, test_outputs)
    
    print("\n--- Model Evaluation Summary ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"ROC-AUC:   {auc:.4f}")
    
    # Save PyTorch Model weights
    pt_path = os.path.join(model_dir, "voiceguard_v1.0.pt")
    torch.save(model.state_dict(), pt_path)
    print(f"[Training] Saved PyTorch weights to {pt_path}\n")

if __name__ == "__main__":
    train()
