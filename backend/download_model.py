import os
import urllib.request
import zipfile

MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip"
ZIP_NAME = "model.zip"
EXTRACT_DIR = "model_es"

def download_and_extract():
    if os.path.exists(EXTRACT_DIR):
        print("El modelo ya existe.")
        return

    print("Descargando modelo Vosk (Español)...")
    urllib.request.urlretrieve(MODEL_URL, ZIP_NAME)
    
    print("Extrayendo modelo...")
    with zipfile.ZipFile(ZIP_NAME, 'r') as zip_ref:
        zip_ref.extractall(".")
    
    # Rename extracted folder to EXTRACT_DIR
    extracted_folder = "vosk-model-small-es-0.42"
    if os.path.exists(extracted_folder):
        os.rename(extracted_folder, EXTRACT_DIR)
        
    os.remove(ZIP_NAME)
    print("Modelo listo.")

if __name__ == "__main__":
    download_and_extract()
