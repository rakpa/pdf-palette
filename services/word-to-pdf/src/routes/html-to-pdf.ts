import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import { TempWorkspace } from "../lib/temp-workspace.js";
import { streamHtmlUploadOrFields, UploadError } from "../lib/streaming-upload.js";
import {
  renderHtmlToPdf,
  validateHtmlToPdfInput,
  type HtmlToPdfInput,
} from "../lib/html-to-pdf.js";

export function createHtmlToPdfRouter(config: AppConfig, log: Logger): Router {
  const router = Router();

  router.post("/convert", async (req, res) => {
    const workspace = new TempWorkspace(config.TEMP_ROOT);
    const requestLog = log.child({ workspaceId: workspace.id });

    try {
      await workspace.init();

      const { file, fields } = await streamHtmlUploadOrFields(
        req,
        workspace.inputDir,
        config.MAX_UPLOAD_BYTES
      );

      const { url } = validateHtmlToPdfInput(fields);

      if (!url && !file) {
        throw new UploadError("Provide either an HTML file or a URL.", 400);
      }

      const outputPath = path.join(workspace.outputDir, "page.pdf");

      const input: HtmlToPdfInput = url
        ? { kind: "url", url }
        : { kind: "file", filePath: file!.filePath };

      await renderHtmlToPdf(input, outputPath);

      const nameBase = url
        ? "page"
        : path.basename(file!.originalName, path.extname(file!.originalName)) || "page";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${nameBase}.pdf"`);
      res.setHeader("X-Conversion-Engine", "playwright-chromium");

      const stream = fs.createReadStream(outputPath);

      let cleaned = false;
      const cleanupOnce = () => {
        if (cleaned) return;
        cleaned = true;
        void workspace.cleanup(requestLog);
      };

      stream.on("end", cleanupOnce);
      stream.on("error", (error) => {
        requestLog.error({ error }, "failed to stream html->pdf response");
        cleanupOnce();
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream generated PDF." });
        }
      });

      stream.pipe(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed";
      const status =
        error instanceof UploadError
          ? error.statusCode
          : /url|html|playwright|chrom/i.test(message)
            ? 422
            : /timeout/i.test(message)
              ? 504
              : 500;

      requestLog.error({ error: message, status }, "html to pdf request failed");
      await workspace.cleanup(requestLog);
      if (!res.headersSent) {
        res.status(status).json({ error: message });
      }
    }
  });

  return router;
}

