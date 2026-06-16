import fs from "node:fs/promises";
import path from "node:path";

export type HtmlToPdfInput =
  | { kind: "url"; url: string }
  | { kind: "file"; filePath: string };

export class HtmlToPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HtmlToPdfError";
  }
}

function isProbablyUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateHtmlToPdfInput(fields: Record<string, string>): { url?: string } {
  const url = (fields.url ?? "").trim();
  if (url && !isProbablyUrl(url)) {
    throw new HtmlToPdfError("URL must start with http:// or https://");
  }
  return { url: url || undefined };
}

export async function renderHtmlToPdf(
  input: HtmlToPdfInput,
  outputPath: string
): Promise<void> {
  let chromium: any;
  let browser: any;

  try {
    // Lazy import so the service still starts without playwright installed.
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    throw new HtmlToPdfError(
      "HTML to PDF needs Playwright. Install it in services/word-to-pdf: npm install && npx playwright install chromium"
    );
  }

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    if (input.kind === "url") {
      await page.goto(input.url, { waitUntil: "networkidle", timeout: 120_000 });
    } else {
      const html = await fs.readFile(input.filePath, "utf8");
      // Make relative assets resolve against the file directory.
      const baseDir = path.dirname(input.filePath);
      await page.setContent(html, { waitUntil: "networkidle" });
      await page.addInitScript((base: string) => {
        const baseEl = document.createElement("base");
        baseEl.href = base;
        document.head.prepend(baseEl);
      }, `file:///${baseDir.replace(/\\/g, "/")}/`);
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });

    await fs.writeFile(outputPath, pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : "HTML to PDF failed";
    throw new HtmlToPdfError(message);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}

