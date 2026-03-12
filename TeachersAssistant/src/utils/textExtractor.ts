// ============================================================================
// Text Extractor — Extraction texte depuis fichiers PDF / DOCX
// ============================================================================

/**
 * Extract text content from a File object.
 * Returns null if extraction fails or file is an image/scan.
 */
export async function extractTextFromFile(file: File, ext: string): Promise<string | null> {
  if (ext === 'pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const arrayBuf = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuf) }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const tc = await page.getTextContent();
        pages.push(tc.items.map((item: any) => item.str).join(' '));
      }
      return pages.join('\n').trim() || null;
    } catch {
      return null; // PDF scan — no text layer
    }
  }

  if (ext === 'docx') {
    try {
      const mammoth = await import('mammoth');
      const arrayBuf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuf });
      return result.value.trim() || null;
    } catch {
      return null;
    }
  }

  if (ext === 'txt' || ext === 'md') {
    try {
      const text = await file.text();
      return text.trim() || null;
    } catch {
      return null;
    }
  }

  return null;
}
