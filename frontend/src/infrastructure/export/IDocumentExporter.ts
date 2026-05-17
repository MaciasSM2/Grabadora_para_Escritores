export interface IDocumentExporter {
  export(text: string, filename?: string): Promise<void> | void;
}
