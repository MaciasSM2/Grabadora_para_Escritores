import jsPDF from 'jspdf';
import { IDocumentExporter } from './IDocumentExporter';

export class PdfExportStrategy implements IDocumentExporter {
  async export(text: string, filename: string = 'Gema_Documento'): Promise<void> {
    if (typeof window === 'undefined' || !text) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    const marginLeft = 25;
    const marginTop = 25;
    // A4 = 297mm de alto. Con marginBottom = 265, el margen inferior es ~32mm,
    // simétrico al marginTop de 25mm. El valor anterior (270) era demasiado justo.
    const marginBottom = 265;
    const maxWidth = 160;
    const lineHeight = 7;

    let y = marginTop;

    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      if (para.trim() === '') {
        y += lineHeight * 0.5;
        continue;
      }
      const lines: string[] = doc.splitTextToSize(para, maxWidth);
      for (const line of lines) {
        if (y >= marginBottom) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(line, marginLeft, y);
        y += lineHeight;
      }
      y += lineHeight * 0.4;
    }

    doc.save(`${filename}.pdf`);
  }
}
