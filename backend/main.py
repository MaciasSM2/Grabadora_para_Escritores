from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import shutil
import os
import subprocess
import wave
import json
import datetime
from typing import Optional
from vosk import Model, KaldiRecognizer

import models
from database import engine, SessionLocal
from nlp_processor import StyleProcessor

# Inicializar Base de datos
models.Base.metadata.create_all(bind=engine)

# Inicializar procesador de estilo
style_processor = StyleProcessor()

# Rutas absolutas basadas en la ubicación del archivo (compatibilidad Windows)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_DIR = os.path.join(BASE_DIR, "local_history_vault")
os.makedirs(VAULT_DIR, exist_ok=True)

app = FastAPI(title="Gema - STT Backend")

# Cargar modelo de Vosk en memoria (solo una vez al inicio)
try:
    vosk_model = Model("model_es")
    print("Modelo Vosk cargado exitosamente.")
except Exception as e:
    vosk_model = None
    print(f"Error cargando modelo Vosk: {e}. Asegúrate de haber ejecutado download_model.py")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
        
        # Reconocimiento Offline con Vosk — usar `with` para garantizar cierre del handle en Windows
        if vosk_model is None:
            raise HTTPException(status_code=500, detail="El modelo de voz Vosk no está configurado.")

        with wave.open(temp_wav_path, "rb") as wf:
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
                raise HTTPException(status_code=400, detail="El formato de audio no es válido para Vosk.")

            rec = KaldiRecognizer(vosk_model, wf.getframerate())
            rec.SetWords(True)

            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    part_result = json.loads(rec.Result())
                    results.append(part_result.get("text", ""))

            part_result = json.loads(rec.FinalResult())
            results.append(part_result.get("text", ""))

        # El handle de wf ya está cerrado aquí — seguro para borrar en Windows
        transcription_real = " ".join(filter(None, results)).strip()
        
        # Guardar en el historial de BD local (SQLite)
        db_job = models.JobHistory(
            filename=file.filename,
            original_format=file.filename.split(".")[-1],
            transcription=transcription_real
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        return {"transcription": transcription_real, "job_id": db_job.id}


    except FileNotFoundError as e:
        error_msg = f"FFmpeg no está instalado o no se encuentra en el PATH. Error real: {e}"
        print(f"CRITICAL ERROR: {error_msg}")
        raise HTTPException(status_code=500, detail="Falta dependencia del sistema: FFmpeg. Instálalo en Windows y agrégalo al PATH.")
    except subprocess.CalledProcessError as e:
        stderr_output = e.stderr.decode('utf-8') if e.stderr else 'Sin salida de error'
        error_msg = f"FFmpeg falló al procesar el archivo. Detalle: {stderr_output}"
        print(f"FFMPEG ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        print(f"TRANSCRIPTION EXCEPTION: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo interno en transcripción: {str(e)}")
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
async def process_text(request: ProcessTextRequest, db: Session = Depends(get_db)):
    # Obtener el texto de referencia para este tono desde la DB
    tone_settings = db.query(models.ToneSettings).filter(models.ToneSettings.tone_name == request.tone_name).first()
    reference_text = tone_settings.reference_text if tone_settings else ""
    
    # Aplicar las reglas de NLP sin IA según el tono seleccionado
    corrected_text = style_processor.process_text(request.raw_text, request.tone_name, reference_text)
    
    return {"corrected_text": corrected_text}

@app.get("/api/history")
def get_history(db: Session = Depends(get_db)):
    jobs = db.query(models.JobHistory).order_by(models.JobHistory.created_at.desc()).all()
    return [{
        "id": str(job.id),
        "filename": job.filename,
        "transcription": job.transcription,
        "createdAt": job.created_at.isoformat()
    } for job in jobs]

class ToneRequest(BaseModel):
    tone_name: str
    reference_text: str

@app.post("/api/tones")
def save_tone(request: ToneRequest, db: Session = Depends(get_db)):
    tone = db.query(models.ToneSettings).filter(models.ToneSettings.tone_name == request.tone_name).first()
    if tone:
        tone.reference_text = request.reference_text
    else:
        tone = models.ToneSettings(tone_name=request.tone_name, reference_text=request.reference_text)
        db.add(tone)
    db.commit()
    return {"status": "ok", "tone_name": tone.tone_name}

@app.get("/api/tones")
def get_tones(db: Session = Depends(get_db)):
    tones = db.query(models.ToneSettings).all()
    return {tone.tone_name: tone.reference_text for tone in tones}

class SaveDocumentRequest(BaseModel):
    text: str
    tone_name: str
    title: Optional[str] = None

@app.post("/api/history/save")
def save_document_history(request: SaveDocumentRequest, db: Session = Depends(get_db)):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    doc_title = request.title if request.title else f"Documento_{timestamp}"
    filename = f"{doc_title.replace(' ', '_')}_{timestamp}.txt"
    file_path = os.path.join(VAULT_DIR, filename)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(request.text)
        
    excerpt = request.text[:150] + "..." if len(request.text) > 150 else request.text
    
    db_doc = models.DocumentHistory(
        title=doc_title,
        file_path=file_path,
        excerpt=excerpt,
        tone_name=request.tone_name
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    return {"status": "ok", "doc_id": db_doc.id, "file_path": file_path}

@app.get("/api/history/list")
def list_document_history(db: Session = Depends(get_db)):
    docs = db.query(models.DocumentHistory).order_by(models.DocumentHistory.created_at.desc()).all()
    return [{
        "id": doc.id,
        "title": doc.title,
        "excerpt": doc.excerpt,
        "tone_name": doc.tone_name,
        "created_at": doc.created_at.isoformat()
    } for doc in docs]

@app.get("/api/history/read/{doc_id}")
def read_document_history(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.DocumentHistory).filter(models.DocumentHistory.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    with open(doc.file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    return {"text": content}
