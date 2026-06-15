/** Matches iLovePDF API compression_level values exactly. */
export type CompressionLevel = "low" | "recommended" | "extreme";

const API_BASE = "https://api.ilovepdf.com/v1";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function getApiToken(): Promise<string> {
  const res = await fetch("/api/compress-pdf/token");
  if (!res.ok) {
    let detail = `Could not authenticate (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) detail = payload.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const { token } = (await res.json()) as { token?: string };
  if (!token) throw new Error("Authentication response did not include a token");
  return token;
}

type ProcessResult = {
  filesize?: number;
  output_filesize?: number;
  status?: string;
};

/**
 * Compress a PDF directly against iLovePDF servers (same path as ilovepdf.com).
 * Only a short-lived auth token is fetched from our backend — the file never
 * passes through our server, so large files (40MB+) work correctly.
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
