import os
import sys
import csv
import subprocess
import torch
import numpy as np
import soundfile as sf
import librosa
from gtts import gTTS
from transformers import VitsModel, AutoTokenizer

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.preprocessing.audio import preprocess_audio_array

def build_dataset():
    print("=== BUILDING MULTILINGUAL MULTI-GENERATOR DATASET CORPUS ===")
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_dir = os.path.join(base_dir, "data")
    corpus_dir = os.path.join(data_dir, "corpus")
    
    gen_corpus = os.path.join(corpus_dir, "genuine")
    spf_corpus = os.path.join(corpus_dir, "spoof")
    
    os.makedirs(gen_corpus, exist_ok=True)
    os.makedirs(spf_corpus, exist_ok=True)
    
    manifest_rows = []
    
    # 1. Processing Existing Genuine English (LibriSpeech CDN)
    existing_gen_dir = os.path.join(data_dir, "genuine")
    gen_files = sorted([os.path.join(existing_gen_dir, f) for f in os.listdir(existing_gen_dir) if f.endswith(".wav")])
    
    print(f"[*] Processing {len(gen_files)} existing genuine English audio files...")
    for idx, fpath in enumerate(gen_files):
        try:
            y, sr = librosa.load(fpath, sr=16000, mono=True)
            y_proc = preprocess_audio_array(y, sr, 16000)
            
            speaker_id = f"ENG_GEN_SPK_{idx+1:02d}"
            target_fname = f"eng_gen_spk_{idx+1:02d}.wav"
            target_path = os.path.join(gen_corpus, target_fname)
            sf.write(target_path, y_proc[:48000], 16000)
            
            if idx < 6:
                split = "train"
            elif idx < 8:
                split = "val"
            else:
                split = "test"
                
            manifest_rows.append({
                "file": os.path.relpath(target_path, base_dir),
                "speaker_id": speaker_id,
                "language": "en",
                "label": 0,
                "generator": "human",
                "source": "librispeech",
                "split": split
            })
        except Exception as e:
            print(f"Error processing {fpath}: {e}")

    # 2. Processing Existing LPC Synthetic English
    existing_spf_dir = os.path.join(data_dir, "spoof")
    spf_files = sorted([os.path.join(existing_spf_dir, f) for f in os.listdir(existing_spf_dir) if f.endswith(".wav")])
    
    print(f"[*] Processing {len(spf_files)} LPC synthetic English audio files...")
    for idx, fpath in enumerate(spf_files):
        try:
            y, sr = librosa.load(fpath, sr=16000, mono=True)
            y_proc = preprocess_audio_array(y, sr, 16000)
            
            speaker_id = f"ENG_LPC_SPK_{idx+1:02d}"
            target_fname = f"eng_lpc_spk_{idx+1:02d}.wav"
            target_path = os.path.join(spf_corpus, target_fname)
            sf.write(target_path, y_proc[:48000], 16000)
            
            if idx < 6:
                split = "train"
            elif idx < 8:
                split = "val"
            else:
                split = "test"
                
            manifest_rows.append({
                "file": os.path.relpath(target_path, base_dir),
                "speaker_id": speaker_id,
                "language": "en",
                "label": 1,
                "generator": "LPC",
                "source": "lpc_vocoder",
                "split": split
            })
        except Exception as e:
            print(f"Error processing {fpath}: {e}")

    # 3. Generating VITS Neural End-to-End TTS Audio (facebook/mms-tts-eng)
    print("[*] Synthesizing VITS Neural End-to-End TTS audio samples...")
    try:
        vits_model = VitsModel.from_pretrained("facebook/mms-tts-eng")
        vits_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-eng")
        
        vits_prompts = [
            "VoiceGuard automated security center. Please hold for authentication.",
            "Transaction approval initiated. One time password has been dispatched.",
            "Emergency warning: Unauthorized network access detected on your mobile device.",
            "Your identity verification call is being recorded for security auditing.",
            "Welcome to the multi-factor authentication security protocol system.",
            "Suspicious financial activity flagged. Please confirm caller credentials immediately."
        ]
        
        for v_idx, text in enumerate(vits_prompts):
            inputs = vits_tokenizer(text, return_tensors="pt")
            with torch.no_grad():
                output = vits_model(**inputs).waveform.squeeze().cpu().numpy()
                
            y_proc = preprocess_audio_array(output, 16000, 16000)
            target_fname = f"vits_en_spk_{v_idx+1:02d}.wav"
            target_path = os.path.join(spf_corpus, target_fname)
            sf.write(target_path, y_proc[:48000] if len(y_proc)>=48000 else np.pad(y_proc, (0, 48000-len(y_proc))), 16000)
            
            split = "train" if v_idx < 4 else ("val" if v_idx < 5 else "test")
            manifest_rows.append({
                "file": os.path.relpath(target_path, base_dir),
                "speaker_id": f"S_VITS_{v_idx+1:02d}",
                "language": "en",
                "label": 1,
                "generator": "VITS",
                "source": "huggingface_vits_mms",
                "split": split
            })
    except Exception as e:
        print(f"[-] VITS generation error: {e}")

    # 4. Generating gTTS Neural Speech for English, Hindi, and Marathi
    gtts_prompts = {
        "en": [
            "VoiceGuard security protocol active. Authentication required for access.",
            "Please verify your account identity to approve the transaction.",
            "Emergency alert. Suspicious login detected on your mobile network.",
            "Welcome to the automated banking security validation center.",
            "Thank you for contacting customer support. How can I assist you today?",
            "Your one time password has been dispatched to your registered phone."
        ],
        "hi": [
            "वॉइसगार्ड सुरक्षा प्रणाली चालू है। कृपया अपनी पहचान की पुष्टि करें।",
            "आपकी लेनदेन की पुष्टि के लिए एक ओटीपी आपके मोबाइल पर भेजा गया है।",
            "नमस्ते, भारतीय स्टेट बैंक सुरक्षा विभाग में आपका स्वागत है।",
            "आपकी आपातकालीन सेवा के लिए हमारे प्रतिनिधि जल्द ही संपर्क करेंगे।",
            "खाते में किसी भी संदिग्ध गतिविधि की तुरंत रिपोर्ट करें।",
            "धन्यवाद, आपकी सुरक्षा हमारी पहली प्राथमिकता है।"
        ],
        "mr": [
            "व्हॉइसगार्ड सुरक्षा प्रणाली सक्रिय आहे. कृपया तुमची ओळख तपासा.",
            "तुमच्या व्यवहाराच्या मंजुरीसाठी एक ओटीपी तुमच्या फोनवर पाठवला गेला आहे.",
            "नमस्कार, बँक सुरक्षा विभागात आपले स्वागत आहे.",
            "तुमच्या खात्यातील कोणत्याही संशयास्पद हालचालीची ताबडतोब नोंद करा.",
            "आम्ही तुमच्या सुरक्षेसाठी २४ तास तत्पर आहोत.",
            "धन्यवाद, तुमची सुरक्षा ही आमची पहिली प्राथमिकता आहे।"
        ]
    }
    
    print("[*] Synthesizing gTTS neural speech across English, Hindi, and Marathi...")
    for lang, prompts in gtts_prompts.items():
        for p_idx, text in enumerate(prompts):
            try:
                tts = gTTS(text=text, lang=lang)
                temp_mp3 = os.path.join(corpus_dir, f"temp_{lang}_{p_idx}.mp3")
                tts.save(temp_mp3)
                
                y, sr = librosa.load(temp_mp3, sr=16000, mono=True)
                y_proc = preprocess_audio_array(y, sr, 16000)
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)
                    
                speaker_id = f"{lang.upper()}_GTTS_SPK_{p_idx+1:02d}"
                target_fname = f"{lang}_gtts_spk_{p_idx+1:02d}.wav"
                target_path = os.path.join(spf_corpus, target_fname)
                sf.write(target_path, y_proc[:48000] if len(y_proc)>=48000 else np.pad(y_proc, (0, 48000-len(y_proc))), 16000)
                
                if p_idx < 3:
                    split = "train"
                elif p_idx < 4:
                    split = "val"
                else:
                    split = "test"
                    
                manifest_rows.append({
                    "file": os.path.relpath(target_path, base_dir),
                    "speaker_id": speaker_id,
                    "language": lang,
                    "label": 1,
                    "generator": "gTTS",
                    "source": "google_neural_tts",
                    "split": split
                })
            except Exception as e:
                print(f"gTTS error ({lang}, {p_idx}): {e}")

    # 5. Generating macOS Native Neural Speech CLI (`say` command)
    print("[*] Generating macOS native synthesized speech clips...")
    mac_voices = [
        ("Alex", "en", "S_MAC_01"),
        ("Samantha", "en", "S_MAC_02"),
        ("Karen", "en", "S_MAC_03"),
        ("Veena", "en", "S_MAC_04"),
        ("Rishi", "hi", "S_MAC_05"),
        ("Lekha", "hi", "S_MAC_06")
    ]
    
    for v_idx, (voice_name, lang, spk_id) in enumerate(mac_voices):
        try:
            temp_aiff = os.path.join(corpus_dir, f"temp_mac_{v_idx}.aiff")
            sample_text = f"This is an automated speech synthesis test from speaker voice {voice_name}."
            subprocess.run(["say", "-v", voice_name, sample_text, "-o", temp_aiff], check=True)
            
            y, sr = librosa.load(temp_aiff, sr=16000, mono=True)
            y_proc = preprocess_audio_array(y, sr, 16000)
            if os.path.exists(temp_aiff):
                os.remove(temp_aiff)
                
            target_fname = f"mac_{lang}_{voice_name.lower()}_spk.wav"
            target_path = os.path.join(spf_corpus, target_fname)
            sf.write(target_path, y_proc[:48000] if len(y_proc)>=48000 else np.pad(y_proc, (0, 48000-len(y_proc))), 16000)
            
            split = "train" if v_idx < 4 else ("val" if v_idx < 5 else "test")
            manifest_rows.append({
                "file": os.path.relpath(target_path, base_dir),
                "speaker_id": spk_id,
                "language": lang,
                "label": 1,
                "generator": "macOS_Native",
                "source": "apple_speech_synth",
                "split": split
            })
        except Exception as e:
            print(f"macOS speech error ({voice_name}): {e}")

    # 6. Add User Failed AI Audio Clips as UNSEEN REGRESSION TEST ONLY
    unseen_ai_files = [
        ("data/failed_ai_voice.mp3", "failed_ai_voice.mp3", "S_UNSEEN_AI_01"),
        ("data/ai_sample2.mp3", "ai_sample2.mp3", "S_UNSEEN_AI_02")
    ]
    
    for rel_path, fname, spk_id in unseen_ai_files:
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            manifest_rows.append({
                "file": rel_path,
                "speaker_id": spk_id,
                "language": "en",
                "label": 1,
                "generator": "Unseen_Neural_TTS",
                "source": "user_failed_case",
                "split": "unseen_test"
            })
            
    # Write Manifest CSV
    manifest_path = os.path.join(data_dir, "manifest.csv")
    with open(manifest_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["file", "speaker_id", "language", "label", "generator", "source", "split"])
        writer.writeheader()
        writer.writerows(manifest_rows)
        
    print(f"\n[+] Manifest CSV written to: {manifest_path}")
    print(f"[+] Total physical audio files indexed: {len(manifest_rows)}")

if __name__ == "__main__":
    build_dataset()
