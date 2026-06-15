/** Matches iLovePDF API compression_level values exactly. */
export type CompressionLevel = "low" | "recommended" | "extreme";

const API_BASE = "https://api.ilovepdf.com/v1";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** iLovePDF public key — safe to expose in the browser (per iLovePDF client-side auth docs). */
function getPublicKey(): string {
  const key = import.meta.env.VITE_ILOVEPDF_PUBLIC_KEY;
  if (!key) {
    throw new Error(
      "VITE_ILOVEPDF_PUBLIC_KEY is not configured. Add it to your environment variables."
    );
  }
  return key;
}

async function getApiToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: getPublicKey() }),
  });

  if (!res.ok) {
    let detail = `Could not authenticate with iLovePDF (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: string; message?: string };
      if (payload.error) detail = payload.error;
      else if (payload.message) detail = payload.message;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const { token } = (await res.json()) as { token?: string };
  if (!token) throw new Error("iLovePDF did not return an auth token");
  return token;
}

type ProcessResult = {
  filesize?: number;
  output_filesize?: number;
  status?: string;
};

/**
 * Compress a PDF directly against iLovePDF servers (same path as ilovepdf.com).
 * Auth and file upload go straight to iLovePDF — no backend proxy required.
 */
export async function compressWithILovePDF(
  file: File,
  level: CompressionLevel,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; inputSize: number; outputSize: number }> {
  onProgress?.(5);
  const token = await getApiToken();

  onProgress?.(15);
  const startRes = await fetch(`${API_BASE}/start/compress`, {
    headers: authHeaders(token),
  });
  if (!startRes.ok) {
    throw new Error(`Failed to start compress task (${startRes.status})`);
  }

  const { server, task } = (await startRes.json()) as { server?: string; task?: string };
  if (!server || !task) throw new Error("Invalid start response from iLovePDF");

  onProgress?.(25);
  const uploadForm = new FormData();
  uploadForm.append("task", task);
  uploadForm.append("file", file, file.name);

  const uploadRes = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: uploadForm,
  });
  if (!uploadRes.ok) {
    const detail = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${detail}`);
  }

  const { server_filename: serverFilename } = (await uploadRes.json()) as {
    server_filename?: string;
  };
  if (!serverFilename) throw new Error("Upload response missing server_filename");

  onProgress?.(55);
  const processRes = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task,
      tool: "compress",
      compression_level: level,
      files: [{ server_filename: serverFilename, filename: file.name }],
    }),
  });
  if (!processRes.ok) {
    const detail = await processRes.text();
    throw new Error(`Compression failed (${processRes.status}): ${detail}`);
  }

  const processData = (await processRes.json()) as ProcessResult;
  if (
    processData.status &&
    processData.status !== "TaskSuccess" &&
    processData.status !== "TaskSuccessWithWarnings"
  ) {
    throw new Error(`Compression failed: ${processData.status}`);
  }

  onProgress?.(80);
  const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
    headers: authHeaders(token),
  });
  if (!downloadRes.ok) {
    throw new Error(`Download failed (${downloadRes.status})`);
  }

  const blob = await downloadRes.blob();
  onProgress?.(100);

  const inputSize = processData.filesize ?? file.size;
  const outputSize = processData.output_filesize ?? blob.size;

  return { blob, inputSize, outputSize };
}
