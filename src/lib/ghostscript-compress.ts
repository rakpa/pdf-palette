import type { CompressionLevel } from "@/lib/compression-types";

export type { CompressionLevel } from "./compression-types";

type WorkerRequest =
  | { type: "init"; id: string }
  | { type: "compress"; id: string; buffer: ArrayBuffer; level: CompressionLevel };

type WorkerResponse =
  | { type: "ready"; id: string }
  | { type: "progress"; id: string; progress: number }
  | { type: "result"; id: string; buffer: ArrayBuffer }
  | { type: "error"; id: string; message: string };

let worker: Worker | null = null;
let warmupPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/ghostscript-compress.worker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

/** Preload Ghostscript WASM in the background — call when the compress page opens. */
export function warmupGhostscript(): Promise<void> {
  if (!warmupPromise) {
    const id = "__warmup__";
    const w = getWorker();

    warmupPromise = new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (data.id !== id) return;
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        if (data.type === "ready") resolve();
        else reject(new Error(data.message || "Failed to load compression engine"));
      };
      const onError = (event: ErrorEvent) => {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        warmupPromise = null;
        reject(new Error(event.message || "Compression worker failed"));
      };
      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
      w.postMessage({ type: "init", id } satisfies WorkerRequest);
    }).catch((err) => {
      warmupPromise = null;
      throw err;
    });
  }
  return warmupPromise;
}

export async function compressWithGhostscript(
  file: File,
  level: CompressionLevel = "recommended",
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; inputSize: number; outputSize: number }> {
  // Engine should already be warm from page load; await just in case.
  await warmupGhostscript();

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
    w.postMessage({ type: "compress", id, buffer, level } satisfies WorkerRequest, [buffer]);
  });
}
