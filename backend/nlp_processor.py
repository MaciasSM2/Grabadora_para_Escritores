import spacy
import re
from typing import Optional

class StyleProcessor:
    def __init__(self):
        try:
            self.nlp = spacy.load("es_core_news_sm")
            print("Modelo de spaCy 'es_core_news_sm' cargado correctamente.")
        except OSError:
            print("El modelo de spaCy 'es_core_news_sm' no está instalado. Asegúrate de ejecutar: python -m spacy download es_core_news_sm")
            self.nlp = None

    def process_text(self, text: str, tone_name: str, reference_text: Optional[str] = None) -> str:
        if not self.nlp:
            return text
            
        corrected_text = text

        # 1. Corrección básica de espacios y mayúsculas
        corrected_text = re.sub(r'\s+([.,;:?!])', r'\1', corrected_text) # Eliminar espacios antes de puntuación
        
        if len(corrected_text) > 0:
            corrected_text = corrected_text[0].upper() + corrected_text[1:]

        # 2. Análisis léxico y sugerencias (cero-IA pura heurística)
        muletillas = {}
        suffix = ""
        
        if tone_name == "Narrativa de Ciencia Ficción y Fantasía Épica":
            muletillas = {
                r'\bdijo\b': 'proclamó',
                r'\bfue\b': 'se aventuró',
                r'\bgrande\b': 'colosal',
                r'\bmalo\b': 'perverso',
                r'\bbueno\b': 'legendario',
                r'\bpelearon\b': 'libraron una batalla épica'
            }
            suffix = "\n\n[Estilo Épico Aplicado heurísticamente]"
            
        elif tone_name == "Romance Contemporáneo":
            muletillas = {
                r'\bdijo\b': 'susurró',
                r'\bvio\b': 'contempló con ternura',
                r'\bsintió\b': 'experimentó un latido incontrolable',
                r'\bbonito\b': 'hermoso',
                r'\bbueno\b': 'maravilloso'
            }
            suffix = "\n\n[Estilo Romántico Aplicado heurísticamente]"
            
        elif tone_name == "Misterio y Thriller":
            muletillas = {
                r'\bdijo\b': 'murmuró con sospecha',
                r'\bcaminó\b': 'acechó en las sombras',
                r'\bvio\b': 'vislumbró algo inquietante',
                r'\braro\b': 'perturbador'
            }
            suffix = "\n\n[Estilo Thriller Aplicado heurísticamente]"
            
        elif tone_name == "No Ficción Académica":
            muletillas = {
                r'\byo creo que\b': 'se postula que',
                r'\bdicen que\b': 'estudios recientes indican que',
                r'\bbueno\b': 'óptimo',
                r'\bmalo\b': 'deficiente',
                r'\bhizo\b': 'desarrolló'
            }
            suffix = "\n\n[Estilo Académico Aplicado heurísticamente]"
            
        else:
            muletillas = {
                r'\bbueno\b': 'excelente',
                r'\bmalo\b': 'perjudicial',
                r'\bhacer\b': 'realizar'
            }
            
        for old, new in muletillas.items():
            corrected_text = re.sub(old, new, corrected_text, flags=re.IGNORECASE)
            
        # 3. Incorporar texto de referencia heurísticamente
        if reference_text:
            doc_ref = self.nlp(reference_text)
            # Extraer palabras clave: adjetivos y verbos largos
            palabras_clave = [token.text.lower() for token in doc_ref if token.pos_ in ['ADJ', 'VERB'] and len(token.text) > 6]
            if palabras_clave:
                from collections import Counter
                # Tomar las 5 más comunes
                comunes = [word for word, count in Counter(palabras_clave).most_common(5)]
                suffix += f"\n\n[Vocabulario de Referencia Sugerido: {', '.join(comunes)}]"
            else:
                suffix += "\n\n[Estilo de Referencia Analizado]"
            
        return corrected_text + suffix
