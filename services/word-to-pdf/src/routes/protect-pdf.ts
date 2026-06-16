import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import { TempWorkspace } from "../lib/temp-workspace.js";
import { streamPdfUploadWithFields, UploadError } from "../lib/streaming-upload.js";
import { runQpdf } from "../lib/qpdf.js";

export function createProtectPdfRouter(config: AppConfig, log: Logger): Router {
  const router = Router();

  router.post("/convert", async (req, res) => {
    const workspace = new TempWorkspace(config.TEMP_ROOT);
    const requestLog = log.child({ workspaceId: workspace.id });

    try {
      await workspace.init();
      requestLog.info("streaming pdf upload started");

      const upload = await streamPdfUploadWithFields(req, workspace.inputDir, config.MAX_UPLOAD_BYTES);
      const password = (upload.fields.password ?? "").trim();

      if (!password || password.length < 4) {
        throw new UploadError("Password must be at least 4 characters.", 400);
      }

      const baseName = path.basename(upload.originalName, path.extname(upload.originalName)) || "document";
      const outputPath = path.join(workspace.outputDir, "protected.pdf");

      // qpdf requires both user + owner password. Use a random owner password.
      const ownerPassword = crypto.randomBytes(12).toString("base64url");

      await runQpdf(
        config,
        ["--encrypt", password, ownerPassword, "256", "--", upload.filePath, outputPath],
        { timeoutMs: config.CONVERSION_TIMEOUT_MS }
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}_protected.pdf"`);
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
        requestLog.error({ error }, "failed to stream protected pdf");
        cleanupOnce();
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream protected PDF." });
        }
      });

      stream.pipe(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Protect failed";
      const status =
        error instanceof UploadError
          ? error.statusCode
          : /encrypt|password/i.test(message)
            ? 422
            : /timeout/i.test(message)
              ? 504
              : 500;

      requestLog.error({ error: message, status }, "protect request failed");
      await workspace.cleanup(requestLog);
      if (!res.headersSent) {
        res.status(status).json({ error: message });
      }
    }
  });

  return router;
}

