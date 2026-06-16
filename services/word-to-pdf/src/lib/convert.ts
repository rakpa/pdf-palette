import path from "node:path";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import { convertOfficeToPdf } from "./libreoffice.js";
import { validateOfficeFile } from "./office-file-validator.js";
import { validatePdfFile } from "./pdf-validator.js";

export type ConversionResult = {
  outputPath: string;
  pdfFilename: string;
  pageCount: number;
  byteLength: number;
};

export async function runWordToPdfConversion(
  inputPath: string,
  outputDir: string,
  profileDir: string,
  originalName: string,
  config: AppConfig,
  log: Logger
): Promise<ConversionResult> {
  log.info({ inputPath }, "validating office file");

  const validation = await validateOfficeFile(inputPath);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  log.info("running libreoffice headless conversion");

  const pdfPath = await convertOfficeToPdf(
    inputPath,
    outputDir,
    profileDir,
    config,
    log
  );

  const pdfValidation = await validatePdfFile(pdfPath);
  if (!pdfValidation.ok) {
    throw new Error(pdfValidation.message);
  }

  const pdfFilename =
    path.basename(originalName, path.extname(originalName)) + ".pdf";

  log.info(
    { pdfPath, pageCount: pdfValidation.pageCount, bytes: pdfValidation.byteLength },
    "conversion completed"
  );

  return {
    outputPath: pdfPath,
    pdfFilename,
    pageCount: pdfValidation.pageCount,
    byteLength: pdfValidation.byteLength,
  };
}
