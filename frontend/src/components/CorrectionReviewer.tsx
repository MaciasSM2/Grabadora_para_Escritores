'use client';
import React, { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

interface CorrectionReviewerProps {
  rawText: string;
  toneName: string;
}

export default function CorrectionReviewer({ rawText, toneName }: CorrectionReviewerProps) {
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = async () => {
    setIsLoading(true);
    try {
      // Simulación de llamada al backend para evitar latencia de red en dev
      setTimeout(() => {
        let simulated = rawText.replace(/ bueno /g, " excelente ").replace(/ muy /g, " extremadamente ");
        if (toneName) {
           simulated += "\n\n[Procesamiento heurístico aplicado basado en: " + toneName + "]";
        }
        setCorrectedText(simulated);
        setIsLoading(false);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const exportPDF = () => {
    if (!correctedText) return;
    const doc = new jsPDF();
    doc.text(correctedText, 10, 10);
    doc.save('Gema_Documento.pdf');
  };

  const exportTXT = () => {
    if (!correctedText) return;
    const blob = new Blob([correctedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Gema_Documento.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Mesa de Revisión Literaria</h2>
        <div className="flex gap-2">
          {!correctedText ? (
            <button 
              onClick={handleProcess} 
              disabled={isLoading || !rawText} 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : 'Aplicar Estilo Literario'}
            </button>
          ) : (
            <>
               <button onClick={exportTXT} className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium">
                 <Download size={18} /> TXT
               </button>
               <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium">
                 <Download size={18} /> PDF
               </button>
            </>
          )}
        </div>
      </div>
      
      {correctedText ? (
        <div className="flex-grow overflow-auto border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-950">
          <ReactDiffViewer 
            oldValue={rawText} 
            newValue={correctedText} 
            splitView={true} 
            useDarkTheme={true}
            leftTitle="Texto Crudo (Dictado)"
            rightTitle={`Revisión (${toneName})`}
          />
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500">
          Haz clic en "Aplicar Estilo Literario" para generar las diferencias.
        </div>
      )}
    </div>
  );
}
