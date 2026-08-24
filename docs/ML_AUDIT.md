# VOICEGUARD ML/DL Pipeline Audit Report
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

---

## 1. Technical Audit of Current Architecture

### A. Core Telemetry Specifications
* **Current Model**: `VoiceGuardMLP` (a 3-layer PyTorch Multi-Layer Perceptron: Linear 38→64 → Linear 64→32 → Linear 32→1 Sigmoid) and a Scikit-Learn `RandomForestClassifier` fallback.
* **Current Training Dataset**: Curated LibriSpeech CDN audio tracks (`libri1`, `libri2`, `libri3`) mapped to Linear Predictive Coding (LPC) synthesized vocoded counterparts, blended with a simulated speaker parameter grid of 6,000 samples.
* **Current Preprocessing**: Resampling to 16kHz, mono conversion, silence trimming (via `librosa.effects.trim` top_db=25), and amplitude max-normalization (rescaling max amplitude to 1.0).
* **Current Sample Rate**: 16,000 Hz.
* **Current Audio Format**: Raw binary `float32` mono PCM chunks (4096 frames / 256ms per block) streamed over WebSocket connections.
* **Current Window Size**: 48,000 samples (3.0 seconds) rolling window, evaluated on each new incoming packet.
* **Current Model Input Shape**: Flat 1D feature vector of dimension `(38,)` containing MFCC means/stds, centroid, rolloff, bandwidth, zero-crossing rate, pitch (F0), jitter, and shimmer.
* **Current Normalization**: `StandardScaler` fit during model training and saved as a pickle file (`voiceguard_v1.0_scaler.pkl`).
* **Current Language Detector**: Deterministic acoustic heuristics comparing zero-crossing rate (ZCR) and pitch mean.
* **Current Thresholds**: Warn/Trigger Action Center at Risk Score $\ge 61\%$.
* **Current Risk Calculation**: Linear combinations of smoothed AI probability, speaker profile cosine similarity offsets, transcription keywords, call origin (VoIP vs local), caller trust, and transaction magnitude.
* **Current Speaker Verification**: Cosine similarity comparing a 13-dimensional MFCC mean vector against reference profile embeddings stored in the DB.

---

## 2. Root Causes of Prediction & UX Issues

### Problem 1: Preprocessing Discrepancy (Live vs Offline)
* **Finding**: The batch upload endpoint (`sessions.py`) processes audio files through `preprocess_audio_array` (which trims silence and normalizes gain). However, the real-time WebSocket endpoint (`live.py`) extracts features directly from the raw `analysis_window` without trimming silence or normalizing gain.
* **Consequence**: Variations in microphone sensitivity, speaker volume, and background noise cause feature amplitudes to drift outside the `StandardScaler` range, leading to unreliable predictions.

### Problem 2: Heuristic Language ID ( Tamil False Positives )
* **Finding**: Language detection uses raw threshold rules on pitch and zero-crossing rates. Because background microphone static or line hiss frequently pushes zero-crossing rates above $0.07$, the system misclassifies English and Marathi conversations as Dravidian languages (specifically Tamil or Telugu).
* **Consequence**: The language prediction is wrong and unstable.

### Problem 3: Platt Probability Calibration Absence
* **Finding**: The raw output of the PyTorch MLP sigmoid activation is treated directly as the calibrated AI probability. There is no Platt scaling or temperature scaling applied, causing scores to saturate at $0\%$ or $100\%$ with high volatility.
* **Consequence**: The threat levels jump erratically rather than following a smooth probability distribution.

### Problem 4: Hardcoded Benchmarks in Analytics
* **Finding**: The `/api/analytics/stats` endpoint returns hardcoded stats (accuracy $0.942$, EER $0.058$) instead of loading a real validation report generated from the test dataset.
* **Consequence**: The benchmark charts do not represent actual system accuracy.

### Problem 5: Demo & Transcript Mocks
* **Finding**: `live.py` contains a simulated branch that injects hardcoded transaction transcripts (`"Approve ₹10 lakh financial transfer immediately."`) between $4.0$ and $10.0$ seconds of the simulation stream, bypassing real-time transcript capture.
* **Consequence**: The transcript-checking engine relies on mock injection rather than a legitimate live evaluation.

---

## 3. Modular ML Redesign Plan

We will decouple the monolithic risk checking pipeline into four isolated, specialized AI subsystems to ensure high-fidelity hackathon evaluations:

```
                      🎙️ LIVE AUDIO STREAM
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  LANGUAGE ID             DEEPFAKE DETECTOR       SPEAKER VERIFICATION
  (LID Model)              (MLP Classifier)         (Embedding Cosine)
        │                       │                       │
        ▼                       ▼                       ▼
    Language               Calibrated AI              Speaker
  & Confidence              Probability             Similarity
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                           RISK ENGINE
                                │
                                ▼
                       COMPOSITE RISK SCORE
```

This ensures that a wrong language identification does not feed into deepfake detection, and speaker similarity remains independent of synthetic voice classification.
