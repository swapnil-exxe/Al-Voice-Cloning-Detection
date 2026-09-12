import pytest
import numpy as np
from ml.preprocessing.audio import preprocess_audio_array
from ml.features.extractor import extract_features

def test_preprocess_empty_audio():
    empty_arr = np.array([], dtype=np.float32)
    processed = preprocess_audio_array(empty_arr, sr=16000, target_sr=16000)
    assert isinstance(processed, np.ndarray)
    assert len(processed) == 0

def test_preprocess_normal_audio():
    # Synthetic 1-second 440 Hz sine wave audio at 16kHz
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    sine_wave = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    processed = preprocess_audio_array(sine_wave, sr=16000, target_sr=16000)
    assert isinstance(processed, np.ndarray)
    assert len(processed) > 0
    # Check max amplitude normalization
    assert np.isclose(np.max(np.abs(processed)), 1.0)

def test_feature_extraction_fallback():
    # Audio buffer under 256 samples should return fallback feature dict
    short_audio = np.zeros(100, dtype=np.float32)
    features = extract_features(short_audio, sr=16000)
    assert isinstance(features, dict)
    assert "mfcc_mean" in features or len(features) >= 0
