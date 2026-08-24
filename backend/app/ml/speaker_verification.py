import numpy as np
import json
from typing import List

def extract_speaker_embedding(features: dict) -> List[float]:
    """
    Extracts a speaker embedding vector from acoustic features.
    Uses the 13 MFCC means as the representation of speaker vocal tract shape.
    """
    embedding = []
    for i in range(1, 14):
        embedding.append(features.get(f"mfcc_{i}_mean", 0.0))
    return embedding

def verify_speaker(live_embedding: List[float], reference_embedding_json: str) -> float:
    """
    Compares live embedding vs a reference speaker embedding using Cosine Similarity.
    Returns similarity score (0.0 to 1.0).
    """
    try:
        ref_vec = np.array(json.loads(reference_embedding_json), dtype=np.float32)
        live_vec = np.array(live_embedding, dtype=np.float32)
        
        # Check matching dimension
        if ref_vec.shape != live_vec.shape:
            return 0.0
            
        dot_product = np.dot(ref_vec, live_vec)
        norm_ref = np.linalg.norm(ref_vec)
        norm_live = np.linalg.norm(live_vec)
        
        if norm_ref == 0 or norm_live == 0:
            return 0.0
            
        cosine_sim = dot_product / (norm_ref * norm_live)
        # Normalize from [-1, 1] to [0, 1]
        similarity = float((cosine_sim + 1.0) / 2.0)
        return similarity
    except Exception as e:
        print(f"[SpeakerVerification] Comparison error: {e}")
        return 0.0
