# VOICEGUARD — DATASET AUDIT REPORT
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

This report summarizes the exact quantity and characteristics of all physical audio files currently available in the VoiceGuard repository.

---

## 1. Physical Audio Files Audit

### A. Language Distribution
* **English**: 20 files (10 genuine, 10 synthetic)
* **Hindi**: 0 files
* **Marathi**: 0 files
* **Tamil**: 0 files
* **Telugu**: 0 files
* **Bengali**: 0 files
* **Kannada**: 0 files
* **Malayalam**: 0 files
* **Gujarati**: 0 files
* **Punjabi**: 0 files
* **Urdu**: 0 files

### B. Authenticity Classification
* **Genuine (Human)**: 10 files
* **Synthetic (AI/Spoofed)**: 10 files

### C. Synthetic Generation Architectures
* **LPC (Linear Predictive Coding Vocoder)**: 10 files
* **VITS (Neural TTS)**: 0 files
* **XTTS (Neural TTS)**: 0 files
* **ElevenLabs (Neural Voice Clone)**: 0 files
* **Other (Voice Conversion / Neural Vocoders)**: 0 files

---

## 2. Dataset Partition Specifications

* **Unique Speakers**: 10
* **Unique Generators**: 1 (LPC Vocoder carrier)
* **Train Split**: 6 files (3 genuine, 3 spoof)
* **Validation Split**: 2 files (1 genuine, 1 spoof)
* **Test Split**: 12 files (6 genuine, 6 spoof)

---

## 3. Data Integrity & Coverage Gaps
* **Regional Language Gaps**: The dataset contains **0%** coverage for Hindi, Marathi, and all other Indian regional languages.
* **Cloning Generator Gaps**: The dataset contains **0%** coverage for modern neural Text-to-Speech (TTS), voice cloning, or voice conversion algorithms (such as ElevenLabs, Tacotron, or XTTS).
* **Environment/Channel Coverage**: The dataset consists entirely of clean, full-bandwidth recordings, lacking any genuine telephony channel recordings.
* **Physical Audio Cap**: There are exactly 20 WAV files on disk. (Simulated features vectors are excluded from this audit).
