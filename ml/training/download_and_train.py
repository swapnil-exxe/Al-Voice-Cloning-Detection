import os
import sys
import shutil
import soundfile as sf
import librosa
import numpy as np

# Ensure root paths are in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.training.train_real_model import lpc_vocoder_synthesis, build_and_train_real_pipeline

def main():
    print("==================================================")
    print("      VOICEGUARD WEB AUDIO LOADER & PIPELINE     ")
    print("==================================================")
    
    # Create directories for audio data
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
    gen_dir = os.path.join(data_dir, "genuine")
    spf_dir = os.path.join(data_dir, "spoof")
    os.makedirs(gen_dir, exist_ok=True)
    os.makedirs(spf_dir, exist_ok=True)
    
    # Use Librosa's built-in CDN examples
    example_names = ['libri1', 'libri2', 'libri3']
    
    print("[WebLoader] Downloading genuine human speech samples from Librosa CDN...")
    
    for idx, name in enumerate(example_names):
        try:
            print(f" -> Fetching Librosa example '{name}'...")
            ogg_path = librosa.example(name)
            print(f" [+] Downloaded successfully: {ogg_path}")
            
            # Copy file to genuine data folder
            dest_name = f"libri_genuine_{idx+1}.wav"
            dest_path = os.path.join(gen_dir, dest_name)
            
            # Load and convert/save as 16kHz wav file
            y, sr = librosa.load(ogg_path, sr=16000, mono=True)
            sf.write(dest_path, y, 16000)
            print(f" [+] Converted and saved to {dest_path}")
            
            # Synthesize matching AI-cloned vocoded counterpart
            spf_name = f"libri_spoof_{idx+1}.wav"
            spf_path = os.path.join(spf_dir, spf_name)
            
            if not os.path.exists(spf_path):
                print(f" -> Synthesizing vocoded clone for {dest_name}...")
                y_spf = lpc_vocoder_synthesis(y, 16000, order=12)
                sf.write(spf_path, y_spf, 16000)
                print(f" [+] Saved cloned counterpart to {spf_path}")
            else:
                print(f" [+] Cloned counterpart already exists. Skipping synthesis.")
                
        except Exception as e:
            print(f" [-] Failed to process example {name}: {e}")
            
    print("\n[WebLoader] Download & Synthesis complete. Launching Model Training Pipeline...")
    build_and_train_real_pipeline()
    print("==================================================")

if __name__ == "__main__":
    main()
