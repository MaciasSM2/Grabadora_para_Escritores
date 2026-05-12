from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import shutil
import os
import subprocess

import models
from database import engine, SessionLocal

# Inicializar Base de datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gema - STT Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Gema STT Backend Running"}

@app.post("/api/transcribe/file")
async def transcribe_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Validador de audio y FFmpeg pipeline
    temp_input_path = f"temp_{file.filename}"
    temp_wav_path = f"temp_converted_{file.filename}.wav"
    
    try:
        # Guardar archivo subido temporalmente
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Pipeline a prueba de fallos: Convertir a wav 16kHz mono usando FFmpeg
        command = [
            "ffmpeg", "-y", "-i", temp_input_path, 
            "-ar", "16000", "-ac", "1", temp_wav_path
        ]
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # TODO: PocketSphinx (Requiere C++ Build Tools instalados en Windows)
        # import speech_recognition as sr
        # r = sr.Recognizer()
        # with sr.AudioFile(temp_wav_path) as source:
        #     audio = r.record(source)
        #     transcription = r.recognize_sphinx(audio, language="es-ES")
        
        transcription_simulated = "Este es un texto simulado porque PocketSphinx no está instalado."
        
        # Guardar en el historial de BD local (SQLite)
        db_job = models.JobHistory(
            filename=file.filename,
            original_format=file.filename.split(".")[-1],
            transcription=transcription_simulated
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        return {"transcription": transcription_simulated, "job_id": db_job.id}

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"Error en procesamiento de audio: FFmpeg falló. Detalle: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Limpieza segura para evitar fatal errors por disco lleno
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

class ProcessTextRequest(BaseModel):
    raw_text: str
    tone_name: str

@app.post("/api/process-text")
async def process_text(request: ProcessTextRequest):
    # Simulación de la revisión de estilo sin IA externa
    simulated_corrected_text = request.raw_text.replace(" bueno ", " excelente ").replace(" malo ", " deficiente ")
    if request.tone_name == "Narrativa de Ciencia Ficción y Fantasía Épica":
        simulated_corrected_text = simulated_corrected_text + "\n\n[Estilo Épico Aplicado heurísticamente]"
        
    return {"corrected_text": simulated_corrected_text}
