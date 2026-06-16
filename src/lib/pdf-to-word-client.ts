import { parseConversionFetchError } from "./conversion-service-client";

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match?.[1]?.replace(/"/g, "") ?? null;
}

export async function convertPdfToWordLocal(
  file: File,
  onProgress?: (progress: number, message?: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress?.(10, "Uploading PDF…");

  const form = new FormData();
  form.append("file", file, file.name);

  onProgress?.(35, "Reconstructing layout…");

  let res: Response;
  try {
    res = await fetch("/api/pdf-to-word/convert", {
      method: "POST",
      body: form,
    });
  } catch (error) {
    throw new Error(parseConversionFetchError(error));
  }

  if (!res.ok) {
    let message = "PDF to Word conversion failed";
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
  const baseName = file.name.replace(/\.pdf$/i, "") || "document";
  const filename =
    filenameFromDisposition(res.headers.get("Content-Disposition")) ?? `${baseName}.docx`;

  onProgress?.(100, "Done");
  return { blob, filename };
}
