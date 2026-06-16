import { parseConversionFetchError } from "./conversion-service-client";

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match?.[1]?.replace(/"/g, "") ?? null;
}

export async function htmlToPdfLocal(
  input: { file?: File; url?: string },
  onProgress?: (progress: number, message?: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const url = input.url?.trim();
  const file = input.file;

  if (!url && !file) {
    throw new Error("Provide either an HTML file or a URL.");
  }

  onProgress?.(10, "Uploading…");

  const form = new FormData();
  if (file) form.append("file", file, file.name);
  if (url) form.append("url", url);

  onProgress?.(35, "Rendering page…");

  let res: Response;
  try {
    res = await fetch("/api/html-to-pdf/convert", {
      method: "POST",
      body: form,
    });
  } catch (error) {
    throw new Error(parseConversionFetchError(error));
  }

  if (!res.ok) {
    let message = "HTML to PDF failed";
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
  const baseName = file?.name
    ? file.name.replace(/\.(html?|HTML?)$/i, "") || "page"
    : "page";
  const filename =
    filenameFromDisposition(res.headers.get("Content-Disposition")) ?? `${baseName}.pdf`;

  onProgress?.(100, "Done");
  return { blob, filename };
}

