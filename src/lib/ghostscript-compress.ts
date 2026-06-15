import type { CompressionLevel } from "@/lib/compression-types";

export type { CompressionLevel } from "./compression-types";

type WorkerRequest = {
  type: "compress";
  id: string;
  buffer: ArrayBuffer;
  level: CompressionLevel;
};

type WorkerResponse =
  | { type: "progress"; id: string; progress: number; message?: string }
  | { type: "result"; id: string; buffer: ArrayBuffer }
  | { type: "error"; id: string; message: string };

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/ghostscript-compress.worker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

/**
 * Compress a PDF in-browser using Ghostscript WASM (runs in a Web Worker).
 * Same class of engine used by professional PDF optimizers — no third-party API.
 */
export async function compressWithGhostscript(
  file: File,
  level: CompressionLevel = "recommended",
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; inputSize: number; outputSize: number }> {
  const id = crypto.randomUUID();
  const buffer = await file.arrayBuffer();
  const w = getWorker();

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;

      if (data.type === "progress") {
        onProgress?.(data.progress);
        return;
      }

      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);

      if (data.type === "error") {
        reject(new Error(data.message));
        return;
      }

      const blob = new Blob([data.buffer], { type: "application/pdf" });
      onProgress?.(100);
      resolve({
        blob,
        inputSize: file.size,
        outputSize: blob.size,
      });
    };

    const onError = (event: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(new Error(event.message || "Compression worker failed"));
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);

    const payload: WorkerRequest = { type: "compress", id, buffer, level };
    w.postMessage(payload, [buffer]);
  });
}
