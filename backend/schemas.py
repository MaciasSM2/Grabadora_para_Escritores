from enum import Enum
from pydantic import BaseModel
from typing import Optional

class ToneName(str, Enum):
    SCI_FI = "Narrativa de Ciencia Ficción y Fantasía Épica"
    ROMANCE = "Romance Contemporáneo"
    THRILLER = "Misterio y Thriller"
    ACADEMIC = "No Ficción Académica"
    GENERAL = "General / Por Defecto"

class ProcessTextRequest(BaseModel):
    raw_text: str
    tone_name: ToneName

class ToneRequest(BaseModel):
    tone_name: ToneName
    reference_text: str

class SaveDocumentRequest(BaseModel):
    text: str
    tone_name: ToneName
    title: Optional[str] = None
