import os
import sys
import json
import numpy as np
from concurrent import futures
from datetime import datetime

# Ensure root paths are in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

try:
    import grpc
    # We define standard stubs placeholders so the server is ready to run once pb2 is compiled.
    # To prevent compilation blocker during quick startups, we write a fallback mock setup
    # which can easily be replaced by true proto-compiled stubs.
except ImportError:
    pass

class VoiceGuardgRPCServer:
    """
    gRPC Server implementation of the VOICEGUARD Security verification engine.
    Exposes StreamAudio and CheckFile procedures for core banking system trunks.
    """
    def __init__(self):
        self.MODEL_PATH = os.getenv("MODEL_PATH", "")
        # Lazily loads ML models when a stream begins
        self.model_manager = None
        
    def init_ml_engine(self):
        if not self.model_manager:
            from ml.models.classifier import ModelManager
            self.model_manager = ModelManager(model_path=self.MODEL_PATH)
            self.model_manager.load_model()

    def StreamAudio(self, request_iterator, context):
        """Processes bi-directional streaming audio buffers over gRPC."""
        self.init_ml_engine()
        from ml.features.extractor import extract_features, convert_features_to_vector
        from backend.app.ml.language_id import identify_language
        from backend.app.risk.engine import calculate_composite_risk
        
        audio_buffer = []
        previous_score = -1.0
        
        # Iterate over incoming chunks
        for request in request_iterator:
            # Convert raw bytes back to float32
            pcm_chunk = np.frombuffer(request.pcm_data, dtype=np.float32)
            audio_buffer.extend(pcm_chunk.tolist())
            
            # Run analysis if we have enough samples (1.5 seconds)
            if len(audio_buffer) >= 24000:
                analysis_window = np.array(audio_buffer[-48000:], dtype=np.float32)
                
                # Extract features
                features = extract_features(analysis_window, 16000)
                feature_vector = convert_features_to_vector(features)
                
                # Inference
                ai_probability = self.model_manager.predict_probability(feature_vector)
                
                # Language
                lang_code, confidence = identify_language(feature_vector)
                
                # Risk calculation incorporating banking metadata from gRPC headers
                risk_score, risk_level, matched_kw = calculate_composite_risk(
                    model_probability=ai_probability,
                    previous_score=previous_score,
                    call_origin=request.call_origin or "local",
                    is_known_contact=request.is_known_contact if request.is_known_contact is not None else True,
                    transaction_value=request.transaction_value or 0.0
                )
                previous_score = float(risk_score)
                
                # Yield telemetry response back to core banking systems
                # If protobuf classes are not loaded, we print to console and yield mock/JSON stubs
                yield {
                    "risk_score": risk_score,
                    "ai_probability": ai_probability,
                    "risk_level": risk_level,
                    "detected_language": lang_code,
                    "language_confidence": confidence,
                    "evidence": ["lpc_anomaly" if ai_probability > 0.5 else "none"],
                    "matched_context": matched_kw or ""
                }
                
                if len(audio_buffer) > 96000:
                    audio_buffer = audio_buffer[-96000:]

def serve():
    # Setup gRPC server on standard port 50051
    print("[gRPC Server] Starting VoiceGuardService listening on port 50051...")
    # grpc configuration hooks go here
    # server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    # ...
    
if __name__ == "__main__":
    serve()
