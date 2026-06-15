/// <reference lib="webworker" />
import { loadGhostscriptWASM, type GhostscriptModule } from "@bentopdf/gs-wasm";
import type { CompressionLevel } from "@/lib/compression-types";

const GS_ASSETS_BASE = "https://cdn.jsdelivr.net/npm/@bentopdf/gs-wasm@0.1.1/assets/";

/** Ghostscript /PDFSETTINGS presets — same engine used by many PDF optimizers. */
const PDF_SETTINGS = {
  low: "/printer",
  recommended: "/ebook",
  extreme: "/screen",
} as const satisfies Record<CompressionLevel, string>;

type WorkerRequest =
  | { type: "compress"; id: string; buffer: ArrayBuffer; level: CompressionLevel };

type WorkerResponse =
  | { type: "progress"; id: string; progress: number; message?: string }
  | { type: "result"; id: string; buffer: ArrayBuffer }
  | { type: "error"; id: string; message: string };

let gsPromise: Promise<GhostscriptModule> | null = null;

function getGhostscript(): Promise<GhostscriptModule> {
  if (!gsPromise) {
    gsPromise = loadGhostscriptWASM({ baseUrl: GS_ASSETS_BASE });
  }
  return gsPromise;
}

async function runCompress(buffer: ArrayBuffer, level: CompressionLevel): Promise<Uint8Array> {
  const gs = await getGhostscript();
  const inputPath = "/input.pdf";
  const outputPath = "/output.pdf";

  try {
    gs.FS.writeFile(inputPath, new Uint8Array(buffer));

    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${PDF_SETTINGS[level]}`,
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dSubsetFonts=true",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    const code = gs.callMain(args);
    if (code !== 0) {
      throw new Error(`Ghostscript failed (exit code ${code})`);
    }

    return gs.FS.readFile(outputPath) as Uint8Array;
  } finally {
    try {
      gs.FS.unlink(inputPath);
    } catch {
      // ignore cleanup errors
    }
    try {
      gs.FS.unlink(outputPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== "compress") return;

  void (async () => {
    const post = (payload: WorkerResponse, transfer?: Transferable[]) => {
      self.postMessage(payload, transfer ?? []);
    };

    try {
      post({ type: "progress", id: msg.id, progress: 8, message: "Loading compression engine…" });
      post({ type: "progress", id: msg.id, progress: 20, message: "Preparing Ghostscript…" });
      await getGhostscript();
      post({ type: "progress", id: msg.id, progress: 35, message: "Compressing PDF…" });

      const output = await runCompress(msg.buffer, msg.level);
      post({ type: "progress", id: msg.id, progress: 95 });

      post({ type: "result", id: msg.id, buffer: output.buffer }, [output.buffer]);
    } catch (error) {
      post({
        type: "error",
        id: msg.id,
        message: error instanceof Error ? error.message : "Compression failed",
      });
    }
  })();
});
