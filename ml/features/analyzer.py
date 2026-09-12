import numpy as np

def calculate_signal_to_noise_ratio(audio: np.ndarray) -> float:
    """Calculates estimated Signal-to-Noise Ratio (SNR) in dB."""
    if len(audio) == 0:
        return 0.0

    signal_power = np.mean(audio ** 2)
    if signal_power == 0:
        return 0.0

    # Estimate noise floor from lowest 10% magnitude frames
    sorted_abs = np.sort(np.abs(audio))
    noise_sample_size = max(1, int(len(audio) * 0.1))
    noise_power = np.mean(sorted_abs[:noise_sample_size] ** 2)

    if noise_power == 0:
        return 100.0  # Max synthetic cleanliness

    snr_db = 10 * np.log10(signal_power / noise_power)
    return float(snr_db)

def analyze_audio_quality(audio: np.ndarray, sr: int = 16000) -> dict:
    """
    Analyzes audio buffer quality metrics including peak amplitude, 
    clipping percentage, and estimated SNR.
    """
    if len(audio) == 0:
        return {
            "duration_sec": 0.0,
            "peak_amplitude": 0.0,
            "clipping_ratio": 0.0,
            "snr_db": 0.0
        }

    duration = float(len(audio) / sr)
    peak = float(np.max(np.abs(audio)))
    clipping_count = np.sum(np.abs(audio) >= 0.99)
    clipping_ratio = float(clipping_count / len(audio))
    snr = calculate_signal_to_noise_ratio(audio)

    return {
        "duration_sec": duration,
        "peak_amplitude": peak,
        "clipping_ratio": clipping_ratio,
        "snr_db": snr
    }
