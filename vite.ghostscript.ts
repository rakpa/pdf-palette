import { createReadStream, cpSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Connect, Plugin, ViteDevServer } from "vite";
import { corpHeaders, prependMiddleware } from "./vite.crossOriginIsolation";

const root = path.dirname(fileURLToPath(import.meta.url));
const gsSrc = path.resolve(root, "node_modules/@bentopdf/gs-wasm/assets");
const gsDist = path.resolve(root, "dist/gs-wasm");

const GS_FILES = ["gs.js", "gs.wasm"] as const;

function contentType(file: string): string {
  if (file.endsWith(".wasm")) return "application/wasm";
  if (file.endsWith(".js")) return "application/javascript";
  return "application/octet-stream";
}

/** Dev-only: serve Ghostscript assets without placing them in /public (Vite blocks import() from public). */
function serveGhostscriptAssets(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";
    if (!url.startsWith("/gs-wasm/")) return next();

    const name = path.basename(url);
    if (!GS_FILES.includes(name as (typeof GS_FILES)[number])) return next();

    const filePath = path.join(gsSrc, name);
    if (!existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    res.setHeader("Content-Type", contentType(name));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    corpHeaders(res);
    createReadStream(filePath).pipe(res);
  };
}

function copyGhostscriptToDist(): void {
  if (!existsSync(gsSrc)) return;
  mkdirSync(gsDist, { recursive: true });
  for (const file of GS_FILES) {
    cpSync(path.join(gsSrc, file), path.join(gsDist, file));
  }
}

export function ghostscriptAssetsPlugin(): Plugin {
  return {
    name: "ghostscript-assets",
    enforce: "pre",
    configureServer(server) {
      prependMiddleware(server, serveGhostscriptAssets());
    },
    closeBundle() {
      copyGhostscriptToDist();
    },
  };
}
