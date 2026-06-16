import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

export type PdfValidationResult =
  | { ok: true; pageCount: number; byteLength: number }
  | { ok: false; message: string };

export async function validatePdfFile(filePath: string): Promise<PdfValidationResult> {
  const bytes = await fs.readFile(filePath);
  if (bytes.byteLength < 128) {
    return { ok: false, message: "Generated PDF is too small to be valid." };
  }

  const header = bytes.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF-")) {
    return { ok: false, message: "Generated file is not a valid PDF (missing %PDF header)." };
  }

  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    if (pageCount < 1) {
      return { ok: false, message: "Generated PDF contains no pages." };
    }
    return { ok: true, pageCount, byteLength: bytes.byteLength };
  } catch {
    return { ok: false, message: "Generated PDF failed structural validation." };
  }
}
