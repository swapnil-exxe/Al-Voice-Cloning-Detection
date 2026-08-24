import bcrypt
from sqlalchemy.orm import Session
from .connection import engine, Base
from .models import User, SystemSetting, ModelVersion

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def init_db(db: Session):
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("[Database] Tables verified/created successfully.")

    # Seed system settings if empty
    settings = db.query(SystemSetting).first()
    if not settings:
        new_settings = SystemSetting(
            risk_threshold_medium=31,
            risk_threshold_high=61,
            risk_threshold_critical=81,
            audio_retention_days=7,
            allow_anonymous_analysis=True
        )
        db.add(new_settings)
        db.commit()
        print("[Database] System settings seeded.")

    # Seed model versions if empty
    model = db.query(ModelVersion).filter(ModelVersion.version == "voiceguard-v1.0").first()
    if not model:
        new_model = ModelVersion(
            name="VoiceGuard Baseline Classifier",
            version="voiceguard-v1.0",
            dataset_info="Trained on ASVspoof and custom Indian speech samples.",
            accuracy=0.942,
            eer=0.058,
            feature_config_json='{"mfcc": 13, "spectral": ["centroid", "bandwidth", "rolloff", "zcr"], "pitch": true, "temporal": ["jitter", "shimmer"]}',
            is_active=True
        )
        db.add(new_model)
        db.commit()
        print("[Database] Model version voiceguard-v1.0 seeded.")

    # Seed default admin user if empty
    admin = db.query(User).filter(User.email == "admin@voiceguard.sec").first()
    if not admin:
        hashed_pw = get_password_hash("adminpassword123")
        new_admin = User(
            email="admin@voiceguard.sec",
            hashed_password=hashed_pw,
            role="ADMIN"
        )
        db.add(new_admin)
        db.commit()
        print("[Database] Default admin user seeded (admin@voiceguard.sec / adminpassword123).")
