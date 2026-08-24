import os
import sys
import pickle
import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Any, Tuple
from transformers import AutoProcessor, Wav2Vec2Model

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.training.train_deep_model import DeepAntiSpoofHead, extract_deep_representation

class VoiceGuardMLP(nn.Module):
    """
    Legacy PyTorch Neural Network baseline mapping 38 acoustic features.
    """
    def __init__(self, input_dim: int = 38):
        super(VoiceGuardMLP, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.BatchNorm1d(32),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)

class ModelManager:
    """Manages loading and running inference on the deep Wav2Vec2 anti-spoof model."""
    def __init__(self, model_path: str = None, model_version: str = "voiceguard-deep-v1.0"):
        self.model_version = model_version
        self.device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
        
        self.processor = None
        self.encoder = None
        self.deep_head = None
        self.deep_scaler = None
        self.calibrator = None
        
        self.model_dir = os.path.dirname(os.path.abspath(__file__))
        self.saved_dir = os.path.join(self.model_dir, "saved_models")
        
    def load_model(self) -> bool:
        """Loads Wav2Vec2 transformer encoder, DeepAntiSpoofHead, Deep Scaler, and Platt Calibrator."""
        try:
            head_path = os.path.join(self.saved_dir, "voiceguard_deep_v1.0.pt")
            scaler_path = os.path.join(self.saved_dir, "voiceguard_deep_scaler.pkl")
            cal_path = os.path.join(self.saved_dir, "voiceguard_deep_calibrator.pkl")
            
            if os.path.exists(head_path) and os.path.exists(scaler_path) and os.path.exists(cal_path):
                print(f"[ModelManager] Loading Wav2Vec2 Base encoder on {self.device}...")
                self.processor = AutoProcessor.from_pretrained("facebook/wav2vec2-base")
                self.encoder = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(self.device)
                self.encoder.eval()
                
                print(f"[ModelManager] Loading Deep Classifier head from {head_path}...")
                self.deep_head = DeepAntiSpoofHead(input_dim=2304).to(self.device)
                self.deep_head.load_state_dict(torch.load(head_path, map_location=self.device))
                self.deep_head.eval()
                
                with open(scaler_path, "rb") as f:
                    self.deep_scaler = pickle.load(f)
                    
                with open(cal_path, "rb") as f:
                    self.calibrator = pickle.load(f)
                    
                print("[ModelManager] Deep Wav2Vec2 Pipeline loaded successfully.")
                return True
        except Exception as e:
            print(f"[ModelManager] Error loading Deep model: {e}")
            
        return False
        
    def predict_audio_waveform(self, y: np.ndarray, sr: int = 16000) -> float:
        """Runs end-to-end deep inference on raw audio waveform array (16kHz)."""
        if self.deep_head is None or self.encoder is None:
            self.load_model()
            
        try:
            vec = extract_deep_representation(y, self.processor, self.encoder, self.device)
            vec_scaled = self.deep_scaler.transform(vec.reshape(1, -1)).astype(np.float32)
            
            with torch.no_grad():
                raw_logit = self.deep_head(torch.tensor(vec_scaled).to(self.device))
                raw_score = torch.sigmoid(raw_logit).cpu().item()
                prob = float(self.calibrator.predict_proba(np.array([[raw_score]]))[:, 1][0])
                
            return float(prob)
        except Exception as e:
            print(f"[ModelManager] Prediction error: {e}")
            return 0.50

    def predict_probability(self, feature_vector: np.ndarray) -> float:
        """Legacy fallback interface for 38-feature vectors."""
        # For legacy 38-feature calls, return baseline value or forward to audio waveform
        return 0.50
