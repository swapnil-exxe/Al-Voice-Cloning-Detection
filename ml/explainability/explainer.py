from typing import Dict, Any, List

# Standard human baseline limits
HUMAN_BASELINE = {
    "pitch_std_min": 5.0,        # Natural speech has inflections
    "zcr_mean_max": 0.08,        # Synthetic voices contain high-frequency vocoder hiss
    "spectral_rolloff_max": 3800.0,
    "mfcc_std_min": 1.5          # Human voices have spectral dynamism
}

def generate_explanation(features: Dict[str, Any], risk_score: int) -> Dict[str, Any]:
    """
    Examines extracted features to provide evidence-based, explainable AI (XAI) logs.
    Identifies acoustic anomalies compared to expected human ranges.
    """
    evidence: List[str] = []
    explanations: List[str] = []
    
    # 1. Pitch Variance (Prosody)
    pitch_std = features.get("pitch_std", features.get("pitch_std", 10.0))
    # In extractor.py, the key is "pitch_std". Let's check both
    pitch_std_val = features.get("pitch_std", 10.0)
    
    if pitch_std_val < HUMAN_BASELINE["pitch_std_min"]:
        evidence.append("prosody_irregularity")
        explanations.append(
            f"Abnormal prosody: Pitch variation is extremely low ({pitch_std_val:.2f} Hz), "
            "indicating a robotic, flat monotone characteristic of neural speech models."
        )
        
    # 2. High Frequency Noise / Zero Crossing Rate
    zcr_mean = features.get("zero_crossing_rate_mean", 0.04)
    if zcr_mean > HUMAN_BASELINE["zcr_mean_max"]:
        evidence.append("spectral_anomaly")
        explanations.append(
            f"Zero-crossing rate spike ({zcr_mean:.3f}): Signifies high-frequency energy "
            "often injected during vocoder audio generation phases."
        )
        
    # 3. Spectral Rolloff (high frequency cut-off)
    rolloff_mean = features.get("spectral_rolloff_mean", 2500.0)
    if rolloff_mean > HUMAN_BASELINE["spectral_rolloff_max"]:
        evidence.append("neural_synthesis_artifact")
        explanations.append(
            f"Spectral roll-off anomaly ({rolloff_mean:.1f} Hz): Excessive high-frequency energy "
            "suggests neural voice synthesis artifacts rather than natural human articulation."
        )
        
    # 4. Dynamic Range check (MFCC standard deviations)
    # Check average of MFCC stds
    mfcc_stds = [features[k] for k in features if k.startswith("mfcc_") and k.endswith("_std")]
    if mfcc_stds:
        avg_mfcc_std = sum(mfcc_stds) / len(mfcc_stds)
        if avg_mfcc_std < HUMAN_BASELINE["mfcc_std_min"]:
            evidence.append("abnormal_phase_characteristics")
            explanations.append(
                f"Low spectral variance ({avg_mfcc_std:.2f}): Voice lacks natural cepstral dynamic range, "
                "which is characteristic of highly smoothed synthetic generation."
            )
            
    # If risk is high but no specific rules fired, add a general warning
    if risk_score >= 61 and not evidence:
        evidence.append("model_anomaly_flag")
        explanations.append("The classifier flagged the voice profile based on non-linear cepstral feature distributions.")
        
    # Default message if low risk
    if risk_score < 31:
        report = "Voice analysis is within normal parameters. Pitch variations, spectral features, and phase characteristics align with natural human speech profiles."
    else:
        report = " | ".join(explanations)
        
    return {
        "evidence": evidence if risk_score >= 31 else [],
        "explainability_report": report
    }
