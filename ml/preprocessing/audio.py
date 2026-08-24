import numpy as np
import librosa

def load_and_preprocess_file(file_path: str, target_sr: int = 16000) -> np.ndarray:
    """Loads an audio file, resamples to target_sr, converts to mono, and normalizes."""
    # librosa.load resamples and converts to mono automatically if sr is specified
    y, sr = librosa.load(file_path, sr=target_sr, mono=True)
    return preprocess_audio_array(y, sr, target_sr)

def preprocess_audio_array(y: np.ndarray, sr: int, target_sr: int = 16000) -> np.ndarray:
    """Standardizes sampling rate, converts to float32, and normalizes audio array."""
    # Ensure float32
    y = y.astype(np.float32)
    
    # Resample if needed
    if sr != target_sr:
        y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
        
    # Remove silence (trim leading/trailing silence)
    y_trimmed, _ = librosa.effects.trim(y, top_db=25)
    
    # Check if empty after trim
    if len(y_trimmed) == 0:
        y_trimmed = y # Keep original if silent
        
    # Max-normalization to prevent amplitude attacks/biases
    max_val = np.max(np.abs(y_trimmed))
    if max_val > 0:
        y_normalized = y_trimmed / max_val
    else:
        y_normalized = y_trimmed
        
    return y_normalized
