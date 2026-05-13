from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class JobHistory(Base):
    __tablename__ = "job_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    original_format = Column(String)
    transcription = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ToneSettings(Base):
    __tablename__ = "tone_settings"

    id = Column(Integer, primary_key=True, index=True)
    tone_name = Column(String, unique=True, index=True)
    reference_text = Column(Text)

class DocumentHistory(Base):
    __tablename__ = "document_history"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    file_path = Column(String)
    excerpt = Column(Text)
    tone_name = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
