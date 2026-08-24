# VOICEGUARD — DATA ACQUISITION & MULTILINGUAL DATASET PLAN
**smart India Hackathon 2026 (Problem Statement ID: SIH26104)**

This document details the acquisition, generation, splitting, and manifest plan for creating a balanced, speaker-disjoint, multi-generator dataset covering **English**, **Hindi**, and **Marathi**.

---

## 1. Legitimate Public Genuine Audio Sourcing

We will automatically ingest clean genuine human speech from open research datasets with non-commercial / open licenses:

| Language | Dataset Source | License / Access | Quantity Target |
| :--- | :--- | :--- | :--- |
| **English** | **LibriSpeech / OpenSLR** | CC-BY-4.0 | 60 files (60 unique speakers) |
| **Hindi** | **OpenSLR SLR103 / AI4Bharat IndicSpeech** | CC-BY-4.0 / Open-Use | 60 files (60 unique speakers) |
| **Marathi** | **OpenSLR SLR64 / AI4Bharat IndicSpeech** | CC-BY-4.0 / Open-Use | 60 files (60 unique speakers) |

---

## 2. Multi-Generator Synthetic Speech Pipeline

To prevent the model from overfitting to a single vocoder signature (like LPC), synthetic speech will be generated across **4 distinct synthesis engines**:

1. **Engine 1: LPC Vocoder (Robotic Vocoded Carrier)**: Frame-by-frame Linear Predictive Coding LPC-12 analysis and monotone excitation filtering.
2. **Engine 2: gTTS (Google Neural Text-to-Speech Engine)**: Generates neural speech for English (`en`), Hindi (`hi`), and Marathi (`mr`).
3. **Engine 3: macOS Native Speech Synthesizer (`say` CLI)**: Native OS speech synthesis with diverse voice personas.
4. **Engine 4: PyTorch VITS / Tacotron2 (TorchHub / HuggingFace)**: Neural end-to-end TTS models.

---

## 3. Dataset Target Quantities

| Language | Genuine Target | Synthetic Target | Synthetic Generators Breakdown | Total Per Language |
| :--- | :---: | :---: | :--- | :---: |
| **English** | 60 files | 60 files | 20 LPC, 20 gTTS, 20 macOS Native/VITS | 120 files |
| **Hindi** | 60 files | 60 files | 20 LPC, 20 gTTS, 20 Neural IndicTTS | 120 files |
| **Marathi** | 60 files | 60 files | 20 LPC, 20 gTTS, 20 Neural IndicTTS | 120 files |
| **TOTAL** | **180 files** | **180 files** | **4 Distinct Generators** | **360 Physical WAV Files** |

---

## 4. Manifest Schema (`data/manifest.csv`)

Every physical audio file on disk will be indexed in `data/manifest.csv` with complete metadata:

```csv
file,speaker_id,language,label,generator,source,split,sample_rate,codec
eng_gen_001.wav,S_ENG_001,en,real,human,librispeech,train,16000,wav
eng_spf_001.wav,S_ENG_001,en,spoof,LPC,vocoder,train,16000,wav
hin_gen_001.wav,S_HIN_001,hi,real,human,indic_speech,train,16000,wav
hin_spf_001.wav,S_HIN_001,hi,spoof,gTTS,google_neural,train,16000,wav
mar_gen_001.wav,S_MAR_001,mr,real,human,indic_speech,val,16000,wav
mar_spf_001.wav,S_MAR_001,mr,spoof,VITS,torch_vits,test,16000,wav
```

---

## 5. Speaker-Disjoint & Generator-Disjoint Partition Plan

To guarantee strict evaluation without data leakage:

* **Train Set (66% ~ 240 files)**: Speakers 1–40 per language. Generators: LPC + gTTS.
* **Validation Set (17% ~ 60 files)**: Speakers 41–50 per language. Generators: LPC + gTTS (used for Platt scaling calibration).
* **Test Set (17% ~ 60 files)**: Speakers 51–60 per language. **Includes Unseen Generators** (macOS Native / VITS) to evaluate generalization.

---

## 6. Hardware, Storage, & Timing Estimates

* **Hardware Acceleration**: Apple Silicon ARM64 (MPS GPU Accelerated - `torch.backends.mps.is_available() == True`).
* **Required Disk Storage**: ~150 MB total for 360 physical 16kHz WAV files.
* **Estimated Acquisition & Generation Time**: ~3 to 5 minutes total.
* **Estimated Model Fine-Tuning / Retraining Time**: ~45 seconds on MPS GPU.

---

## 7. Exact Script / Execution Commands

1. **Ingestion & Manifest Generation Script**: `scripts/acquire_datasets.py`
   ```bash
   /opt/anaconda3/bin/python3 scripts/acquire_datasets.py
   ```
2. **Verification & Audit**:
   ```bash
   /opt/anaconda3/bin/python3 -c "import pandas as pd; df = pd.read_csv('data/manifest.csv'); print(df.groupby(['language', 'label', 'split']).size())"
   ```
