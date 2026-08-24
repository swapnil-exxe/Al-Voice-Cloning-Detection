# VOICEGUARD — MISSING DATA SPECIFICATION
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

---

## 1. Required Speech Datasets

| Language | Current Genuine | Current Synthetic | Required Target Dataset |
| :--- | :---: | :---: | :--- |
| **English** | 10 files | 10 files (LPC) | **ASVspoof 2019 / 2021 Logical Access (LA) subset**: ~5,000 genuine utterances and ~15,000 synthetic utterances generated using 19 TTS/VC systems (neural vocoders, VC, WavNet). |
| **Hindi** | 0 files | 0 files | **IndicTTS Hindi Speech Corpus** (from IIT Madras / IndicTTS Consortium): ~1,500 genuine sentences + ~1,500 neural TTS synthesized sentences (using VITS-Indic / FastSpeech2). |
| **Marathi** | 0 files | 0 files | **IndicTTS Marathi Speech Corpus**: ~1,500 genuine sentences + ~1,500 neural TTS Marathi cloned sentences. |

---

## 2. Missing Cloning & TTS Generators

The following synthesis/impersonation architectures are completely unrepresented in the current training set, leaving the model blind to them:

1. **Neural Text-to-Speech (TTS) models**:
   - **VITS** (Variational Inference with adversarial learning for end-to-end Text-to-Speech).
   - **FastSpeech2 / Tacotron2**.
2. **Zero-Shot Voice Cloning & Voice Conversion (VC)**:
   - **ElevenLabs API** synthesized audio.
   - **XTTS (Coqui)** / **YourTTS** voice clones.
   - **RVC** (Retrieval-based Voice Conversion) used for deepfake audio overlays.
3. **Neural Vocoders (Wave Synthesis)**:
   - **HiFi-GAN**
   - **MelGAN**
   - **WaveGlow**

---

## 3. Recommended Open-Source Data Pipelines

To ingest this data programmatically without manual files upload, we can target these open-source Indic/Anti-spoofing repositories during our next phases:
* **WaveFake**: [Hugging Face Repository](https://huggingface.co/datasets/wavefake) (Multi-generator TTS audio).
* **IndicSpeech**: indic-nlp indicators for speech synthesis networks.
* **ASVspoof 2019 LA Feature subset**: Lightweight pre-extracted features to avoid downloading 30GB of raw audio files.
