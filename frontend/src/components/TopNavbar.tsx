'use client';
import React, { useState, useEffect } from 'react';
import { Download, FileText, File as FileIcon, Save, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDictationStore } from '@/store/useDictationStore';
import { useToneStore } from '@/store/useToneStore';
import { exportService, ExportFormat } from '@/infrastructure/export/ExportService';
import { documentApiService } from '@/infrastructure/api/DocumentApiService';
import SettingsMenu from './SettingsMenu';

type ToastType = 'success' | 'error';

interface Toast {
  message: string;
  type: ToastType;
}

export default function TopNavbar() {
  const { documentText, resetStore } = useDictationStore();
  const { toneName } = useToneStore();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const handleSaveDraft = async () => {
    if (!documentText) return;
    setIsSaving(true);
    const success = await documentApiService.saveDocument(documentText, toneName);
    setIsSaving(false);
    if (success) {
      resetStore();
      showToast('Borrador guardado. El lienzo ha sido limpiado.', 'success');
    } else {
      showToast('Error al guardar. ¿Está corriendo el backend?', 'error');
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!documentText) {
      showToast('No hay texto para exportar.', 'error');
      return;
    }
    setIsExportMenuOpen(false);
    try {
      await exportService.exportDocument(format, documentText);
      showToast('Archivo descargado con éxito.', 'success');
    } catch (e) {
      showToast('Error al generar el archivo.', 'error');
    }
  };

  return (
    <>
      <header className="flex items-center justify-between w-full mb-6">
        {/* Logo */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 leading-tight">
            <span className="text-blue-600">Gema</span>
            <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
            <span className="text-slate-500 dark:text-slate-400 font-light text-lg hidden sm:inline">
              Estación Literaria
            </span>
          </h1>
          {/* Indicador del tono activo */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans mt-0.5 hidden sm:block">
            Tono:{' '}
            <span className="text-purple-500 dark:text-purple-400 font-medium">
              {toneName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Guardar Nuevo Borrador */}
          <button
            onClick={handleSaveDraft}
            disabled={!documentText || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-lg transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-sm text-sm"
            title="Guardar en historial y limpiar lienzo"
          >
            <Save size={16} />
            <span className="hidden sm:inline">
              {isSaving ? 'Guardando...' : 'Guardar Borrador'}
            </span>
          </button>

          {/* Dropdown de Exportación */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={!documentText}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 rounded-lg transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-sm text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isExportMenuOpen && (
              <>
                {/* Backdrop para cerrar */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-sans">
                      Formato de descarga
                    </p>
                  </div>
                  <button
                    onClick={() => handleExport('txt')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <FileText size={15} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Texto Plano</p>
                      <p className="text-[10px] text-slate-400">.txt — sin formato</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <FileText size={15} className="text-indigo-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Word APA</p>
                      <p className="text-[10px] text-slate-400">.docx — doble espacio, 12pt</p>
                    </div>
                  </button>
                  <div className="mx-3 border-t border-slate-100 dark:border-slate-700 my-1" />
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <FileIcon size={15} className="text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium">PDF</p>
                      <p className="text-[10px] text-slate-400">.pdf — márgenes A4</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Menú de Ajustes / Historial */}
          <SettingsMenu />
        </div>
      </header>

      {/* ── Toast no-bloqueante ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium text-white animate-in slide-in-from-top-2 fade-in duration-300
            ${toast.type === 'success'
              ? 'bg-green-600'
              : 'bg-red-600'
            }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}
