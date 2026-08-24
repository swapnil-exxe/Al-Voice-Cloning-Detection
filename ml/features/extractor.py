import numpy as np
import librosa
from typing import Dict, Any

def extract_features(y: np.ndarray, sr: int = 16000) -> Dict[str, Any]:
    """
    Extracts acoustic, spectral, and prosodic features from a processed audio buffer.
    Ensures safe fallbacks if audio is too short or silent.
    """
    features = {}
    
    # Avoid processing empty or extremely short chunks
    if len(y) < 256:
        # Return fallback zeros
        return get_fallback_features()
        
    try:
        # 1. MFCCs (13 coefficients)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        for i in range(13):
            features[f"mfcc_{i+1}_mean"] = float(np.mean(mfccs[i]))
            features[f"mfcc_{i+1}_std"] = float(np.std(mfccs[i]))
            
        # 2. Spectral Features
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        features["spectral_centroid_mean"] = float(np.mean(centroid))
        features["spectral_centroid_std"] = float(np.std(centroid))
        
        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        features["spectral_bandwidth_mean"] = float(np.mean(bandwidth))
        features["spectral_bandwidth_std"] = float(np.std(bandwidth))
        
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        features["spectral_rolloff_mean"] = float(np.mean(rolloff))
        features["spectral_rolloff_std"] = float(np.std(rolloff))
        
        zcr = librosa.feature.zero_crossing_rate(y=y)
        features["zero_crossing_rate_mean"] = float(np.mean(zcr))
        features["zero_crossing_rate_std"] = float(np.std(zcr))
        
        # 3. Pitch (F0) tracking - Autocorrelation-based fast pitch tracker
        try:
            frames = librosa.util.frame(y, frame_length=512, hop_length=256)
            pitches = []
            for i in range(frames.shape[1]):
                frame = frames[:, i]
                frame = frame - np.mean(frame)
                if np.max(np.abs(frame)) < 0.01:
                    continue
                corr = np.correlate(frame, frame, mode='full')
                corr = corr[len(corr)//2:]
                d = np.diff(corr)
                peak_idx = -1
                for j in range(1, len(d)-1):
                    if d[j] > 0 and d[j+1] < 0: # peak detected
                        lag = j + 1
                        freq = sr / lag
                        if 80.0 <= freq <= 400.0:
                            peak_idx = lag
                            break
                if peak_idx > 0:
                    pitches.append(sr / peak_idx)
            
            f0_valid = np.array(pitches)
            if len(f0_valid) > 0:
                features["pitch_mean"] = float(np.mean(f0_valid))
                features["pitch_std"] = float(np.std(f0_valid))
            else:
                features["pitch_mean"] = 120.0
                features["pitch_std"] = 10.0
        except Exception:
            f0_valid = np.array([])
            features["pitch_mean"] = 120.0
            features["pitch_std"] = 10.0
            
        # 4. Jitter and Shimmer estimates
        # Jitter: cycle-to-cycle variation in pitch
        if len(f0_valid) > 1:
            diffs = np.abs(np.diff(f0_valid))
            jitter = np.mean(diffs) / np.mean(f0_valid) if np.mean(f0_valid) > 0 else 0
            features["jitter"] = float(jitter)
        else:
            features["jitter"] = 0.005 # Standard background jitter
            
        # Shimmer: cycle-to-cycle variation in amplitude peaks
        # Segment audio into pitch-period-like frames to analyze peak amplitudes
        frames = librosa.util.frame(y, frame_length=512, hop_length=256)
        peaks = np.max(np.abs(frames), axis=0)
        peaks_valid = peaks[peaks > 0.01] # Filter noise peaks
        if len(peaks_valid) > 1:
            amp_diffs = np.abs(np.diff(peaks_valid))
            shimmer = np.mean(amp_diffs) / np.mean(peaks_valid)
            features["shimmer"] = float(shimmer)
        else:
            features["shimmer"] = 0.02
            
    except Exception as e:
        print(f"[FeatureExtractor] Feature extraction error: {e}. Falling back to default baseline values.")
        return get_fallback_features()
        
    return features

def get_fallback_features() -> Dict[str, Any]:
    """Returns baseline features when feature extraction fails or audio is silent."""
    features = {}
    for i in range(1, 14):
        features[f"mfcc_{i}_mean"] = 0.0
        features[f"mfcc_{i}_std"] = 1.0
    features["spectral_centroid_mean"] = 1500.0
    features["spectral_centroid_std"] = 200.0
    features["spectral_bandwidth_mean"] = 1500.0
    features["spectral_bandwidth_std"] = 200.0
    features["spectral_rolloff_mean"] = 3000.0
    features["spectral_rolloff_std"] = 400.0
    features["zero_crossing_rate_mean"] = 0.05
    features["zero_crossing_rate_std"] = 0.01
    features["pitch_mean"] = 120.0
    features["pitch_std"] = 10.0
    features["jitter"] = 0.005
    features["shimmer"] = 0.02
    return features

def convert_features_to_vector(features: Dict[str, Any]) -> np.ndarray:
    """Converts the structured feature dictionary into a flat numerical vector for inference."""
    keys = sorted(list(features.keys()))
    return np.array([features[k] for k in keys], dtype=np.float32)
