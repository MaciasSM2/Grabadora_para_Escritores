import { useEffect, useRef, useCallback } from 'react';
import { useDictationStore } from '@/store/useDictationStore';
import { BrowserSpeechAdapter } from '@/infrastructure/audio/BrowserSpeechAdapter';
import { ISpeechTranscriber } from '@/infrastructure/audio/ISpeechTranscriber';

export const useCleanDictation = () => {
  const { setRecording, setInterimText, addUnprocessedPhrase } = useDictationStore();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Usando useRef con inicialización lazy en lugar de un Singleton a nivel de módulo.
  // El Singleton de módulo sobrevivía al HMR en desarrollo, causando listeners
  // duplicados y fugas de memoria. Con useRef, el Adapter vive exactamente
  // mientras el componente que consume este hook está montado.
  const transcriberRef = useRef<ISpeechTranscriber | null>(null);
  if (transcriberRef.current === null) {
    transcriberRef.current = new BrowserSpeechAdapter('es-ES');
  }

  useEffect(() => {
    const transcriber = transcriberRef.current!;
    transcriber.subscribe({
      onFinalResult: (text) => addUnprocessedPhrase(text),
      onInterimResult: (text) => setInterimText(text),
      onStatusChange: (status) => setRecording(status),
      onError: (errorType) => {
        switch (errorType) {
          case 'no-speech':
            // 1. Manejo silencioso: El usuario no ha hablado en el intervalo de escucha.
            console.warn('🎙️ [useCleanDictation]: No se detectó voz (timeout).');
            break;
          case 'audio-capture':
            console.error('🎙️ [useCleanDictation]: No se encontró un micrófono.');
            break;
          case 'not-allowed':
            console.error('🎙️ [useCleanDictation]: Permisos de micrófono denegados.');
            break;
          default:
            // Para cualquier otro error inesperado, sí usamos console.error
            console.error(`🎙️ [useCleanDictation] Error no manejado: ${errorType}`);
        }
      }
    });

    return () => transcriber.unsubscribe();
  }, [addUnprocessedPhrase, setInterimText, setRecording]);

  const startRecording = useCallback(() => {
    transcriberRef.current?.start();
  }, []);

  const stopRecording = useCallback(() => {
    transcriberRef.current?.stop();
  }, []);

  const pauseForTyping = useCallback(() => {
    transcriberRef.current?.stop();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Heurística de negocio: Reanudar dictado automáticamente tras 1.5s sin teclear
    typingTimeoutRef.current = setTimeout(() => {
      transcriberRef.current?.start();
    }, 1500);
  }, []);

  return { startRecording, stopRecording, pauseForTyping };
};
