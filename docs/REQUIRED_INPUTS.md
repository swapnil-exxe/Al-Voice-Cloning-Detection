# VOICEGUARD — REQUIRED INPUTS SPECIFICATION
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

---

## 1. REQUIRED
* **None**: The VOICEGUARD platform runs completely self-contained in your local Anaconda python environment. Standard libraries (scikit-learn, PyTorch, Librosa, NumPy) are sufficient. No extra installations are required.

---

## 2. OPTIONAL (For enhanced testing/demo calibration)
* **Custom Speaker Audio Clips**: If you want to register and test personal profiles, you can record 3–5 short WAV/MP3 files (10–15 seconds) speaking in Marathi, English, or Hindi, and place them inside the `data/genuine/` folder to calibrate speaker verification.
* **Telephony Gateways**: Actual Twilio Account SID, Auth Token, and SendGrid API Key if you want to redirect the alert action notifications to real-world phone lines and email addresses (the system currently runs robust local simulators for these services).

---

## 3. NOT NEEDED
* **GPU / CUDA Compute**: Model training (6,000 samples) runs in under 15 seconds on CPU. Live inference latency is less than 1 ms, making GPU accelerators unnecessary for this prototype.
* **Additional Frameworks**: Do not install heavy models or deep learning weights (such as Hugging Face Transformers or SpeechBrain), which would slow down processing speed and require additional dependencies.
