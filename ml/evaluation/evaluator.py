import os
import sys
import numpy as np
import torch
import pickle
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

# Ensure root paths are in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.models.classifier import VoiceGuardMLP, ModelManager
from ml.training.train_model import generate_synthetic_data

def evaluate_models():
    print("[Evaluator] Loading evaluation dataset...")
    X, y = generate_synthetic_data(num_samples=1000)
    
    # Load PyTorch
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/saved_models"))
    pt_path = os.path.join(model_dir, "voiceguard_v1.0.pt")
    pkl_path = os.path.join(model_dir, "voiceguard_v1.0.pkl")
    
    print("\n==================================================")
    print("             VOICEGUARD BENCHMARK REPORT           ")
    print("==================================================")
    
    # 1. Evaluate Random Forest (Baseline)
    if os.path.exists(pkl_path):
        with open(pkl_path, "rb") as f:
            rf = pickle.load(f)
        rf_preds = rf.predict(X)
        rf_probs = rf.predict_proba(X)[:, 1]
        
        acc = accuracy_score(y, rf_preds)
        prec = precision_score(y, rf_preds)
        rec = recall_score(y, rf_preds)
        f1 = f1_score(y, rf_preds)
        auc = roc_auc_score(y, rf_probs)
        
        print("Model: Random Forest Baseline")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        print(f"  ROC-AUC:   {auc:.4f}")
        print("--------------------------------------------------")
    else:
        print("Random Forest baseline model not found. Run training script first.")
        
    # 2. Evaluate PyTorch MLP (Deep Learning)
    if os.path.exists(pt_path):
        model = VoiceGuardMLP(input_dim=38)
        model.load_state_dict(torch.load(pt_path, map_location=torch.device('cpu')))
        model.eval()
        
        with torch.no_grad():
            outputs = model(torch.tensor(X, dtype=torch.float32)).numpy()
            
        preds = (outputs >= 0.5).astype(int).flatten()
        
        acc = accuracy_score(y, preds)
        prec = precision_score(y, preds)
        rec = recall_score(y, preds)
        f1 = f1_score(y, preds)
        auc = roc_auc_score(y, outputs)
        
        # Calculate Equal Error Rate (EER) approximation
        # Find threshold where False Positive Rate ≈ False Negative Rate
        thresholds = np.linspace(0, 1, 100)
        fprs = []
        fnrs = []
        for t in thresholds:
            t_preds = (outputs >= t).astype(int).flatten()
            fp = np.sum((t_preds == 1) & (y == 0))
            fn = np.sum((t_preds == 0) & (y == 1))
            tn = np.sum((t_preds == 0) & (y == 0))
            tp = np.sum((t_preds == 1) & (y == 1))
            
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
            fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
            fprs.append(fpr)
            fnrs.append(fnr)
            
        # EER is point where fprs and fnrs are closest
        idx = np.argmin(np.abs(np.array(fprs) - np.array(fnrs)))
        eer = (fprs[idx] + fnrs[idx]) / 2.0
        
        print("Model: PyTorch Deep Learning MLP")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        print(f"  ROC-AUC:   {auc:.4f}")
        print(f"  EER:       {eer:.4f}")
        print("==================================================")
    else:
        print("PyTorch MLP model not found. Run training script first.")

if __name__ == "__main__":
    evaluate_models()
