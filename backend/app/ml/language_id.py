import os
import pickle
import numpy as np
from typing import Dict, Any, Tuple

# Mapping of languages
LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "kn": "Kannada",
    "ml": "Malayalam",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ur": "Urdu"
}
LANG_CODES = ["en", "hi", "mr", "ta", "te", "bn", "kn", "ml", "gu", "pa", "ur"]

# Load the trained Language ID model
lid_model = None
lid_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/models/saved_models/voiceguard_lid.pkl"))
if os.path.exists(lid_model_path):
    try:
        with open(lid_model_path, "rb") as f:
            lid_model = pickle.load(f)
        print(f"[LanguageID] Loaded multi-class LID model from {lid_model_path}")
    except Exception as e:
        print(f"[LanguageID] Error loading LID model: {e}")

def identify_language(feature_vector: np.ndarray, duration: float = 3.0) -> Tuple[str, float]:
    """
    Identifies the spoken language using the trained multi-class Language ID model.
    Includes VAD checks and confidence thresholds.
    """
    # Ensure correct shape: (1, 38)
    if len(feature_vector.shape) == 1:
        feature_vector = np.expand_dims(feature_vector, axis=0)
        
    # If the duration of speech accumulated is short, do not guess
    if duration < 2.0:
        return "Detecting...", 0.0
        
    if lid_model:
        try:
            probs = lid_model.predict_proba(feature_vector)[0]
            max_idx = np.argmax(probs)
            max_prob = float(probs[max_idx])
            
            # Calibration uncertainty checks
            if max_prob < 0.35:
                return "Uncertain", max_prob
                
            return LANG_CODES[max_idx], max_prob
        except Exception as e:
            print(f"[LanguageID] Inference error: {e}")
            
    # Default fallback
    return "hi", 0.50
