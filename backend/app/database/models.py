import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .connection import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="USER", nullable=False) # USER, ANALYST, ADMIN
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sessions = relationship("AnalysisSession", back_populates="user")
    speaker_profiles = relationship("SpeakerProfile", back_populates="user")
    resolved_alerts = relationship("Alert", back_populates="resolver", foreign_keys="[Alert.resolved_by]")


class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    type = Column(String(50), nullable=False) # LIVE, SIMULATED, UPLOAD
    file_name = Column(String(255), nullable=True)
    duration = Column(Float, default=0.0)
    final_risk_score = Column(Integer, default=0)
    final_ai_probability = Column(Float, default=0.0)
    detected_language = Column(String(10), default="en")
    language_confidence = Column(Float, default=0.0)
    speaker_similarity = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=False, default="voiceguard-v1.0")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    retention_until = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="sessions")
    audio_metadata = relationship("AudioMetadata", back_populates="session", uselist=False, cascade="all, delete-orphan")
    risk_events = relationship("RiskEvent", back_populates="session", cascade="all, delete-orphan")
    result = relationship("AnalysisResult", back_populates="session", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")


class AudioMetadata(Base):
    __tablename__ = "audio_metadata"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("analysis_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    sample_rate = Column(Integer, default=16000)
    channels = Column(Integer, default=1)
    format = Column(String(50), default="wav")
    file_size = Column(Integer, default=0)
    storage_path = Column(String(555), nullable=True)
    consent_given = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AnalysisSession", back_populates="audio_metadata")


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("analysis_sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp_offset = Column(Float, nullable=False) # seconds since start
    risk_score = Column(Integer, nullable=False)
    ai_probability = Column(Float, nullable=False)
    context_matched = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AnalysisSession", back_populates="risk_events")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("analysis_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    features_json = Column(Text, nullable=False) # JSON list/dict of features
    evidence_json = Column(Text, nullable=False) # JSON list of signs e.g., ["spectral_anomaly"]
    explainability_report = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AnalysisSession", back_populates="result")


class SpeakerProfile(Base):
    __tablename__ = "speaker_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    embedding_json = Column(Text, nullable=False) # JSON list representing speaker centroid
    reference_audio_path = Column(String(555), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="speaker_profiles")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("analysis_sessions.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(50), nullable=False) # MEDIUM, HIGH, CRITICAL
    message = Column(Text, nullable=False)
    status = Column(String(50), default="UNRESOLVED", nullable=False) # UNRESOLVED, INVESTIGATING, RESOLVED
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AnalysisSession", back_populates="alerts")
    resolver = relationship("User", back_populates="resolved_alerts", foreign_keys=[resolved_by])


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    version = Column(String(50), unique=True, nullable=False)
    dataset_info = Column(Text, nullable=True)
    accuracy = Column(Float, default=0.0)
    eer = Column(Float, default=0.0)
    feature_config_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    risk_threshold_medium = Column(Integer, default=31, nullable=False)
    risk_threshold_high = Column(Integer, default=61, nullable=False)
    risk_threshold_critical = Column(Integer, default=81, nullable=False)
    audio_retention_days = Column(Integer, default=7, nullable=False)
    allow_anonymous_analysis = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
