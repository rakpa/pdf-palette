import { spawn } from "node:child_process";
import type { AppConfig } from "../config.js";

export async function checkPythonDepsAvailable(config: AppConfig): Promise<boolean> {
  const python = config.PYTHON_PATH?.trim() || (process.platform === "win32" ? "python" : "python3");

  return new Promise((resolve) => {
    const child = spawn(
      python,
      ["-c", "import pdf2docx, fitz, docx, docxcompose"],
      { stdio: "ignore", windowsHide: true }
    );

    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 8000);

    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}
