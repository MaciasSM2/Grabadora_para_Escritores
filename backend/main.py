from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import shutil
import os
import datetime
import logging
import time

import models
from database import engine, SessionLocal
from nlp_processor import StyleProcessor
from services.transcription_service import TranscriptionService
from schemas import ProcessTextRequest, ToneRequest, SaveDocumentRequest

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gema-backend")

# Inicializar Base de datos
models.Base.metadata.create_all(bind=engine)

# Inicializar Servicios
style_processor = StyleProcessor()
transcription_service = TranscriptionService("model_es")

# Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_DIR = os.path.join(BASE_DIR, "local_history_vault")
os.makedirs(VAULT_DIR, exist_ok=True)

app = FastAPI(title="Gema - STT Backend (Refactored)")

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
    return {"status": "ok", "message": "Gema STT Backend Running (Async Enabled)"}

@app.post("/api/transcribe/file")
async def transcribe_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    import uuid
    
    # Sanitizar y validar formato de audio de forma preventiva
    if file.content_type and not file.content_type.startswith("audio/"):
        allowed_extensions = {'.mp3', '.wav', '.ogg', '.opus', '.m4a', '.webm', '.aac', '.flac'}
        file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if file_ext not in allowed_extensions:
            logger.warning(f"Intento de subir archivo no soportado: {file.filename} (MIME: {file.content_type})")
            raise HTTPException(status_code=400, detail="El archivo no es un formato de audio soportado.")

    unique_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
    # Filtrar caracteres raros de la extensión para mayor seguridad
    file_ext = "".join(c for c in file_ext if c.isalnum() or c == ".").lower()
    if not file_ext:
        file_ext = ".tmp"

    temp_input_path = f"temp_{unique_id}{file_ext}"
    temp_wav_path = f"temp_{unique_id}_converted.wav"
    
    logger.info(f"Recibida solicitud de transcripción: {file.filename} -> Guardando temporalmente como {temp_input_path}")
    start_time = time.time()
    
    try:
        # Guardar archivo subido sin bloquear el event loop
        with open(temp_input_path, "wb") as buffer:
            while True:
                chunk = await file.read(65536) # 64KB chunks
                if not chunk:
                    break
                buffer.write(chunk)
        
        # 1. Conversión Asíncrona y Transcripción en ProcessPool
        transcription_real = await transcription_service.process_audio(temp_input_path, temp_wav_path)
        
        execution_time = time.time() - start_time
        logger.info(f"Job completado en {execution_time:.2f}s")

        # 3. Persistencia
        db_job = models.JobHistory(
            filename=file.filename,
            original_format=file.filename.split(".")[-1] if file.filename and "." in file.filename else "unknown",
            transcription=transcription_real
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        return {
            "transcription": transcription_real, 
            "job_id": db_job.id, 
            "execution_time": execution_time
        }

    except Exception as e:
        logger.exception("Error en el pipeline de transcripción")
        raise HTTPException(
            status_code=500, 
            detail=f"Fallo interno al procesar el audio: {str(e)}"
        )
    finally:
        # Limpieza
        for path in [temp_input_path, temp_wav_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    logger.warning(f"No se pudo eliminar {path}: {e}")

@app.post("/api/process-text")
async def process_text(request: ProcessTextRequest, db: Session = Depends(get_db)):
    tone_settings = db.query(models.ToneSettings).filter(models.ToneSettings.tone_name == request.tone_name).first()
    reference_text = tone_settings.reference_text if tone_settings else ""
    
    # NLP Heurístico
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

@app.post("/api/history/save")
def save_document_history(request: SaveDocumentRequest, db: Session = Depends(get_db)):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    doc_title = request.title if request.title else f"Documento_{timestamp}"
    filename = f"{doc_title.replace(' ', '_')}_{timestamp}.txt"
    file_path = os.path.join(VAULT_DIR, filename)
    
    # BUG FIX: Usando open() síncrono. Este endpoint es sync (def, no async def),
    # por lo que usar aiofiles con await era un RuntimeError garantizado.
    with open(file_path, mode="w", encoding="utf-8") as f:
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
    
    return {"status": "ok", "doc_id": str(db_doc.id), "file_path": file_path}

@app.get("/api/history/list")
def list_document_history(db: Session = Depends(get_db)):
    docs = db.query(models.DocumentHistory).order_by(models.DocumentHistory.created_at.desc()).all()
    return [{
        "id": str(doc.id),  # Serialización explícita a str para consistencia con UUIDs
        "title": doc.title,
        "excerpt": doc.excerpt,
        "tone_name": doc.tone_name,
        "created_at": doc.created_at.isoformat()
    } for doc in docs]

@app.get("/api/history/read/{doc_id}")
def read_document_history(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(models.DocumentHistory).filter(models.DocumentHistory.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    # BUG FIX: Usando open() síncrono. Este endpoint es sync (def, no async def),
    # por lo que usar aiofiles con await era un RuntimeError garantizado.
    with open(doc.file_path, mode="r", encoding="utf-8") as f:
        content = f.read()
        
    return {"text": content}
