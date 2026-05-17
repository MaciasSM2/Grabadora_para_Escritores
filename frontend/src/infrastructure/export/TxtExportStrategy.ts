import { IDocumentExporter } from './IDocumentExporter';
import { BrowserDownloadHelper } from './BrowserDownloadHelper';

export class TxtExportStrategy implements IDocumentExporter {
  export(text: string, filename: string = 'Gema_Documento'): void {
    if (typeof window === 'undefined') return;
    if (!text) {
      console.warn('[TxtExportStrategy] Intento de exportar texto vacío');
      return;
    }
    
    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const blob = new Blob([bytes], { type: 'text/plain;charset=utf-8' });
      BrowserDownloadHelper.triggerDownload(blob, `${filename}.txt`);
    } catch (err) {
      console.error('[TxtExportStrategy] Error:', err);
      throw err;
    }
  }
}
