import { useEffect, useRef, useCallback } from 'react';
import { useDictationStore } from '@/store/useDictationStore';

export const useNativeDictation = () => {
  const { setRecording, setInterimText, addUnprocessedPhrase, isRecording } = useDictationStore();
  const recognitionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("Web Speech API no está soportada en este navegador.");
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES'; // Restricción crítica: Sólo Español

      recognitionRef.current.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          // El espacio extra asegura que las frases no se peguen
          addUnprocessedPhrase(final + ' ');
        }
        setInterimText(interim);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setRecording(false);
        }
      };

      recognitionRef.current.onend = () => {
        // En Android/Chrome, a veces se detiene solo. Podríamos reiniciarlo si isRecording es true,
        // pero por ahora lo mantenemos simple.
        setRecording(false);
      };
    }
  }, [addUnprocessedPhrase, setInterimText, setRecording]);

  const startRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setRecording(true);
      } catch (e) {
        console.warn("Speech recognition ya está iniciado.");
      }
    }
  }, [setRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setRecording(false);
      } catch(e) {
         console.warn("Error al detener", e);
      }
    }
  }, [setRecording]);

  const pauseForTyping = useCallback(() => {
    // Si estaba grabando, lo detenemos temporalmente (debounce 1500ms)
    stopRecording();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      // Reanuda automáticamente tras 1.5s sin teclear
      startRecording();
    }, 1500);
  }, [startRecording, stopRecording]);

  return { startRecording, stopRecording, pauseForTyping };
};
