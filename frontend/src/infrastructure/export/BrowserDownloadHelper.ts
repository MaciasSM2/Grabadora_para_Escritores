export class BrowserDownloadHelper {
  public static triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('[BrowserDownloadHelper] Error fatal disparando descarga:', err);
    }
  }
}
