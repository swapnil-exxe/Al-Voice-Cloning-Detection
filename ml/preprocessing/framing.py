import numpy as np

def frame_audio_signal(
    signal: np.ndarray, 
    frame_length: int = 512, 
    hop_length: int = 256, 
    window_type: str = "hanning"
) -> np.ndarray:
    """
    Slices continuous 1D audio signal into overlapping windowed frames.
    Useful for STFT spectrogram generation and deep neural network feature tensors.
    """
    signal = np.asarray(signal, dtype=np.float32)
    signal_len = len(signal)

    if signal_len < frame_length:
        # Pad short signal with zeros to fit one frame
        pad_len = frame_length - signal_len
        signal = np.pad(signal, (0, pad_len), mode="constant")
        signal_len = frame_length

    # Calculate total frames
    n_frames = 1 + int((signal_len - frame_length) / hop_length)
    
    # Generate windowing function
    if window_type == "hanning":
        window = np.hanning(frame_length)
    elif window_type == "hamming":
        window = np.hamming(frame_length)
    else:
        window = np.ones(frame_length, dtype=np.float32)

    frames = np.zeros((n_frames, frame_length), dtype=np.float32)

    for i in range(n_frames):
        start = i * hop_length
        end = start + frame_length
        frames[i] = signal[start:end] * window

    return frames
