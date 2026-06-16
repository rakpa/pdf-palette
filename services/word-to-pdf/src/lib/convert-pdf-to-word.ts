import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import { convertPdfToDocxLayoutPreserving } from "./pdf-to-docx-engine.js";
import { validatePdfFile } from "./pdf-file-validator.js";
import { validateOfficeFile } from "./office-file-validator.js";

export type PdfToWordResult = {
  outputPath: string;
  docxFilename: string;
  pageCount: number;
  byteLength: number;
};

export async function runPdfToWordConversion(
  inputPath: string,
  outputDir: string,
  _profileDir: string,
  originalName: string,
  config: AppConfig,
  log: Logger
): Promise<PdfToWordResult> {
  log.info({ inputPath }, "validating pdf file");

  const validation = await validatePdfFile(inputPath);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const baseName = path.basename(originalName, path.extname(originalName)) || "document";
  const docxPath = path.join(outputDir, `${baseName}.docx`);

  log.info("running layout-preserving pdf2docx reconstruction");

  const result = await convertPdfToDocxLayoutPreserving(
    inputPath,
    docxPath,
    config,
    log
  );

  const docxValidation = await validateOfficeFile(result.outputPath);
  if (!docxValidation.ok) {
    throw new Error(docxValidation.message);
  }

  const bytes = await fs.readFile(result.outputPath);

  log.info(
    {
      docxPath: result.outputPath,
      pageCount: result.pageCount,
      bytes: bytes.byteLength,
      pdfImages: result.pdfImageCount,
      docxImages: result.docxImageCount,
      tables: result.docxTableCount,
      ocrUsed: result.ocrUsed,
      validationPassed: result.validationPassed,
      textCoverage: result.textCoverage,
      imageFallbackPages: result.imageFallbackPages,
    },
    "pdf to word conversion completed"
  );

  return {
    outputPath: result.outputPath,
    docxFilename: `${baseName}.docx`,
    pageCount: validation.pageCount,
    byteLength: bytes.byteLength,
  };
}
