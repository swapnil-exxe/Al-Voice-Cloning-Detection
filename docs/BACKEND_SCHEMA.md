# Backend Database Schema

This schema is designed to support both PostgreSQL (production) and SQLite (development/local running) via SQLAlchemy.

---

## 1. Table Definitions

### 1.1 `users`
Tracks system operators, analysts, and administrators.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `email`: VARCHAR(255) (Unique, Index)
- `hashed_password`: VARCHAR(255)
- `role`: VARCHAR(50) (Constraint: 'USER', 'ANALYST', 'ADMIN')
- `created_at`: TIMESTAMP

### 1.2 `analysis_sessions`
Stores metadata for each individual analysis (live stream or upload).
- `id`: VARCHAR(36) / UUID (Primary Key)
- `user_id`: VARCHAR(36) (Foreign Key -> `users.id`, Nullable for guest runs)
- `type`: VARCHAR(50) (Constraint: 'LIVE', 'SIMULATED', 'UPLOAD')
- `file_name`: VARCHAR(255) (Nullable)
- `duration`: FLOAT
- `final_risk_score`: INTEGER
- `final_ai_probability`: FLOAT
- `detected_language`: VARCHAR(10)
- `language_confidence`: FLOAT
- `speaker_similarity`: FLOAT (Nullable)
- `model_version`: VARCHAR(50)
- `created_at`: TIMESTAMP
- `retention_until`: TIMESTAMP (Privacy control, audio deleted beyond this date)
- `is_deleted`: BOOLEAN (Default: False)

### 1.3 `audio_metadata`
Stores low-level audio attributes, ensuring privacy policies are strictly applied.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `session_id`: VARCHAR(36) (Foreign Key -> `analysis_sessions.id` ON DELETE CASCADE)
- `sample_rate`: INTEGER
- `channels`: INTEGER
- `format`: VARCHAR(50)
- `file_size`: INTEGER
- `storage_path`: VARCHAR(555) (Nullable, empty if privacy retention deleted it)
- `consent_given`: BOOLEAN (Default: False)
- `created_at`: TIMESTAMP

### 1.4 `risk_events`
Time-series log of calculated probabilities during WebSocket sessions. Used to render charts.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `session_id`: VARCHAR(36) (Foreign Key -> `analysis_sessions.id` ON DELETE CASCADE, Index)
- `timestamp_offset`: FLOAT (Seconds from start)
- `risk_score`: INTEGER
- `ai_probability`: FLOAT
- `context_matched`: VARCHAR(255) (Nullable)
- `created_at`: TIMESTAMP

### 1.5 `analysis_results`
Detailed evaluation and explainability parameters.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `session_id`: VARCHAR(36) (Foreign Key -> `analysis_sessions.id` ON DELETE CASCADE)
- `features_json`: TEXT (JSON serialized extracted features)
- `evidence_json`: TEXT (JSON serialized indicators list)
- `explainability_report`: TEXT (Human readable XAI summary)
- `created_at`: TIMESTAMP

### 1.6 `speaker_profiles`
Known speaker profiles for identity similarity comparisons.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `user_id`: VARCHAR(36) (Foreign Key -> `users.id`)
- `name`: VARCHAR(255)
- `embedding_json`: TEXT (JSON serialized MFCC/pitch stats)
- `reference_audio_path`: VARCHAR(555)
- `created_at`: TIMESTAMP

### 1.7 `alerts`
Security incident tracking entries.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `session_id`: VARCHAR(36) (Foreign Key -> `analysis_sessions.id` ON DELETE CASCADE)
- `severity`: VARCHAR(50) (Constraint: 'MEDIUM', 'HIGH', 'CRITICAL')
- `message`: TEXT
- `status`: VARCHAR(50) (Constraint: 'UNRESOLVED', 'INVESTIGATING', 'RESOLVED')
- `resolved_by`: VARCHAR(36) (Foreign Key -> `users.id`, Nullable)
- `resolved_at`: TIMESTAMP (Nullable)
- `created_at`: TIMESTAMP

### 1.8 `model_versions`
Repository of models and their associated classification stats.
- `id`: VARCHAR(36) / UUID (Primary Key)
- `name`: VARCHAR(100)
- `version`: VARCHAR(50) (Unique)
- `dataset_info`: TEXT
- `accuracy`: FLOAT
- `eer`: FLOAT
- `feature_config_json`: TEXT
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP

### 1.9 `system_settings`
Global properties configurable by the Administrator.
- `id`: INTEGER (Primary Key)
- `risk_threshold_medium`: INTEGER (Default: 31)
- `risk_threshold_high`: INTEGER (Default: 61)
- `risk_threshold_critical`: INTEGER (Default: 81)
- `audio_retention_days`: INTEGER (Default: 7)
- `allow_anonymous_analysis`: BOOLEAN (Default: True)
