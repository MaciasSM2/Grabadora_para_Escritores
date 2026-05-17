import { IDocumentExporter } from './IDocumentExporter';
import { TxtExportStrategy } from './TxtExportStrategy';
import { PdfExportStrategy } from './PdfExportStrategy';
import { DocxExportStrategy } from './DocxExportStrategy';

export type ExportFormat = 'txt' | 'pdf' | 'docx';

export class ExportService {
  private strategies: Record<ExportFormat, IDocumentExporter>;

  constructor() {
    this.strategies = {
      txt: new TxtExportStrategy(),
      pdf: new PdfExportStrategy(),
      docx: new DocxExportStrategy()
    };
  }

  public async exportDocument(format: ExportFormat, text: string, filename?: string): Promise<void> {
    const strategy = this.strategies[format];
    if (!strategy) {
      throw new Error(`[ExportService] Formato no soportado: ${format}`);
    }
    await strategy.export(text, filename);
  }
}

// Exportamos un Singleton para uso fácil en los componentes,
// en una arquitectura real podría venir de un contenedor DI.
export const exportService = new ExportService();
