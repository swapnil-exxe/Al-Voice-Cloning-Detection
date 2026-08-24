# STRICT ML/DL VALIDATION REPORT
** smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

This report compiles the strict, independent validation metrics of the VOICEGUARD model to prevent overfitting, data leakage, and false confidence reports.

---

## 1. Dataset & Speaker Splits
* **Total Genuine WAV files**: 10
* **Total Spoof WAV files**: 10
* **Training Speakers (Excluded)**: 4
* **Test Speakers (Disjoint)**: 6 genuine, 10 spoof.

---

## 2. Model Performance on Unseen Speakers (Strict Baseline)
* **Accuracy**: 0.8750
* **Precision**: 0.8333
* **Recall**: 1.0000
* **F1 Score**: 0.9091
* **ROC-AUC**: 1.0000
* **Equal Error Rate (EER)**: 0.0000
* **False Positive Rate (FPR)**: 0.3333
* **False Negative Rate (FNR)**: 0.0000

### Confusion Matrix:
| | Predicted Genuine | Predicted Synthetic |
| :--- | :---: | :---: |
| **Actual Genuine** | 4 (TN) | 2 (FP) |
| **Actual Synthetic** | 0 (FN) | 10 (TP) |

---

## 3. Generalization to Unseen Synthesis Generators
* **Unseen Neural TTS Accuracy**: 1.0000
* **Failure Mode Analysis**: The model performs **ACCEPTABLY** on unseen high-fidelity neural Text-to-Speech clones. This is because the detector operates as a **robotic LPC vocoder filter detector** (relying heavily on the absence of pitch standard deviation and jitter). High-fidelity deepfakes (e.g. from ElevenLabs or VITS) that preserve natural prosody and voice modulations bypass classification.

---

## 4. Robustness Metrics

### A. Ambient Background Noise (20dB SNR)
* **Genuine Speech Accuracy**: 1.0000

### B. GSM Codec Channel (Low-Pass 3.5kHz Butterworth Filter)
* **Genuine Speech Accuracy**: 0.0000

---

## 5. Live vs Offline Pipeline Consistency
* **Offline Probability (Preprocessed)**: 0.0000
* **Live Probability (WS Buffer Window)**: 0.0000
* **Absolute Inconsistency Difference**: 0.0000
* **Consistency Rating**: PASSED

---

## 6. Latency Optimization Benchmarks
* **PyIN (Current tracker)**: 657.46 ms
* **Autocorrelation (Optimized tracker)**: 17.77 ms
* **Speedup**: 37.0x faster.

---

## 7. Core Technical Limitations
1. **TTS Spoof Overlooking**: The PyTorch neural network relies heavily on pitch variation bounds. Clones with natural pitch variation are misclassified as genuine human speech.
2. **Channel Sensitivity**: Due to the absence of WebSocket-level gain normalization, microphone volume drops scale feature vectors down, causing the model to mispredict the output.
