# VOICEGUARD
### "Real-Time AI Voice Integrity & Impersonation Protection"
**Smart India Hackathon 2026 Prototype**  
**Problem Statement ID:** SIH26104  
**Organization:** All India Council for Technical Education (AICTE)  
**Department:** Cyber Security Cell  

---

## 1. Problem Description
Recent advances in generative AI make high-fidelity voice cloning possible using only a few seconds of source audio. Attackers exploit cloned voices to impersonate executives (CEOs/CXOs), employees, family members, or trusted contacts over phone calls or live audio interfaces to commit financial fraud and corporate theft. 

The objective of SIH26104 is to analyze live/near-live audio to detect synthetic, cloned, or manipulated speech, generating an actionable, explainable impersonation risk score in near-real-time.

---

## 2. Solution Summary
VOICEGUARD is a professional, SOC-grade cybersecurity platform that monitors live speech, simulated calls, and batch uploads. It extracts acoustic and spectral micro-features, runs them through an ensemble classification model (Random Forest + PyTorch MLP), identifies spoken Indian languages, compares voice similarity against a known speaker reference profile, scans text contexts for high-fraud triggers, and outputs real-time alerts.

---

## 3. System Architecture
VOICEGUARD utilizes a modular monorepo structure:
- **Frontend Console**: Vite + React + TypeScript + Tailwind CSS. Provides visual threat status indicators, radial risk gauges, real-time waveform canvasses, and time-series line charts.
- **Backend API Server**: FastAPI (Python) running WebSocket pipelines for low-latency PCM ingestion and JSON telemetry dissemination, along with REST endpoints for authentication and history.
- **gRPC Server**: A high-performance bi-directional streaming server exposing endpoints for telephony gateways and core banking integrations.
- **Database Storage**: SQLAlchemy ORM with multi-database support (PostgreSQL/Supabase in production, SQLite local file fallback for offline runs).

---

## 4. Machine Learning Model
VOICEGUARD uses a hybrid classifier ensemble:
1. **PyTorch Multi-Layer Perceptron (VoiceGuardMLP)**: Maps 38 acoustic features (13 MFCCs, spectral envelope centroids, bandwidths, rolls, zero crossing rates, pitch variation, jitter, and shimmer) to synthetic speech probabilities.
2. **Random Forest Classifier**: Serves as a baseline ensemble matching non-linear feature distributions for robust out-of-box scoring.

---

## 5. Dataset
Models are trained on acoustic profiles synthesizing properties of genuine vs. fake speech:
- **Genuine Human Speech**: Standard conversational MFCC bands, dynamic pitch standard deviations (natural prosody), standard jitter (0.001 - 0.008) and shimmer.
- **Synthesized Voice**: Highly smoothed MFCC variances (monotone), robotic pitch standard deviations (< 4.0 Hz), high-frequency spectral rolloffs, and zero crossing rates (vocoder noise artifacts).

---

## 6. Features
- **Live Analysis**: In-browser microphone streaming over WebSocket with settings panels.
- **Simulated Calls**: streams pre-recorded files at 1x real-time speed.
- **Batch Forensics**: REST upload audits generating detailed feature maps.
- **Language ID**: Acoustic language classification matching 11 Indian languages.
- **Speaker Similarity Check**: Cosine similarity embedding check vs a known reference file.
- **Incident Logs**: Real-time alerts logged by threat levels (Critical, High, Medium).
- **Downloadable Audits**: Clickable printable security certificates.
- **Critical Threat Action Center**: Dynamic interactive overlay prompting secondary security checks (MFA, Callbacks, escalation).

---

## 7. Real-Time Pipeline
```
Browser (AudioContext Node) ➔ Raw PCM Chunks + Metadata ➔ WebSocket Ingestion ➔ Sliding Window Buffer ➔ Preprocessing ➔ Feature Extraction (librosa) ➔ ML Inference (PyTorch) ➔ Risk Smoothing ➔ JSON Telemetry ➔ Dashboard Gauges & Alerts
```

---

## 8. Multilingual Support
Detects 11 regional Indian languages:
- Hindi (hi), English (en), Marathi (mr), Bengali (bn), Tamil (ta), Telugu (te), Kannada (kn), Malayalam (ml), Gujarati (gu), Punjabi (pa), Urdu (ur).

---

## 9. Speaker Verification
Extracts voice embeddings (average normalized MFCC profiles) and compares them against reference profiles using Cosine Similarity:
$$\text{Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

---

## 10. Risk Engine
Calculates score (0-100) combining smoothed model probability, speaker mismatch penalties, fraud-context keywords, and enriched metadata inputs:
- **Call Origin**: VoIP networks add up to $+10$ points.
- **Caller Credibility**: Unknown numbers add $+10$ points.
- **Historical Fraud Flags**: Flagged identity channels add $+15$ points.
- **Transaction Exposure**: Financial requests exceeding ₹1 Lakh add $+15$ points.

---

## 11. Privacy Policies
- **No permanent storage of raw audio files by default.**
- Temporary RAM buffers are overwritten immediately.
- Session metadata and forensic features saved; configurable cache schedules.

---

## 12. Security Features
- OAuth2 JWT session authorization.
- Ingestion rate limits and size limits (15MB upload caps).
- strict mime-type checks to prevent binary scripts disguised as audio.

---

## 13. Installation
Requires Python 3.10+ and Node.js.

### In the backend:
```bash
cd backend
pip install -r requirements.txt
```

### In the frontend:
```bash
cd frontend
npm install
```

---

## 14. Environment Variables
Copy `.env.example` to `.env`:
```ini
JWT_SECRET=supersecretjwtkeyforvoiceguardprototype2026sih
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
MODEL_PATH=ml/models/saved_models/voiceguard_v1.0.pt
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 15. Running Locally

### Step A: Train the Models
```bash
python3 ml/training/train_real_model.py
```

### Step B: Start Backend
```bash
python3 -m uvicorn backend.app.main:app --port 8000
```

### Step C: Start Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 16. Testing
We include a complete end-to-end integration verification script.
Ensure uvicorn is running on port 8000, then execute:
```bash
python3 scripts/test-demo
```

---

## 17. gRPC Integration
The framework exposes a gRPC service for banking system trunks. 
The schema file is located at [`backend/app/grpc/voiceguard.proto`](file:///Users/swapnil/Base%20Zero%20/voiceguard/backend/app/grpc/voiceguard.proto).
Start the gRPC service runner:
```bash
python3 backend/app/grpc/server.py
```

---

## 18. Demo Instructions (3-Minute Flow)
1. Open VOICEGUARD console and sign up a new account.
2. Select **Live Analysis**, toggle settings (e.g. VoIP origin, ₹150,000 transaction), click "Start Live Ingestion", and speak normally. Observe the baseline risk level, green waveform, and language ID.
3. Stop, click **Simulated Call**, upload a cloned monotone file, set parameters (e.g., VoIP origin, flagged trunk), and run the simulation. Watch the risk score climb to 100%, red waveforms, and the **Critical Threat Action Center** dialog popup.
4. Click **Send MFA Challenge** and **Force Callback** on the modal.
5. In **SOC Alerts**, click "Resolve", and view the Twilio/SendGrid dispatch logs in the backend console.
6. Open **System Analytics** to view performance logs, and print reports from **Audio Analysis**.

---

## 19. Limitations
- Does not intercept carrier-level GSM calls directly on-device (carrier limitation; requires VoIP adapter).
- Language ID is feature-statistics based and performs best on spoken intervals > 2 seconds.

---

## 20. Future Improvements
- Deeper PyTorch models (e.g. Whisper-Encoder fine-tuned embeddings).
- SIP trunk integrations for carrier telephony networks.
