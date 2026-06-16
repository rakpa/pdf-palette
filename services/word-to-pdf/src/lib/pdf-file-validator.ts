import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

export type PdfValidationResult =
  | { ok: true; pageCount: number; byteLength: number }
  | { ok: false; code: "encrypted" | "corrupted" | "unsupported"; message: string };

export async function validatePdfFile(filePath: string): Promise<PdfValidationResult> {
  const bytes = await fs.readFile(filePath);
  if (bytes.byteLength < 128) {
    return {
      ok: false,
      code: "corrupted",
      message: "The PDF file is too small or empty.",
    };
  }

  const header = bytes.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF-")) {
    return {
      ok: false,
      code: "unsupported",
      message: "Only valid PDF files are supported.",
    };
  }

  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const pageCount = doc.getPageCount();
    if (pageCount < 1) {
      return {
        ok: false,
        code: "corrupted",
        message: "The PDF contains no pages.",
      };
    }
    return { ok: true, pageCount, byteLength: bytes.byteLength };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: "encrypted",
        message: "This PDF is password-protected. Remove the password and try again.",
      };
    }
    return {
      ok: false,
      code: "corrupted",
      message: "The PDF file appears corrupted or cannot be read.",
    };
  }
}
