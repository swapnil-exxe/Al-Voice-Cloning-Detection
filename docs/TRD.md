# Technical Requirements Document (TRD)

## 1. System Technology Stack
- **Frontend**: React (v18+), TypeScript, Vite (bundler), Tailwind CSS (styling), Lucide React (icons), Recharts (data charts), Framer Motion (page transitions).
- **Backend**: FastAPI (Python 3.10+), Uvicorn (ASGI server), WebSockets.
- **Database**: SQLAlchemy (ORM), PostgreSQL/Supabase for production, SQLite (`voiceguard.db`) local file for zero-dependency fallback.
- **Machine Learning**:
  - `librosa` / `scipy` / `numpy` for feature extraction.
  - `scikit-learn` for baseline classifier, language detector, and speaker similarity models.
  - `torch` (PyTorch) for the deep learning voice spoofing detection classifier.
- **Security**: JWT-based session tokens, CORS policy, file type/size validators, WebSocket handshake authentication.

---

## 2. Real-Time Audio Streaming Protocol
```
Browser (AudioWorklet/ScriptProcessor) 
    → Collect 16kHz Mono Float32 Raw PCM chunks (4096 samples / ~256ms)
    → WebSocket Binary Frame (raw buffer)
    → FastAPI Backend WebSocket Handler
    → Circular Audio Buffer (keeps trailing 4 seconds of audio)
    → Resample & Preprocess (every 1.0 second sliding window, step 0.5s)
    → Extract Acoustic/Spectral/Prosodic features
    → Model Inference & Language ID & Speaker Similarity
    → Risk Score & Context Alert calculation
    → WebSocket Text Frame (JSON response)
    → React Dashboard UI updates
```

---

## 3. ML Feature Extraction Details
For each sliding window, we extract:
1. **Mel-Frequency Cepstral Coefficients (MFCCs)**: 13 coefficients representing the envelope of the short-term power spectrum.
2. **Spectral Centroid**: Indicates where the center of mass of the spectrum is.
3. **Spectral Bandwidth**: Represents the width of the spectral distribution.
4. **Spectral Roll-Off**: Frequency below which 85% of the spectral energy lies.
5. **Zero-Crossing Rate (ZCR)**: The rate of signchanges along a signal (useful for noise/silence/synthesis detection).
6. **Pitch (F0)**: Fundamental frequency of speech, tracking variation (prosody).
7. **Jitter & Shimmer**: Micro-variations in pitch and amplitude, which are often smoothed out or unnaturally structured in generative synthetic models.

---

## 4. Multi-Layer Pipelines
### 4.1 Voice Spoof Detection Model
A modular interface allows two backends:
- **Baseline**: Scikit-Learn Random Forest Classifier trained on acoustic feature profiles.
- **Deep Learning**: PyTorch Multi-Layer Perceptron (MLP) mapping 13 MFCCs + spectral features to binary labels (`0` for Genuine, `1` for Spoof/Synthetic).

### 4.2 Language Identification (LID)
A lightweight classifier mapping spectral statistics (centroid, roll-off, chroma features) to the target 11 Indian languages.

### 4.3 Speaker Verification
Extracts speaker embeddings (averaged normalized MFCCs and pitch profiles) from the reference audio and current window, computing Cosine Similarity:
$$\text{Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
A similarity above 0.80 flags a speaker match.

---

## 5. Risk Scoring & Context Engine
The raw model spoof probability $P_{\text{spoof}}$ is smoothed temporally using an Exponential Moving Average (EMA) to prevent flickering UI scores:
$$S_t = \alpha \cdot P_{\text{spoof}} + (1 - \alpha) \cdot S_{t-1}$$
*(where $\alpha = 0.4$)*

Contextual analysis inspects the speech content (simulated transcription or keyword spotting in real time) for high-fraud terms (e.g., "bank transfer", "OTP", "urgent", "password"). If a high-fraud keyword is detected, it applies a context multiplier (up to $+20$ points) to the risk score, elevating the threat classification:
- **0–30**: Low Risk
- **31–60**: Medium Risk
- **61–80**: High Risk
- **81–100**: Critical Risk
