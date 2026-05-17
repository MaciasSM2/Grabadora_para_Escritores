from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class JobHistory(Base):
    __tablename__ = "job_history"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    filename = Column(String, index=True)
    original_format = Column(String)
    transcription = Column(Text)
    # Usando datetime.UTC (aware) en lugar de utcnow() que está deprecated desde Python 3.12
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))

class ToneSettings(Base):
    __tablename__ = "tone_settings"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    tone_name = Column(String, unique=True, index=True)
    reference_text = Column(Text)

class DocumentHistory(Base):
    __tablename__ = "document_history"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String, index=True)
    file_path = Column(String)
    excerpt = Column(Text)
    tone_name = Column(String)
    # Usando datetime.UTC (aware) en lugar de utcnow() que está deprecated desde Python 3.12
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))
