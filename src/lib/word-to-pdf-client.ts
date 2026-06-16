import { parseConversionFetchError } from "./conversion-service-client";
import { conversionServiceUrl } from "./runtime-config";

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match?.[1]?.replace(/"/g, "") ?? null;
}

const API_BASE = "/api/word-to-pdf";

export async function convertWordToPdfLocal(
  file: File,
  onProgress?: (progress: number, message?: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress?.(10, "Uploading document…");

  const form = new FormData();
  form.append("file", file, file.name);

  onProgress?.(35, "Converting with LibreOffice…");

  let res: Response;
  try {
    res = await fetch(
      conversionServiceUrl(`${API_BASE}/convert`, "/v1/word-to-pdf/convert"),
      {
      method: "POST",
      body: form,
      }
    );
  } catch (error) {
    throw new Error(parseConversionFetchError(error));
  }

  if (!res.ok) {
    let message = "Word to PDF conversion failed";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      message = `${message} (HTTP ${res.status})`;
    }
    throw new Error(message);
  }

  onProgress?.(90, "Preparing download…");
  const blob = await res.blob();
  const baseName = file.name.replace(/\.(docx?|DOCX?)$/i, "") || "document";
  const filename =
    filenameFromDisposition(res.headers.get("Content-Disposition")) ?? `${baseName}.pdf`;

  onProgress?.(100, "Done");
  return { blob, filename };
}

