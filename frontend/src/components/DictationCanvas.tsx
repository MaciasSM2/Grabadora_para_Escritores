'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useDictationStore } from '@/store/useDictationStore';
import { useNativeDictation } from '@/hooks/useNativeDictation';
import { Mic, MicOff, Square, Play } from 'lucide-react';

export default function DictationCanvas() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { unprocessedPhrase, clearUnprocessedPhrase, interimText, isRecording } = useDictationStore();
  const { startRecording, stopRecording, pauseForTyping } = useNativeDictation();

  // Sincronización del Cursor con texto dictado
  useEffect(() => {
    if (unprocessedPhrase && textareaRef.current) {
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      
      const newText = text.substring(0, start) + unprocessedPhrase + text.substring(end);
      setText(newText);
      clearUnprocessedPhrase();
      
      // Mover el cursor después de que React actualice el DOM
      setTimeout(() => {
        el.selectionStart = start + unprocessedPhrase.length;
        el.selectionEnd = start + unprocessedPhrase.length;
        el.focus();
      }, 10);
    }
  }, [unprocessedPhrase, text, clearUnprocessedPhrase]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Excluir teclas de navegación para no pausar si el usuario solo se mueve
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      pauseForTyping();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
      {/* Controles Flotantes */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
          Mesa de Dictado
        </h2>
        <div className="flex gap-2">
          {isRecording ? (
            <button 
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors font-medium"
            >
              <MicOff size={18} /> Pausar
            </button>
          ) : (
            <button 
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              <Mic size={18} /> Iniciar Dictado
            </button>
          )}
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-colors font-medium ml-2"
          >
            <Square size={18} /> Finalizar y Revisar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-grow h-full min-h-[400px]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-serif"
          placeholder="Comienza a dictar o escribir aquí tu novela..."
        />
        
        {/* Interim Text Preview Overlay */}
        {interimText && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-md shadow border border-blue-200 dark:border-blue-800 pointer-events-none">
            <span className="text-blue-500 font-medium italic animate-pulse">
              {interimText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
