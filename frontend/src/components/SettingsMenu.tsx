'use client';

import React, { useState, useEffect } from 'react';
import { useToneStore } from '@/store/useToneStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useDictationStore } from '@/store/useDictationStore';
import { useUIStore } from '@/store/useUIStore';
import { Settings, X, Upload, History, BookOpen, FileText, File, FileInput, Download } from 'lucide-react';
import * as mammoth from 'mammoth';
import { API_BASE } from '@/lib/api';
import { exportTXT, exportAPACDocx } from '@/utils/exportUtils';

export default function SettingsMenu() {
  const { isSettingsOpen, settingsActiveTab, openSettings, closeSettings, setSettingsTab } = useUIStore();
  
  const { toneName, referenceText, setTone } = useToneStore();
  const { jobs, addJob, savedDocs, fetchHistory, fetchSavedDocs } = useHistoryStore();
  const { documentText, setDocumentText, resetStore } = useDictationStore();

  useEffect(() => {
    if (isSettingsOpen && settingsActiveTab === 'history') {
      fetchHistory();
      fetchSavedDocs();
    }
  }, [isSettingsOpen, settingsActiveTab, fetchHistory, fetchSavedDocs]);

  const [isUploading, setIsUploading] = useState(false);

  const handleToneChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTone(toneName, e.target.value);
  };

  const handleToneNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTone(e.target.value, referenceText);
  };



  const handleToneFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const text = await file.text();
      setTone(toneName, text);
    } else if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setTone(toneName, result.value);
    }
  };

  const handleImportDraft = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let extractedText = '';
    if (file.name.endsWith('.txt')) {
      extractedText = await file.text();
    } else if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    }
    
    if (extractedText) {
      setDocumentText(extractedText);
      setSettingsTab('tone'); // Redirige a configuración de tono tras importar
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // En desarrollo asumimos que el backend está en localhost:8000
      const response = await fetch(`${API_BASE}/api/transcribe/file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.detail || `Error HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Update text
      setDocumentText((documentText ? documentText + '\n\n' : '') + data.transcription);
      
      // Update history
      addJob({
        id: data.job_id?.toString() || Date.now().toString(),
        filename: file.name,
        transcription: data.transcription,
        createdAt: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error al subir audio:', error);
      alert(`Hubo un error al transcribir el archivo:\n${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleActionSavedDoc = async (id: number, action: 'download-txt' | 'download-docx' | 'edit' | 'reprocess', title: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/history/read/${id}`);
      if (res.ok) {
        const data = await res.json();
        const text = data.text;
        
        if (action === 'download-txt') {
          exportTXT(text, title);
        } else if (action === 'download-docx') {
          await exportAPACDocx(text, title);
        } else if (action === 'edit' || action === 'reprocess') {
          setDocumentText(text);
          closeSettings();
        }
      }
    } catch(e) {
      console.error(e);
      alert("Error al procesar el documento del historial");
    }
  };

  return (
    <>
      {/* Botón Global */}
      <button 
        onClick={() => openSettings('tone')}
        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Configuraciones"
      >
        <Settings size={24} />
      </button>

      {/* Overlay del Modal/Drawer */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
          {/* Drawer Panel */}
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
            
            {/* Header del Drawer */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Configuraciones
              </h2>
              <button 
                onClick={closeSettings}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navegación por pestañas */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <button
                onClick={() => setSettingsTab('tone')}
                className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors ${
                  settingsActiveTab === 'tone' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <BookOpen size={16} /> Tono
              </button>

              <button
                onClick={() => setSettingsTab('history')}
                className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors ${
                  settingsActiveTab === 'history' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <History size={16} /> Historial
              </button>
              <button
                onClick={() => setSettingsTab('import')}
                className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors ${
                  settingsActiveTab === 'import' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileInput size={16} /> Importar
              </button>
            </div>

            {/* Contenido de las pestañas */}
            <div className="flex-1 overflow-y-auto p-4">
              
              {/* Sección A: Tono */}
              {settingsActiveTab === 'tone' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tono Base
                    </label>
                    <select 
                      value={toneName}
                      onChange={handleToneNameChange}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    >
                      <option value="Narrativa de Ciencia Ficción y Fantasía Épica">Fantasía / Ciencia Ficción</option>
                      <option value="Romance Contemporáneo">Romance Contemporáneo</option>
                      <option value="Misterio y Thriller">Misterio y Thriller</option>
                      <option value="No Ficción Académica">No Ficción Académica</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Texto de Referencia
                    </label>
                    <textarea 
                      value={referenceText}
                      onChange={handleToneChange}
                      rows={6}
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Pega aquí un fragmento de texto que ejemplifique el tono que deseas..."
                    />
                  </div>

                  <div className="mt-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subir Documento de Referencia (TXT, DOCX, PDF)
                    </label>
                    <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <Upload className="text-slate-400 mb-2" size={24} />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Haz clic o arrastra un archivo aquí para extraer su estilo
                      </p>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".txt,.docx" 
                        onChange={handleToneFileUpload}
                      />
                    </label>
                  </div>
                </div>
              )}



              {/* Sección C: Historial y Subida */}
              {settingsActiveTab === 'history' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Subir Audio para Transcripción</h3>
                    <label className={`border-2 border-dashed border-blue-300 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="text-blue-500 mb-2" size={24} />
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                        {isUploading ? 'Transcribiendo...' : 'Subir archivo de audio'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        MP3, OPUS, OGG, WAV
                      </p>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="audio/*" 
                        onChange={handleAudioUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                      Documentos Guardados
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-1 rounded-full">
                        {savedDocs.length}
                      </span>
                    </h3>
                    
                    {savedDocs.length === 0 ? (
                      <div className="text-center p-6 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={32} />
                        <p className="text-sm text-slate-500">No hay documentos guardados.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {savedDocs.map((doc) => (
                          <div key={doc.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-green-300 dark:hover:border-green-700 transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                {doc.title}
                              </p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                              {doc.excerpt}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button 
                                onClick={() => handleActionSavedDoc(doc.id, 'download-txt', doc.title)} 
                                className="text-[10px] flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300 transition-colors"
                                title="Descargar como Texto Plano"
                              >
                                <FileText size={12} className="text-blue-500" />
                                TXT
                              </button>
                              <button 
                                onClick={() => handleActionSavedDoc(doc.id, 'download-docx', doc.title)} 
                                className="text-[10px] flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300 transition-colors"
                                title="Descargar como Word APA"
                              >
                                <FileText size={12} className="text-indigo-500" />
                                DOCX
                              </button>
                              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 my-auto" />
                              <button onClick={() => handleActionSavedDoc(doc.id, 'edit', doc.title)} className="text-[10px] bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 px-2 py-1 rounded text-blue-700 dark:text-blue-300 transition-colors font-medium">
                                Abrir
                              </button>
                              <button onClick={() => handleActionSavedDoc(doc.id, 'reprocess', doc.title)} className="text-[10px] bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800 px-2 py-1 rounded text-purple-700 dark:text-purple-300 transition-colors font-medium">
                                Revisar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                      Trabajos de Audio (Transmisiones)
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-1 rounded-full">
                        {jobs.length}
                      </span>
                    </h3>
                    
                    {jobs.length === 0 ? (
                      <div className="text-center p-6 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <History className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={32} />
                        <p className="text-sm text-slate-500">No hay audios transcritos.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {jobs.map((job) => (
                          <div key={job.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                {job.filename}
                              </p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {new Date(job.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {job.transcription}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sección D: Importar */}
              {settingsActiveTab === 'import' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Sube un borrador (.txt o .docx) para continuar trabajando. Esto sobrescribirá el texto actual en la mesa de dictado.
                  </p>
                  
                  <div className="mt-2">
                    <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <FileInput className="text-slate-400 mb-2" size={24} />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Haz clic o arrastra un archivo aquí (.txt, .docx)
                      </p>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".txt,.docx" 
                        onChange={handleImportDraft}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
