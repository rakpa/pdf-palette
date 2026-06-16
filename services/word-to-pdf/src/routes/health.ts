import { Router } from "express";
import type { AppConfig } from "../config.js";
import { checkLibreOfficeAvailable } from "../lib/libreoffice.js";
import { checkPythonDepsAvailable } from "../lib/python-health.js";

export function createHealthRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    const [libreOfficeOk, pythonOk] = await Promise.all([
      checkLibreOfficeAvailable(config),
      checkPythonDepsAvailable(config),
    ]);

    const ok = libreOfficeOk && pythonOk;

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      checks: { libreOffice: libreOfficeOk, python: pythonOk },
      engine: "libreoffice-headless",
      conversions: ["word-to-pdf", "pdf-to-word"],
      pdfToWordEngine: "pdf2docx-fidelity",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
