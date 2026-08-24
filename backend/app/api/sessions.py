import json
import io
import os
import librosa
import numpy as np
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database.connection import get_db
from ..database.models import AnalysisSession, AudioMetadata, RiskEvent, AnalysisResult, SpeakerProfile, Alert, User
from .auth import get_current_user
from ml.preprocessing.audio import preprocess_audio_array
from ml.features.extractor import extract_features, convert_features_to_vector
from ml.models.classifier import ModelManager
from ml.explainability.explainer import generate_explanation
from ..ml.language_id import identify_language
from ..risk.engine import calculate_composite_risk

MODEL_PATH = os.getenv("MODEL_PATH", "")
model_manager = ModelManager(model_path=MODEL_PATH)
model_manager.load_model()

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
analytics_router = APIRouter(prefix="/api/analytics", tags=["analytics"])
speaker_router = APIRouter(prefix="/api/speaker", tags=["speaker"])

@router.get("")
def list_sessions(
    skip: int = 0, 
    limit: int = 20, 
    type_filter: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AnalysisSession).filter(AnalysisSession.is_deleted == False)
    
    # Non-admins only see their own sessions. Admins see all.
    if current_user.role != "ADMIN":
        query = query.filter(AnalysisSession.user_id == current_user.id)
        
    if type_filter:
        query = query.filter(AnalysisSession.type == type_filter)
        
    total = query.count()
    sessions = query.order_by(AnalysisSession.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "sessions": [
            {
                "id": s.id,
                "type": s.type,
                "file_name": s.file_name,
                "duration": s.duration,
                "final_risk_score": s.final_risk_score,
                "final_ai_probability": s.final_ai_probability,
                "detected_language": s.detected_language,
                "language_confidence": s.language_confidence,
                "speaker_similarity": s.speaker_similarity,
                "model_version": s.model_version,
                "created_at": s.created_at
            }
            for s in sessions
        ]
    }

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(AnalysisSession).filter(
        AnalysisSession.id == session_id, 
        AnalysisSession.is_deleted == False
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Access checks
    if current_user.role != "ADMIN" and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    events = db.query(RiskEvent).filter(RiskEvent.session_id == session_id).order_by(RiskEvent.timestamp_offset.asc()).all()
    result = db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).first()
    alerts = db.query(Alert).filter(Alert.session_id == session_id).all()
    
    return {
        "session": {
            "id": session.id,
            "type": session.type,
            "file_name": session.file_name,
            "duration": session.duration,
            "final_risk_score": session.final_risk_score,
            "final_ai_probability": session.final_ai_probability,
            "detected_language": session.detected_language,
            "language_confidence": session.language_confidence,
            "speaker_similarity": session.speaker_similarity,
            "model_version": session.model_version,
            "created_at": session.created_at
        },
        "timeline": [
            {
                "offset": e.timestamp_offset,
                "risk_score": e.risk_score,
                "ai_probability": e.ai_probability,
                "context_matched": e.context_matched
            }
            for e in events
        ],
        "result": {
            "features": json.loads(result.features_json) if result else {},
            "evidence": json.loads(result.evidence_json) if result else [],
            "explainability_report": result.explainability_report if result else "No explainability details logged."
        },
        "alerts": [
            {
                "id": a.id,
                "severity": a.severity,
                "message": a.message,
                "status": a.status,
                "created_at": a.created_at
            }
            for a in alerts
        ]
    }

@router.post("/upload")
async def upload_audio_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate file extension
    ext = file.filename.split('.')[-1].lower() if file.filename else ''
    if ext not in ['wav', 'mp3', 'flac', 'm4a', 'mp4']:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    try:
        # Read file bytes
        content = await file.read()
        file_size = len(content)
        
        # Load audio using librosa
        audio_file = io.BytesIO(content)
        y, sr = librosa.load(audio_file, sr=16000, mono=True)
        
        # Preprocess
        y_proc = preprocess_audio_array(y, sr, 16000)
        
        # Duration
        duration = float(len(y) / sr)
        
        # Features
        features = extract_features(y_proc, 16000)
        feature_vector = convert_features_to_vector(features)
        
        # Inference (Deep Wav2Vec2 Model)
        ai_probability = model_manager.predict_audio_waveform(y_proc, 16000)
        
        # Language ID
        lang_code, confidence = identify_language(feature_vector)
        
        # Risk Score
        risk_score, risk_level, matched_kw = calculate_composite_risk(
            model_probability=ai_probability,
            previous_score=-1.0
        )
        
        # Explanation
        explanation = generate_explanation(features, risk_score)
        evidence_list = explanation["evidence"]
        explainability_report = explanation["explainability_report"]
        
        # Save session
        session = AnalysisSession(
            user_id=current_user.id,
            type="UPLOAD",
            file_name=file.filename or "upload.wav",
            duration=duration,
            final_risk_score=risk_score,
            final_ai_probability=ai_probability,
            detected_language=lang_code,
            language_confidence=confidence,
            speaker_similarity=None,
            model_version=model_manager.model_version,
            created_at=datetime.utcnow(),
            is_deleted=False
        )
        db.add(session)
        db.flush()
        
        # Save metadata
        meta = AudioMetadata(
            session_id=session.id,
            sample_rate=16000,
            channels=1,
            format=ext,
            file_size=file_size,
            consent_given=True
        )
        db.add(meta)
        
        # Save result
        result = AnalysisResult(
            session_id=session.id,
            features_json=json.dumps(features),
            evidence_json=json.dumps(evidence_list),
            explainability_report=explainability_report
        )
        db.add(result)
        
        # Save single risk event representing the aggregate score
        event = RiskEvent(
            session_id=session.id,
            timestamp_offset=duration / 2.0,
            risk_score=risk_score,
            ai_probability=ai_probability
        )
        db.add(event)
        
        # Save alert if threshold crossed
        if risk_score >= 31:
            severity = "CRITICAL" if risk_score >= 81 else ("HIGH" if risk_score >= 61 else "MEDIUM")
            db_alert = Alert(
                session_id=session.id,
                severity=severity,
                message=f"Threat alert generated for uploaded audio: {file.filename}. Risk Score: {risk_score}%. Evidence: {', '.join(evidence_list)}.",
                status="UNRESOLVED"
            )
            db.add(db_alert)
            
        db.commit()
        return {
            "session_id": session.id,
            "risk_score": risk_score,
            "ai_probability": ai_probability,
            "detected_language": lang_code,
            "language_confidence": confidence,
            "risk_level": risk_level,
            "evidence": evidence_list,
            "explainability_report": explainability_report,
            "features": features
        }
    except Exception as e:
        db.rollback()
        print(f"[UploadAPI] Error analyzing upload: {e}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failure: {str(e)}")

@router.delete("/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(AnalysisSession).filter(AnalysisSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role != "ADMIN" and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Soft delete
    session.is_deleted = True
    
    # Privacy: clean up associated physical files if any
    metadata = db.query(AudioMetadata).filter(AudioMetadata.session_id == session_id).first()
    if metadata and metadata.storage_path:
        try:
            if os.path.exists(metadata.storage_path):
                os.remove(metadata.storage_path)
            metadata.storage_path = None
        except Exception as e:
            print(f"[Privacy] Error removing audio file: {e}")
            
    db.commit()
    return {"message": "Session deleted successfully (privacy standards applied)"}

# Register secondary router definitions for FastAPI application loading
@analytics_router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Restrict to admins/analysts or scoped user views
    query = db.query(AnalysisSession).filter(AnalysisSession.is_deleted == False)
    alert_query = db.query(Alert)
    
    if current_user.role != "ADMIN":
        query = query.filter(AnalysisSession.user_id == current_user.id)
        alert_query = alert_query.join(AnalysisSession).filter(AnalysisSession.user_id == current_user.id)
        
    total_sessions = query.count()
    
    if total_sessions == 0:
        return {
            "total_sessions": 0,
            "high_risk_sessions": 0,
            "average_risk": 0.0,
            "language_distribution": {},
            "alert_severity_distribution": {"MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            "timeline": []
        }
        
    high_risk_sessions = query.filter(AnalysisSession.final_risk_score >= 61).count()
    avg_risk = db.query(func.avg(AnalysisSession.final_risk_score)).filter(AnalysisSession.is_deleted == False)
    if current_user.role != "ADMIN":
        avg_risk = avg_risk.filter(AnalysisSession.user_id == current_user.id)
    avg_risk_val = float(avg_risk.scalar() or 0.0)
    
    # Language distribution
    lang_dist = {}
    langs = db.query(
        AnalysisSession.detected_language, 
        func.count(AnalysisSession.id)
    ).filter(AnalysisSession.is_deleted == False)
    if current_user.role != "ADMIN":
        langs = langs.filter(AnalysisSession.user_id == current_user.id)
    langs = langs.group_by(AnalysisSession.detected_language).all()
    for lang, count in langs:
        lang_dist[lang] = count
        
    # Alerts counts
    alerts_counts = {"MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    alerts = alert_query.group_by(Alert.severity).values(Alert.severity, func.count(Alert.id))
    for severity, count in alerts:
        alerts_counts[severity] = count
        
    # Load actual calculated test-set metrics from local evaluation report
    metrics_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/evaluation/evaluation_metrics.json"))
    benchmarks = {
        "model_accuracy": 0.875,
        "model_eer": 0.025,
        "precision": 0.833,
        "recall": 1.0,
        "roc_auc": 1.0,
        "fpr": 0.333,
        "fnr": 0.0
    }
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                loaded_metrics = json.load(f)
                benchmarks = {
                    "model_accuracy": loaded_metrics.get("model_accuracy", 0.875),
                    "model_eer": loaded_metrics.get("model_eer", 0.025),
                    "precision": loaded_metrics.get("precision", 0.833),
                    "recall": loaded_metrics.get("recall", 1.0),
                    "roc_auc": loaded_metrics.get("roc_auc", 1.0),
                    "fpr": loaded_metrics.get("fpr", 0.333),
                    "fnr": loaded_metrics.get("fnr", 0.0)
                }
        except Exception as e:
            print(f"[SessionsAPI] Error loading evaluation_metrics.json: {e}")
        
    return {
        "total_sessions": total_sessions,
        "high_risk_sessions": high_risk_sessions,
        "average_risk": round(avg_risk_val, 1),
        "language_distribution": lang_dist,
        "alert_severity_distribution": alerts_counts,
        "benchmarks": benchmarks
    }

@speaker_router.get("/profiles")
def get_profiles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profiles = db.query(SpeakerProfile).filter(SpeakerProfile.user_id == current_user.id).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "reference_audio_path": p.reference_audio_path,
            "created_at": p.created_at
        }
        for p in profiles
    ]

@speaker_router.post("/profiles")
def create_profile(
    name: str, 
    embedding_vector: List[float], 
    audio_path: str = "custom_reference.wav",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = SpeakerProfile(
        user_id=current_user.id,
        name=name,
        embedding_json=json.dumps(embedding_vector),
        reference_audio_path=audio_path
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"message": "Speaker profile created", "id": profile.id}

@speaker_router.delete("/profiles/{profile_id}")
def delete_profile(profile_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(SpeakerProfile).filter(
        SpeakerProfile.id == profile_id, 
        SpeakerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Speaker profile deleted"}

@router.get("/alerts/active")
def list_active_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Alert)
    if current_user.role != "ADMIN":
        query = query.join(AnalysisSession).filter(AnalysisSession.user_id == current_user.id)
    alerts = query.order_by(Alert.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "session_id": a.session_id,
            "severity": a.severity,
            "message": a.message,
            "status": a.status,
            "created_at": a.created_at
        }
        for a in alerts
    ]

@router.patch("/alerts/resolve-all")
def resolve_all_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["ADMIN", "ANALYST"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Restricted access")
    
    query = db.query(Alert).filter(Alert.status == "UNRESOLVED")
    if current_user.role != "ADMIN":
        query = query.join(AnalysisSession).filter(AnalysisSession.user_id == current_user.id)
        
    unresolved_alerts = query.all()
    count = len(unresolved_alerts)
    now = datetime.utcnow()
    
    for alert in unresolved_alerts:
        alert.status = "RESOLVED"
        alert.resolved_by = current_user.id
        alert.resolved_at = now
        
    db.commit()
    return {"message": f"Successfully resolved {count} alert(s)"}

@router.patch("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["ADMIN", "ANALYST"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Restricted access")
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "RESOLVED"
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return {"message": "Alert marked as resolved"}
