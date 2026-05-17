import asyncio
import logging
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

# Importamos las funciones del worker para evitar problemas de pickling
from .vosk_worker import _init_worker, sync_vosk_transcription

logger = logging.getLogger("gema-services")

# ThreadPoolExecutor dedicado para FFmpeg.
# FFmpeg es I/O bound (lectura/escritura de archivos de audio), por lo que
# un ThreadPoolExecutor es suficiente y no sufre del GIL. Esta estrategia
# también resuelve el NotImplementedError de asyncio.create_subprocess_exec
# en Windows con SelectorEventLoop (el default en Python 3.12+).
_ffmpeg_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ffmpeg")


def _run_ffmpeg_sync(input_path: str, output_path: str) -> None:
    """
    Ejecuta FFmpeg de forma síncrona. Esta función corre en un thread separado
    para no bloquear el Event Loop de asyncio.
    """
    result = subprocess.run(
        ['ffmpeg', '-y', '-i', input_path, '-ar', '16000', '-ac', '1', output_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        logger.error(f"FFmpeg conversion failed: {result.stderr.strip()}")
        raise RuntimeError(f"Error en FFmpeg: {result.stderr.strip()}")
    logger.debug("FFmpeg conversion successful")


async def convert_audio_async(input_path: str, output_path: str) -> None:
    """
    Convierte el audio a WAV 16kHz mono usando FFmpeg.
    Delega la ejecución al ThreadPoolExecutor para no bloquear el Event Loop.
    Compatible con Windows SelectorEventLoop (Python 3.12+).
    """
    logger.debug(f"Converting {input_path} to {output_path}")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(_ffmpeg_executor, _run_ffmpeg_sync, input_path, output_path)

class TranscriptionService:
    def __init__(self, model_path: str = "model_es"):
        # Configuramos ProcessPoolExecutor en lugar de ThreadPoolExecutor.
        # Vosk es intensivo en CPU, por lo que separar el proceso previene bloqueos por el GIL.
        # initializer carga el modelo de Vosk en cada proceso hijo una sola vez.
        self.executor = ProcessPoolExecutor(
            max_workers=2, 
            initializer=_init_worker, 
            initargs=(model_path,)
        )
        logger.info("TranscriptionService initialized with ProcessPoolExecutor")

    async def process_audio(self, temp_file_path: str, wav_path: str) -> str:
        """
        Orquesta el procesamiento de audio: conversión asíncrona y transcripción en worker.
        """
        # 1. Convertir audio a WAV (Async, I/O Bound)
        await convert_audio_async(temp_file_path, wav_path)
        
        # 2. Transcribir (En Executor de Procesos, CPU Bound)
        loop = asyncio.get_running_loop()
        transcript = await loop.run_in_executor(self.executor, sync_vosk_transcription, wav_path)
        
        return transcript

    def shutdown(self):
        """Apaga el executor de forma segura"""
        self.executor.shutdown(wait=True)
