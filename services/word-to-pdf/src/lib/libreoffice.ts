import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { access } from "node:fs/promises";
import type { Logger } from "../logger.js";
import type { AppConfig } from "../config.js";

export class LibreOfficeError extends Error {
  constructor(
    message: string,
    readonly code: "not_installed" | "timeout" | "conversion_failed" | "no_output"
  ) {
    super(message);
    this.name = "LibreOfficeError";
  }
}

const WINDOWS_CANDIDATES = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveSofficePath(config: AppConfig): Promise<string> {
  if (config.SOFFICE_PATH) {
    if (!(await fileExists(config.SOFFICE_PATH))) {
      throw new LibreOfficeError(
        `LibreOffice not found at SOFFICE_PATH=${config.SOFFICE_PATH}`,
        "not_installed"
      );
    }
    return config.SOFFICE_PATH;
  }

  if (process.platform === "win32") {
    for (const candidate of WINDOWS_CANDIDATES) {
      if (await fileExists(candidate)) return candidate;
    }
    throw new LibreOfficeError(
      "LibreOffice is not installed. Install LibreOffice or set SOFFICE_PATH.",
      "not_installed"
    );
  }

  return "soffice";
}

function toFileUrl(dirPath: string): string {
  const resolved = path.resolve(dirPath).replace(/\\/g, "/");
  if (process.platform === "win32") {
    return `file:///${resolved}`;
  }
  return `file://${resolved}`;
}

type ConversionOptions = {
  inputPath: string;
  outputDir: string;
  profileDir: string;
  config: AppConfig;
  log: Logger;
  convertTo: string;
  outputExtension: string;
  infilter?: string;
};

async function runSofficeConversion(options: ConversionOptions): Promise<string> {
  const { inputPath, outputDir, profileDir, config, log, convertTo, outputExtension, infilter } =
    options;

  const soffice = await resolveSofficePath(config);
  const inputBase = path.basename(inputPath, path.extname(inputPath));
  const expectedOutput = path.join(outputDir, `${inputBase}${outputExtension}`);

  const args = [
    "--headless",
    "--nologo",
    "--nolockcheck",
    "--nodefault",
    "--nofirststartwizard",
    "--norestore",
    `-env:UserInstallation=${toFileUrl(profileDir)}`,
  ];

  if (infilter) {
    args.push(`--infilter=${infilter}`);
  }

  // HIGH FIDELITY: Use advanced PDF export filter
  if (convertTo === "pdf") {
    args.push("--convert-to", "pdf:writer_pdf_Export", "--outdir", outputDir, inputPath);
  } else {
    args.push("--convert-to", convertTo, "--outdir", outputDir, inputPath);
  }

  log.info({ soffice, inputPath, convertTo }, "starting high-fidelity libreoffice conversion");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(soffice, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      if (child.pid) {
        try { process.kill(-child.pid, "SIGKILL"); } catch {}
      }
      reject(new LibreOfficeError(`Conversion timed out after ${config.CONVERSION_TIMEOUT_MS}ms`, "timeout"));
    }, config.CONVERSION_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new LibreOfficeError(`Failed to start LibreOffice: ${error.message}`, "conversion_failed"));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderr.trim() || `exit code ${code}`;
      reject(new LibreOfficeError(`LibreOffice conversion failed: ${detail}`, "conversion_failed"));
    });
  });

  try {
    await fs.access(expectedOutput);
    return expectedOutput;
  } catch {
    const files = await fs.readdir(outputDir);
    const match = files.find((f) => f.toLowerCase().endsWith(outputExtension));
    if (match) return path.join(outputDir, match);
    throw new LibreOfficeError(`LibreOffice did not produce output file.`, "no_output");
  }
}

export async function convertOfficeToPdf(
  inputPath: string,
  outputDir: string,
  profileDir: string,
  config: AppConfig,
  log: Logger
): Promise<string> {
  return runSofficeConversion({
    inputPath,
    outputDir,
    profileDir,
    config,
    log,
    convertTo: "pdf",
    outputExtension: ".pdf",
  });
}

export async function convertPdfToDocx(
  inputPath: string,
  outputDir: string,
  profileDir: string,
  config: AppConfig,
  log: Logger
): Promise<string> {
  return runSofficeConversion({
    inputPath,
    outputDir,
    profileDir,
    config,
    log,
    convertTo: "docx",
    outputExtension: ".docx",
    infilter: "writer_pdf_import",
  });
}

export async function checkLibreOfficeAvailable(config: AppConfig): Promise<boolean> {
  try {
    await resolveSofficePath(config);
    return true;
  } catch {
    return false;
  }
}
