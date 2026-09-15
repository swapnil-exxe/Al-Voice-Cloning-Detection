import pytest
import numpy as np
from ml.preprocessing.framing import frame_audio_signal

def test_frame_audio_signal_dimensions():
    # 1 second of 16kHz audio = 16000 samples
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    sine = np.sin(2 * np.pi * 440 * t).astype(np.float32)

    frame_length = 512
    hop_length = 256
    frames = frame_audio_signal(sine, frame_length=frame_length, hop_length=hop_length)

    expected_frames = 1 + int((16000 - 512) / 256)
    assert frames.shape == (expected_frames, 512)
    assert isinstance(frames, np.ndarray)

def test_short_audio_padding():
    short_signal = np.array([0.5, -0.5, 0.2], dtype=np.float32)
    frames = frame_audio_signal(short_signal, frame_length=512, hop_length=256)

    assert frames.shape == (1, 512)
