import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { IDocumentExporter } from './IDocumentExporter';
import { BrowserDownloadHelper } from './BrowserDownloadHelper';

export class DocxExportStrategy implements IDocumentExporter {
  async export(text: string, filename: string = 'Gema_Documento_APA'): Promise<void> {
    if (typeof window === 'undefined' || !text) return;

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
      BrowserDownloadHelper.triggerDownload(blob, `${filename}.docx`);
    } catch (err) {
      console.error('[DocxExportStrategy] Error al empaquetar DOCX:', err);
      throw err;
    }
  }
}
