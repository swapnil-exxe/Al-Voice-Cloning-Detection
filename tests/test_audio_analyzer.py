import pytest
import numpy as np
from ml.features.analyzer import calculate_signal_to_noise_ratio, analyze_audio_quality

def test_empty_audio_quality():
    empty_audio = np.array([], dtype=np.float32)
    metrics = analyze_audio_quality(empty_audio)
    assert metrics["duration_sec"] == 0.0
    assert metrics["snr_db"] == 0.0

def test_sine_audio_snr_and_metrics():
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    sine = (0.8 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    metrics = analyze_audio_quality(sine, sr=16000)
    assert metrics["duration_sec"] == 1.0
    assert np.isclose(metrics["peak_amplitude"], 0.8)
    assert metrics["clipping_ratio"] == 0.0
    assert metrics["snr_db"] > 0.0
