from typing import Dict, Any, List, Tuple

# Severity thresholds (customizable)
RISK_THRESHOLDS = {
    "MEDIUM": 31,
    "HIGH": 61,
    "CRITICAL": 81
}

# Contextual Fraud Keywords and their risk multipliers
CONTEXT_KEYWORDS = {
    "money": 15,
    "lakh": 20,
    "crore": 20,
    "rupees": 15,
    "transfer": 15,
    "payment": 15,
    "otp": 25,
    "password": 25,
    "credential": 20,
    "urgent": 10,
    "immediate": 10,
    "wire": 15,
    "admin": 20,
    "goverment": 15
}

def calculate_composite_risk(
    model_probability: float,
    previous_score: float,
    speaker_similarity: float = None,
    client_transcript: str = None,
    call_origin: str = "local",
    is_known_contact: bool = True,
    historical_fraud: bool = False,
    transaction_value: float = 0.0,
    alpha: float = 0.4
) -> Tuple[int, str, str]:
    """
    Computes a smoothed, contextualized risk score between 0 and 100.
    Integrates:
      - ML model spoof probability
      - Speaker similarity profile anomalies
      - Transcription keyword indicators
      - Enriched metadata (origin, contact credibility, fraud flags, value size)
    Returns: (risk_score, risk_level, context_matched_keyword)
    """
    # 1. Temporal Smoothing (Exponential Moving Average)
    raw_score = model_probability * 100
    smoothed_score = (alpha * raw_score) + ((1 - alpha) * previous_score) if previous_score >= 0 else raw_score
    
    final_score = smoothed_score
    
    # 2. Speaker Similarity Mismatch Penalty
    if speaker_similarity is not None:
        mismatch = 1.0 - speaker_similarity
        if mismatch > 0.2: 
            final_score += (mismatch * 20) # Add up to 20 points
            
    # 3. Contextual Fraud Trigger Keywords
    context_matched = None
    if client_transcript:
        transcript_lower = client_transcript.lower()
        max_penalty = 0
        for kw, penalty in CONTEXT_KEYWORDS.items():
            if kw in transcript_lower:
                if penalty > max_penalty:
                    max_penalty = penalty
                    context_matched = kw
        final_score += max_penalty
        
    # 4. Contextual Metadata Enrichment
    # Origin check (VoIP is high risk for social engineering)
    if call_origin == "international_voip":
        final_score += 10
    elif call_origin == "unknown_voip":
        final_score += 8
        
    # Unknown caller check
    if not is_known_contact:
        final_score += 10
        
    # Historical fraud flag
    if historical_fraud:
        final_score += 15
        
    # High value transaction request check
    if transaction_value > 100000: # Above 1 Lakh INR
        final_score += 15
        
    # Cap score at 100
    final_score = int(min(max(final_score, 0), 100))
    
    # 5. Map to Severity Levels
    if final_score >= RISK_THRESHOLDS["CRITICAL"]:
        level = "CRITICAL"
    elif final_score >= RISK_THRESHOLDS["HIGH"]:
        level = "HIGH"
    elif final_score >= RISK_THRESHOLDS["MEDIUM"]:
        level = "MEDIUM"
    else:
        level = "LOW"
        
    return final_score, level, context_matched
