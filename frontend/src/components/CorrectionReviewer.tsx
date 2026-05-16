'use client';
import React, { useState, useEffect, useRef } from 'react';
import { diffWords } from 'diff';
import {
  Check, X as XIcon, ArrowLeft, CheckCircle2,
  Download, FileText, File as FileIcon, ChevronDown,
  Sparkles, Loader2,
} from 'lucide-react';
import { useDictationStore } from '@/store/useDictationStore';
import { useToneStore } from '@/store/useToneStore';
import { useUIStore } from '@/store/useUIStore';
import { exportTXT, exportPDF, exportAPACDocx } from '@/utils/exportUtils';
import { API_BASE } from '@/lib/api';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type ChunkStatus = 'pending' | 'accepted' | 'rejected';

interface DiffChunk {
  id: string;
  value: string;
  added?: boolean;
  removed?: boolean;
  status: ChunkStatus;
}

// ─── Sub-componente: Tooltip de acción ──────────────────────────────────────

interface ActionTooltipProps {
  chunkId: string;
  isAdded: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function ActionTooltip({ isAdded, onAccept, onReject }: ActionTooltipProps) {
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-2xl px-1 py-1 border border-slate-700 dark:border-slate-600 whitespace-nowrap">
        <button
          onClick={onAccept}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-green-700 transition-colors text-green-300"
          title={isAdded ? 'Aceptar sugerencia' : 'Aceptar eliminación'}
        >
          <Check size={11} strokeWidth={2.5} />
          {isAdded ? 'Aceptar' : 'Eliminar'}
        </button>
        <div className="w-px h-4 bg-slate-600" />
        <button
          onClick={onReject}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-600 transition-colors text-slate-300"
          title="Mantener original"
        >
          <XIcon size={11} strokeWidth={2.5} />
          Mantener
        </button>
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-slate-700" />
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface CorrectionReviewerProps {
  rawText: string;
  toneName: string;
}

export default function CorrectionReviewer({ rawText, toneName }: CorrectionReviewerProps) {
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chunks, setChunks] = useState<DiffChunk[]>([]);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { setDocumentText } = useDictationStore();
  const { setCurrentView } = useUIStore();
  const exportRef = useRef<HTMLDivElement>(null);

  // Cerrar tooltip al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (activeTooltipId) setActiveTooltipId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeTooltipId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Calcular diff cuando llega el texto corregido
  useEffect(() => {
    if (rawText && correctedText) {
      const diffResult = diffWords(rawText, correctedText);
      const initialChunks: DiffChunk[] = diffResult.map((change, index) => ({
        id: `chunk-${index}-${Date.now()}`,
        value: change.value,
        added: change.added,
        removed: change.removed,
        status: 'pending',
      }));
      setChunks(initialChunks);
    }
  }, [rawText, correctedText]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!rawText) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: rawText,
          tone_name: toneName || 'Narrativa de Ciencia Ficción y Fantasía Épica',
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCorrectedText(data.corrected_text);
    } catch (e) {
      console.error('[handleProcess]', e);
      setToast('Error al conectar con el backend. ¿Está corriendo uvicorn?');
    } finally {
      setIsLoading(false);
    }
  };

  const updateChunkStatus = (id: string, newStatus: ChunkStatus) => {
    setChunks((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    setActiveTooltipId(null);
  };

  const acceptAllChanges = () => {
    setChunks((prev) => prev.map((c) => ({ ...c, status: 'accepted' })));
    setToast('Todos los cambios aceptados.');
  };

  const buildFinalText = (chunkList: DiffChunk[]): string => {
    return chunkList
      .map((chunk) => {
        if (!chunk.added && !chunk.removed) return chunk.value;
        const effectiveStatus = chunk.status === 'pending' ? 'rejected' : chunk.status;
        if (chunk.removed && effectiveStatus === 'rejected') return chunk.value;
        if (chunk.added && effectiveStatus === 'accepted') return chunk.value;
        return '';
      })
      .join('');
  };

  const handleSaveAndReturn = () => {
    const finalText = buildFinalText(chunks);
    setDocumentText(finalText);
    setCurrentView('dictation');
  };

  const handleRejectAllAndReturn = () => {
    setCurrentView('dictation');
  };

  // ── Export helpers ────────────────────────────────────────────────────────

  const getExportText = (): string => {
    if (chunks.length > 0) return buildFinalText(chunks);
    return correctedText ?? rawText;
  };

  const handleExport = async (format: 'txt' | 'docx' | 'pdf') => {
    const text = getExportText();
    if (!text) {
      setToast('No hay contenido para exportar.');
      return;
    }
    setIsExportOpen(false);
    try {
      if (format === 'txt') exportTXT(text);
      else if (format === 'pdf') exportPDF(text);
      else await exportAPACDocx(text);
      setToast('Archivo descargado con éxito.');
    } catch (e) {
      setToast('Error al generar el archivo de exportación.');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const pendingCount = chunks.filter(
    (c) => c.status === 'pending' && (c.added || c.removed)
  ).length;

  return (
    <div className="flex flex-col h-full">

      {/* ── Barra superior de la vista revisión ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        {/* Izquierda: volver */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRejectAllAndReturn}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Volver al borrador sin guardar cambios"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Control de Cambios
            </h2>
            <p className="text-xs text-slate-400">
              Tono:{' '}
              <span className="text-purple-500 dark:text-purple-400 font-medium">
                {toneName}
              </span>
              {pendingCount > 0 && (
                <span className="ml-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-2">
          {/* Botón principal: Aplicar o Guardar */}
          {!correctedText ? (
            <button
              onClick={handleProcess}
              disabled={isLoading || !rawText}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 shadow-sm text-sm"
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Analizando...</>
              ) : (
                <><Sparkles size={16} /> Aplicar Estilo Literario</>
              )}
            </button>
          ) : (
            <button
              onClick={handleSaveAndReturn}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm text-sm"
            >
              <Check size={16} /> Guardar en Borrador
            </button>
          )}

          {/* Dropdown Exportar */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={!rawText}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium disabled:opacity-50 shadow-sm text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown size={14} className={`transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button onClick={() => handleExport('txt')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors">
                    <FileText size={15} className="text-blue-500" /> Texto Plano (.txt)
                  </button>
                  <button onClick={() => handleExport('docx')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors">
                    <FileText size={15} className="text-indigo-600" /> Word APA (.docx)
                  </button>
                  <div className="mx-3 border-t border-slate-100 dark:border-slate-700" />
                  <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors">
                    <FileIcon size={15} className="text-red-500" /> Documento (.pdf)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Cuerpo: Hoja de papel editorial ── */}
      <div className="flex-1 flex flex-col overflow-auto">
        {correctedText ? (
          // Vista Track Changes — documento unificado centrado
          <div className="flex justify-center w-full">
            <div
              className="w-full max-w-3xl bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800 px-12 py-14 min-h-[60vh] font-serif"
              onClick={() => setActiveTooltipId(null)}
            >
              {/* Indicador de tono */}
              <p className="text-[11px] uppercase tracking-widest text-slate-300 dark:text-slate-600 mb-8 text-center font-sans">
                ✦ Revisión de Estilo · {toneName} ✦
              </p>

              {/* Texto con control de cambios inline */}
              <div className="text-[17px] leading-[1.9] text-slate-800 dark:text-slate-200 text-justify">
                {chunks.map((chunk) => {
                  // Texto sin cambios → renderizar normal
                  if (!chunk.added && !chunk.removed) {
                    return (
                      <span key={chunk.id} className="whitespace-pre-wrap">
                        {chunk.value}
                      </span>
                    );
                  }

                  const isActive = activeTooltipId === chunk.id;
                  const isPending = chunk.status === 'pending';

                  // Texto ELIMINADO (original que se reemplazará)
                  if (chunk.removed) {
                    if (chunk.status === 'accepted') return null; // Eliminado: ocultarlo

                    return (
                      <span key={chunk.id} className="relative inline" style={{ zIndex: isActive ? 100 : 'auto' }}>
                        <del
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPending) setActiveTooltipId(isActive ? null : chunk.id);
                            else updateChunkStatus(chunk.id, 'pending');
                          }}
                          className={`
                            cursor-pointer whitespace-pre-wrap no-underline transition-all duration-150 rounded-sm px-0.5
                            ${isPending
                              ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 decoration-red-400 underline decoration-dashed underline-offset-2'
                              : 'text-slate-700 dark:text-slate-300 no-underline bg-transparent' // Rechazado → texto normal sin tachar
                            }
                          `}
                          title={isPending ? 'Clic para decidir' : 'Restaurado'}
                        >
                          {chunk.value}
                        </del>
                        {isActive && isPending && (
                          <ActionTooltip
                            chunkId={chunk.id}
                            isAdded={false}
                            onAccept={() => updateChunkStatus(chunk.id, 'accepted')}
                            onReject={() => updateChunkStatus(chunk.id, 'rejected')}
                          />
                        )}
                      </span>
                    );
                  }

                  // Texto AÑADIDO (sugerencia del NLP)
                  if (chunk.added) {
                    if (chunk.status === 'rejected') return null; // Rechazado: no mostrarlo

                    return (
                      <span key={chunk.id} className="relative inline" style={{ zIndex: isActive ? 100 : 'auto' }}>
                        <ins
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPending) setActiveTooltipId(isActive ? null : chunk.id);
                            else updateChunkStatus(chunk.id, 'pending');
                          }}
                          className={`
                            cursor-pointer whitespace-pre-wrap transition-all duration-150 rounded-sm px-0.5
                            ${isPending
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 underline decoration-emerald-400 underline-offset-2'
                              : 'text-slate-800 dark:text-slate-200 no-underline bg-transparent' // Aceptado → texto normal
                            }
                          `}
                          title={isPending ? 'Clic para decidir' : 'Aceptado'}
                          style={{ textDecoration: chunk.status === 'accepted' ? 'none' : undefined }}
                        >
                          {chunk.value}
                        </ins>
                        {isActive && isPending && (
                          <ActionTooltip
                            chunkId={chunk.id}
                            isAdded={true}
                            onAccept={() => updateChunkStatus(chunk.id, 'accepted')}
                            onReject={() => updateChunkStatus(chunk.id, 'rejected')}
                          />
                        )}
                      </span>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        ) : (
          // Estado inicial — sin texto procesado todavía
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Sparkles size={36} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                Mesa de Revisión Lista
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 leading-relaxed">
                Haz clic en <strong>Aplicar Estilo Literario</strong> para que el motor NLP analice
                tu texto y proponga sugerencias de estilo según el tono seleccionado.
              </p>
              <button
                onClick={handleProcess}
                disabled={isLoading || !rawText}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 shadow-md"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Analizando texto...</>
                ) : (
                  <><Sparkles size={18} /> Aplicar Estilo Literario</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAB: Aceptar todos (solo cuando hay chunks pendientes) ── */}
      {correctedText && pendingCount > 0 && (
        <button
          onClick={acceptAllChanges}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full shadow-2xl hover:scale-105 transition-transform font-medium text-sm z-30"
        >
          <CheckCircle2 size={18} />
          Aceptar todos ({pendingCount})
        </button>
      )}

      {/* ── Toast de notificación ── */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-full shadow-2xl text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
