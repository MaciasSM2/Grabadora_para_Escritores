import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { API_BASE } from '@/lib/api';

// Guardia SSR: Next.js ejecuta código en servidor donde `document` no existe
const isBrowser = typeof window !== 'undefined';

/**
 * Dispara la descarga de un Blob en el navegador de forma robusta.
 * Centraliza el patrón anchor-click para que todos los exportadores lo usen igual.
 */
function triggerDownload(blob: Blob, filename: string): void {
  if (!isBrowser) return;
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    // Aumentamos el delay a 1s para mayor compatibilidad con navegadores lentos
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('[triggerDownload] Error fatal disparando descarga:', err);
  }
}

// ─── TXT ────────────────────────────────────────────────────────────────────

export const exportTXT = (text: string, filename: string = 'Gema_Documento'): void => {
  if (!isBrowser) return;
  if (!text) {
    console.warn('[exportTXT] Intento de exportar texto vacío');
    return;
  }
  
  try {
    // TextEncoder garantiza que el Blob tenga UTF-8 correcto con acentos y ñ
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const blob = new Blob([bytes], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${filename}.txt`);
  } catch (err) {
    console.error('[exportTXT] Error:', err);
    throw err;
  }
};

// ─── PDF ────────────────────────────────────────────────────────────────────

export const exportPDF = (text: string, filename: string = 'Gema_Documento'): void => {
  if (!isBrowser || !text) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('times', 'normal');
  doc.setFontSize(12);

  const marginLeft = 25;   // 25mm ≈ 1 pulgada
  const marginTop = 25;
  const marginBottom = 270; // A4 = 297mm → 297 - 25 = 272mm, dejamos margen
  const maxWidth = 160;     // A4 ancho = 210mm, margen izq+der = 50mm → 160mm útiles
  const lineHeight = 7;     // mm por línea a 12pt

  let y = marginTop;

  // Dividir por párrafos explícitos primero
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    if (para.trim() === '') {
      y += lineHeight * 0.5; // Espacio de párrafo vacío
      continue;
    }
    // splitTextToSize devuelve un array de strings que caben en maxWidth
    const lines: string[] = doc.splitTextToSize(para, maxWidth);
    for (const line of lines) {
      if (y >= marginBottom) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(line, marginLeft, y);
      y += lineHeight;
    }
    y += lineHeight * 0.4; // Espacio entre párrafos
  }

  doc.save(`${filename}.pdf`);
};

// ─── DOCX (APA) ─────────────────────────────────────────────────────────────

export const exportAPACDocx = async (
  text: string,
  filename: string = 'Gema_Documento_APA'
): Promise<void> => {
  if (!isBrowser || !text) return;

  const paragraphStrings = text.split(/\n+/).filter((p) => p.trim() !== '');

  const docxParagraphs = paragraphStrings.map(
    (pText) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: pText,
            font: 'Times New Roman',
            size: 24, // 12pt en half-points
          }),
        ],
        indent: {
          firstLine: 720, // 0.5 pulgadas (1440 twips = 1 pulgada)
        },
        spacing: {
          line: 480,  // Doble espacio
          after: 0,
        },
      })
  );

  const docxDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 pulgada
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docxParagraphs,
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(docxDoc);
    triggerDownload(blob, `${filename}.docx`);
  } catch (err) {
    console.error('[exportAPACDocx] Error al empaquetar DOCX:', err);
    throw err;
  }
};

// ─── Guardar en historial del backend ────────────────────────────────────────

export const saveNewDocument = async (
  text: string,
  toneName: string,
  resetStore: () => void
): Promise<boolean> => {
  if (!text) return false;
  try {
    const title = `Documento_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}`;
    const response = await fetch(`${API_BASE}/api/history/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, tone_name: toneName, title }),
    });
    if (response.ok) {
      resetStore();
      return true;
    }
    const errorData = await response.json().catch(() => null);
    console.error('[saveNewDocument] Backend error:', errorData);
  } catch (e) {
    console.error('[saveNewDocument] Network error:', e);
  }
  return false;
};
