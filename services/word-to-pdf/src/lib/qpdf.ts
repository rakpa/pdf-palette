import { spawn } from "node:child_process";
import type { AppConfig } from "../config.js";

export class QpdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QpdfError";
  }
}

function cleanStderr(stderr: string): string {
  return stderr
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-12)
    .join("\n");
}

export async function runQpdf(
  config: AppConfig,
  args: string[],
  options: { timeoutMs: number }
): Promise<void> {
  const bin = config.QPDF_PATH?.trim() || "qpdf";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new QpdfError("Unlock/protect timed out."));
    }, options.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      // Common on Windows when qpdf isn't installed / PATH not set.
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as Error).message)
          : "Failed to start qpdf.";
      reject(
        new QpdfError(
          `qpdf is not available. Install qpdf and ensure it's on PATH (or set QPDF_PATH). Details: ${msg}`
        )
      );
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) return resolve();

      const detail = cleanStderr(stderr);
      reject(
        new QpdfError(
          detail
            ? `qpdf failed:\n${detail}`
            : `qpdf failed with exit code ${code ?? "unknown"}.`
        )
      );
    });
  });
}

