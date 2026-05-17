'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error Boundary global para el App Router de Next.js.
 * Captura cualquier excepción no manejada en el árbol de componentes
 * y presenta una UI de recuperación en lugar de una pantalla en blanco.
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Aquí podrías integrar un servicio de error tracking como Sentry
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle size={48} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Algo salió mal
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Gema encontró un error inesperado. Tu trabajo no se ha perdido.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-slate-600">
              ID: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg font-medium transition-all"
        >
          <RefreshCw size={16} />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
