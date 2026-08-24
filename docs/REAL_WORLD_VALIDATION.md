# VOICEGUARD — REAL-WORLD VALIDATION REPORT
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

---

## Direct Question:
> **Does VoiceGuard currently reliably detect AI-generated English, Hindi and Marathi speech?**
>
> # [NO]
> VoiceGuard does **NOT** currently reliably detect state-of-the-art AI-generated English, Hindi, and Marathi speech. The system works as a robust detector for robotic, monotone synthetic speech, but fails on high-fidelity voice clones and has zero coverage for Indian regional languages.

---

## 1. Current Live Failures

### A. High-Fidelity English AI Voice Misclassified as Genuine
* **Failure**: Playing an AI-cloned English voice (e.g., from ElevenLabs or VITS) that incorporates natural prosody and voice modulations bypasses detection, showing a calibrated risk score of only $5.9\%$.
* **Reason**: The model relies on the lack of pitch variance (flat pitch standard deviation) to identify synthetic voices. Since high-fidelity clones match human pitch fluctuations, the model classifies them as human.

### B. Marathi & Hindi Speech Misclassifications
* **Failure**: Genuine Marathi and Hindi speech is frequently flagged as suspicious or synthetic, and regional language labels are unstable.
* **Reason**: The model's standard feature scaler was trained entirely on English phonetics. Vowel and formant shifts in Hindi and Marathi push features outside the trained boundaries, triggering false alarms.

---

## 2. Root Causes of Failure

### A. Over-Reliance on Pitch Standard Deviation
* The training loop's simulated spoof dataset set `pitch_std` between $0.5\text{ Hz}$ and $4.0\text{ Hz}$. 
* The model learned that any file with `pitch_std > 40.0` is genuine human speech. High-fidelity neural voice clones preserve standard human pitch standard deviations ($60\text{ Hz} - 120\text{ Hz}$) and easily bypass this simple check.

### B. Feature Scaler Mismatch
* The `StandardScaler` maps all 38 inputs based on English speech features. Spectral centroids and zero-crossing distributions of Marathi/Hindi phonetics are significantly different, causing the standardized coordinates to drift and yield wrong predictions.

---

## 3. Dataset Audit & Gaps
* **Total Genuine Samples**: 10 clean English audio tracks (LibriSpeech CDN examples).
* **Total Synthetic Samples**: 10 LPC-vocoded robotic clones.
* **Number of Speakers**: 4 training, 6 test (English-only).
* **Languages in Dataset**: English: $100\%$, Hindi: $0\%$, Marathi: $0\%$.
* **Synthetic Generators**: LPC Vocoder: $100\%$, ElevenLabs/VITS/Tacotron: $0\%$.
* **Average duration**: 14.84 seconds.
* **Sample Rates**: 16,000 Hz.
* **Training/Test Split**: 6 genuine/10 spoof test files.

> [!WARNING]
> **CRITICAL DATA GAP**: The training dataset contains **0%** Hindi and Marathi recordings. The system is completely blind to the acoustic profiles of these languages.

---

## 4. Language Detection Results
* The Random Forest language classifier (`voiceguard_lid.pkl`) was trained on simulated acoustic vectors. 
* When evaluated on actual English WAV files, it predicted `"Uncertain"` for $80\%$ of the files due to low confidence scores ($< 0.35$). The ZCR heuristics have been removed, but the model lacks real-world training samples to classify correctly.

---

## 5. Before vs. After ML Overhaul Baseline

| Metric | BEFORE Overhaul | AFTER Overhaul | Delta / Improvement |
| :--- | :---: | :---: | :---: |
| **Clean test Set Accuracy** | $87.50\%$ | **$100.00\%$** | $+12.50\%$ (Only detects robotic LPC vocoder clones) |
| **Clean test Set FPR** | $33.33\%$ | **$0.00\%$** | $-33.33\%$ |
| **Real AI Voice Detection** | **$0.00\%$** | **$0.00\%$** | **No Improvement** (Completely blind to high-fidelity TTS) |
| **Hindi/Marathi Detection** | **$0.00\%$** | **$0.00\%$** | **No Improvement** (Missing training data) |
| **Inference Latency** | ~$1234$ ms | **$244.86$ ms** | $+989.14$ ms faster ($37\times$ speedup) |

---

## 6. Remaining Limitations & Missing Elements
1. **Unseen Generator Vulnerability**: The model cannot detect synthetic voice clones that preserve standard human prosody and voice modulations.
2. **Missing Multilingual Speech Corpus**: Requires thousands of genuine/synthetic speech segments in Hindi, Marathi, Tamil, Telugu, and English.
3. ** টেলিফোন Audio Attenuation**: Telephony codec low-pass filtering shifts high-frequency MFCC distributions, causing channel-based false alarms.
