# VOICEGUARD — FULL SYSTEM AUDIT REPORT
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

---

## 1. Current System Architecture & Specifications

### A. Core Speech Telemetry Specs
* **ML Model**: PyTorch `VoiceGuardMLP` (38-dimensional input, 3 layers: Linear 38→64 with ReLU/BatchNorm/Dropout → Linear 64→32 with ReLU/BatchNorm/Dropout → Linear 32→1 with Sigmoid) and a Random Forest Classifier fallback (`voiceguard_v1.0.pkl`).
* **Language Model**: Deterministic acoustic heuristic classifier in `language_id.py` (using zero-crossing rate and pitch thresholds).
* **Speaker Model**: Cosine similarity comparator comparing a 13-dimensional MFCC mean vector against database speaker profile references.
* **Datasets**: LibriSpeech Clean Dev audio samples + dynamic Linear Predictive Coding (LPC) vocoder syntheses, blended with a simulated parameter grid of 6,000 speaker records.
* **Dataset Sizes**: 6,008 total training samples.
* **Training Process**: Automated pipeline (`train_real_model.py`) that extracts features, fits a standard scaler, trains the PyTorch MLP (20 epochs, Adam optimizer, cross-entropy loss), and saves weights.
* **Validation/Test Process**: Split-validation ($20\%$ hold-out) during training. Offline E2E testing performed by `/opt/anaconda3/bin/python3 scripts/test-demo`.
* **Audio Sample Rate**: 16,000 Hz.
* **Audio Codec / Format**: Raw binary `float32` mono PCM chunks.
* **Audio Chunk Size**: 4096 samples (~256 ms per block).
* **Window Size**: 48,000 samples (~3.0 seconds) rolling analysis window.
* **Feature Extraction**: 38 features (means and standard deviations of 13 MFCCs, spectral centroid, spectral bandwidth, spectral rolloff, zero-crossing rate, pitch mean/std, jitter, and shimmer).
* **Model Input Format**: 2D tensor of shape `(1, 38)`.
* **Model Output Meaning**: Single value $p \in [0.0, 1.0]$ representing the raw probability of the voice being an AI-cloned/synthetic spoof.
* **Thresholds**: Warning/Action center triggers at risk score $\ge 61\%$.
* **Risk Formula**: Exponential Moving Average (EMA, alpha=0.4) combining:
  - Model spoof probability ($0 - 100$ scale).
  - Speaker similarity mismatch penalty ($+20$ risk points if cosine similarity matches $< 80\%$).
  - Transcription threat keywords ($+25$ risk points max if "OTP", "lakh", "immediate", etc., are detected).
  - Contextual metadata triggers (VoIP origin $+10$ points, Unknown caller $+10$ points, Historical fraud $+15$ points, transaction value above 1 Lakh $+15$ points).
* **WebSocket Architecture**: FastAPI websocket endpoint (`/ws/live-analysis`) accepting binary PCM streams, processing sliding windows, and sending telemetry frames back to the browser.

---

## 2. Platform Latency & Performance Diagnostics
A controlled benchmark was run on 3.0 seconds of audio at 16kHz to identify CPU bottlenecks:

| Stage | Latency | Responsibility | Bottleneck Analysis |
| :--- | :--- | :--- | :--- |
| **Audio Capture** | ~120 ms | Browser/ScriptProcessor | Standard buffer latency. |
| **WebSocket Delivery** | ~15 ms | Local network loopback | Negligible. |
| **Preprocessing** | **402.77 ms** | `librosa.effects.trim` | **CRITICAL BOTTLENECK**: Computing root-mean-square energy windows to trim leading/trailing silence on a sliding window is extremely slow on CPU. |
| **Feature Extraction** | **830.78 ms** | `librosa.pyin` | **CRITICAL BOTTLENECK**: Probabilistic YIN pitch tracking runs heavy dynamic programming trace loops, taking almost a second per window. |
| **Model Inference** | 0.64 ms | PyTorch MLP | Negligible. |
| **Language ID** | 0.02 ms | Deterministic heuristic | Negligible. |
| **Speaker Verification** | 0.05 ms | Cosine similarity | Negligible. |
| **Risk Engine** | 0.00 ms | Metric evaluation | Negligible. |
| **TOTAL** | **1234.28 ms** | Complete pipeline step | **Lag Root Cause**: Cumulative latency exceeds the chunk stream window ($256$ms). The queue backs up, lagging the UI. |

---

## 3. Current Accuracy Profile (Phase 5 Baseline)
A controlled baseline evaluation was run on **10 genuine** and **10 synthetic** clean offline audio samples:
* **Accuracy**: **$100\%$ ($1.0000$)**
* **Precision**: **$1.0000$**
* **Recall**: **$1.0000$**
* **F1 Score**: **$1.0000$**
* **Conclusion**: The underlying trained model works with excellent accuracy when evaluated on clean, static files.

---

## 4. Root Causes of Wrong Predictions & Instability

### Root Cause 1: Preprocessing Pipeline Inconsistency (Live vs Offline)
* **Problem**: The training and file upload pipelines run `preprocess_audio_array` (which rescales and normalizes amplitudes). The WebSocket server (`live.py`) **bypasses preprocessing completely**, feeding raw un-normalized sliding window segments directly into the feature extractor.
* **Impact**: Slight variations in volume/microphone sensitivity skew feature scales, causing standard scaling checks to fail and yielding false warnings on human voices.

### Root Cause 2: Trimming Sliding Windows
* **Problem**: Trimming leading/trailing silence (`librosa.effects.trim`) works on static files but fluctuates dynamically on live rolling windows depending on speech silence pauses.
* **Impact**: Changing the length of the window alters the frame boundaries and mean MFCC offsets, causing the classifier predictions to jump erratically between frames (unstable predictions).

### Root Cause 3: Background Noise Triggers Tamil/Dravidian Language Codes
* **Problem**: The language identifier uses heuristic zero-crossing rates (ZCR) and pitch values. Microphone noise or room hiss raises the ZCR above $0.07$, which automatically redirects the classifier to the Dravidian language group, randomly outputting Tamil/Telugu/Malayalam for English or Marathi speech.

### Root Cause 4: Lack of Logit Probability Calibration
* **Problem**: The raw output of the Sigmoid layer in the MLP is not calibrated. Logits have high variance, causing predictions to saturate immediately at $0\%$ or $100\%$ instead of outputting smooth probabilities.

---

## 5. Missing Components / Replaced Subsystems

* **VAD (Voice Activity Detection)**: Missing. Silent or too quiet frames are passed directly to model evaluation, causing false predictions on empty audio.
* **Trained Language ID Classifier**: Missing. The system uses a rule-based script instead of a trained multi-class LID model.
* **Platt Scaling Calibrator**: Missing. The system lacks logistic calibration on a validation split.
