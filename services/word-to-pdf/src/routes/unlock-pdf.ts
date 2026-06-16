import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import { TempWorkspace } from "../lib/temp-workspace.js";
import { streamPdfUploadWithFields, UploadError } from "../lib/streaming-upload.js";
import { runQpdf } from "../lib/qpdf.js";

export function createUnlockPdfRouter(config: AppConfig, log: Logger): Router {
  const router = Router();

  router.post("/convert", async (req, res) => {
    const workspace = new TempWorkspace(config.TEMP_ROOT);
    const requestLog = log.child({ workspaceId: workspace.id });

    try {
      await workspace.init();
      requestLog.info("streaming pdf upload started");

      const upload = await streamPdfUploadWithFields(req, workspace.inputDir, config.MAX_UPLOAD_BYTES);
      const password = (upload.fields.password ?? "").trim();

      if (!password) {
        throw new UploadError("Password is required to unlock this PDF.", 400);
      }

      const baseName = path.basename(upload.originalName, path.extname(upload.originalName)) || "document";
      const outputPath = path.join(workspace.outputDir, "unlocked.pdf");

      await runQpdf(
        config,
        ["--password=" + password, "--decrypt", upload.filePath, outputPath],
        { timeoutMs: config.CONVERSION_TIMEOUT_MS }
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}_unlocked.pdf"`);
      res.setHeader("X-Conversion-Engine", "qpdf");

      const stream = fs.createReadStream(outputPath);

      let cleaned = false;
      const cleanupOnce = () => {
        if (cleaned) return;
        cleaned = true;
        void workspace.cleanup(requestLog);
      };

      stream.on("end", cleanupOnce);
      stream.on("error", (error) => {
        requestLog.error({ error }, "failed to stream unlocked pdf");
        cleanupOnce();
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream unlocked PDF." });
        }
      });

      stream.pipe(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unlock failed";
      const status =
        error instanceof UploadError
          ? error.statusCode
          : /password|encrypted|decrypt/i.test(message)
            ? 422
            : /timeout/i.test(message)
              ? 504
              : 500;

      requestLog.error({ error: message, status }, "unlock request failed");
      await workspace.cleanup(requestLog);
      if (!res.headersSent) {
        res.status(status).json({ error: message });
      }
    }
  });

  return router;
}

