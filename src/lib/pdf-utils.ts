import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import * as pdfjsLib from "pdfjs-dist";
// Vite resolves this to a hashed URL for the PDF.js web worker.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface ProcessingResult {
  success: boolean;
  message: string;
  blob?: Blob;
  filename?: string;
}

// Merge multiple PDFs into one
export async function mergePDFs(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    const mergedPdf = await PDFDocument.create();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
      
      onProgress?.(((i + 1) / files.length) * 100);
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    
    return {
      success: true,
      message: "PDFs merged successfully!",
      blob,
      filename: "merged.pdf",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error merging PDFs: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Split PDF into individual pages or ranges
export async function splitPDF(
  file: File,
  ranges: { start: number; end: number }[],
  onProgress?: (progress: number) => void
): Promise<ProcessingResult[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pageCount = pdf.getPageCount();
    const results: ProcessingResult[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const pageIndices = [];

      for (let p = range.start - 1; p < range.end; p++) {
        if (p >= 0 && p < pageCount) {
          pageIndices.push(p);
        }
      }

      // Skip ranges that don't map to any real page instead of emitting an empty PDF.
      if (pageIndices.length === 0) {
        results.push({
          success: false,
          message: `Pages ${range.start}-${range.end} are out of range (document has ${pageCount} page${pageCount === 1 ? "" : "s"}).`,
        });
        onProgress?.(((i + 1) / ranges.length) * 100);
        continue;
      }

      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdf, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      
      results.push({
        success: true,
        message: `Pages ${range.start}-${range.end} extracted`,
        blob,
        filename: `split_${range.start}-${range.end}.pdf`,
      });
      
      onProgress?.(((i + 1) / ranges.length) * 100);
    }
    
    return results;
  } catch (error) {
    return [{
      success: false,
      message: `Error splitting PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    }];
  }
}

// Rotate PDF pages
export async function rotatePDF(
  file: File,
  rotation: 90 | 180 | 270,
  pageIndices?: number[], // If undefined, rotate all pages
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pages = pdf.getPages();
    const indicesToRotate = pageIndices ?? pages.map((_, i) => i);
    
    for (let i = 0; i < indicesToRotate.length; i++) {
      const pageIndex = indicesToRotate[i];
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rotation) % 360));
      }
      onProgress?.(((i + 1) / indicesToRotate.length) * 100);
    }
    
    const pdfBytes = await pdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    
    return {
      success: true,
      message: "PDF rotated successfully!",
      blob,
      filename: `rotated_${file.name}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error rotating PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export type CompressionLevel = "low" | "recommended" | "high";

// scale = target render resolution (≈ DPI/72), quality = JPEG quality,
// maxSide = hard cap on the longest rendered side in pixels so we always
// DOWNSAMPLE (never upscale, which would inflate the file).
// "high" keeps the most detail (least shrink); "low" compresses the hardest.
const COMPRESSION_SETTINGS: Record<
  CompressionLevel,
  { scale: number; quality: number; maxSide: number }
> = {
  high: { scale: 2.0, quality: 0.82, maxSide: 2400 },
  recommended: { scale: 1.5, quality: 0.72, maxSide: 1700 },
  low: { scale: 1.0, quality: 0.5, maxSide: 1240 },
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Strip metadata and re-pack object streams. Cheap, lossless, but only helps a little.
async function leanRebuild(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arrayBuffer);
  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setProducer("");
  pdf.setCreator("");
  return pdf.save({ useObjectStreams: true });
}

// Render every page and re-encode it as JPEG, then rebuild the PDF from those images.
// This is what actually shrinks image-heavy / scanned PDFs (the metadata pass can't).
// Trade-off: text becomes a raster image (not selectable), so we only keep this result
// when it's genuinely smaller than the lossless rebuild.
async function rasterRebuild(
  arrayBuffer: ArrayBuffer,
  level: CompressionLevel,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const { scale, quality, maxSide } = COMPRESSION_SETTINGS[level];
  // pdf.js detaches the buffer it's given, so hand it a copy.
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const out = await PDFDocument.create();

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const native = page.getViewport({ scale: 1 });
    // Cap the render scale so the longest side never exceeds maxSide px — this
    // guarantees we downsample high-DPI pages instead of upscaling them.
    const longest = Math.max(native.width, native.height) * scale;
    const renderScale = longest > maxSide ? scale * (maxSide / longest) : scale;
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    // White background so transparent regions don't render black under JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpeg = dataUrlToBytes(canvas.toDataURL("image/jpeg", quality));
    const img = await out.embedJpg(jpeg);

    // Keep the page at its real PDF dimensions (viewport at scale 1 = points).
    const p = out.addPage([native.width, native.height]);
    p.drawImage(img, { x: 0, y: 0, width: native.width, height: native.height });

    onProgress?.(20 + (i / doc.numPages) * 70);
  }

  return out.save();
}

// Compress PDF — picks whichever approach yields the smallest file, and never
// returns something larger than the original.
export async function compressPDF(
  file: File,
  level: CompressionLevel = "recommended",
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    onProgress?.(10);
    const arrayBuffer = await file.arrayBuffer();
    const originalBytes = new Uint8Array(arrayBuffer.slice(0));

    const lean = await leanRebuild(arrayBuffer.slice(0));
    onProgress?.(20);

    let raster: Uint8Array | null = null;
    try {
      raster = await rasterRebuild(arrayBuffer, level, onProgress);
    } catch {
      // If rendering fails (e.g. encrypted/odd PDF), fall back to the lossless rebuild.
      raster = null;
    }

    onProgress?.(95);

    // Choose the smallest candidate.
    const candidates: { bytes: Uint8Array; rasterized: boolean }[] = [
      { bytes: originalBytes, rasterized: false },
      { bytes: lean, rasterized: false },
    ];
    if (raster) candidates.push({ bytes: raster, rasterized: true });
    candidates.sort((a, b) => a.bytes.length - b.bytes.length);
    const best = candidates[0];

    const originalSize = file.size;
    const compressedSize = best.bytes.length;
    const reductionPct = ((originalSize - compressedSize) / originalSize) * 100;

    onProgress?.(100);

    const blob = new Blob([best.bytes], { type: "application/pdf" });

    let message: string;
    if (best.bytes === originalBytes || reductionPct < 0.5) {
      message = `This PDF is already well-optimized — kept at ${formatFileSize(compressedSize)}.`;
    } else {
      const note = best.rasterized ? " (pages re-encoded as images)" : "";
      message = `Compressed! Reduced by ${reductionPct.toFixed(1)}% (${formatFileSize(
        originalSize
      )} → ${formatFileSize(compressedSize)})${note}`;
    }

    return {
      success: true,
      message,
      blob,
      filename: `compressed_${file.name}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error compressing PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Protect PDF with password.
// NOTE: pdf-lib cannot encrypt documents, so there is no honest way to do this
// fully in the browser. This intentionally returns a failure (no download) so we
// never hand the user an *unencrypted* file that looks protected. The "Protect PDF"
// tool is flagged `comingSoon` until a server-side encryption step exists.
export async function protectPDF(): Promise<ProcessingResult> {
  return {
    success: false,
    message:
      "Password protection needs secure server-side encryption, which isn't available yet. Coming soon!",
  };
}

// Add watermark to PDF
export async function addWatermark(
  file: File,
  text: string,
  options: {
    fontSize?: number;
    opacity?: number;
    rotation?: number;
  } = {},
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    const { fontSize = 50, opacity = 0.3, rotation = -45 } = options;

    onProgress?.(10);
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(30);

    const pdf = await PDFDocument.load(arrayBuffer);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pages = pdf.getPages();

    onProgress?.(50);

    const angle = (rotation * Math.PI) / 180;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // Offset the draw origin so the rotated text stays centered on the page.
      const x = width / 2 - (textWidth / 2) * Math.cos(angle) + (textHeight / 2) * Math.sin(angle);
      const y = height / 2 - (textWidth / 2) * Math.sin(angle) - (textHeight / 2) * Math.cos(angle);

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(rotation),
      });

      onProgress?.(50 + ((i + 1) / pages.length) * 40);
    }
    
    const pdfBytes = await pdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    
    onProgress?.(100);
    
    return {
      success: true,
      message: "Watermark added successfully!",
      blob,
      filename: `watermarked_${file.name}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error adding watermark: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Get PDF info
export async function getPDFInfo(file: File): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  return {
    pageCount: pdf.getPageCount(),
    title: pdf.getTitle(),
    author: pdf.getAuthor(),
  };
}

// Download result
export function downloadResult(result: ProcessingResult) {
  if (result.blob && result.filename) {
    saveAs(result.blob, result.filename);
  }
}

// Utility: Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// Convert images to PDF
export async function imagesToPDF(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    const pdf = await PDFDocument.create();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      
      let image;
      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        image = await pdf.embedJpg(arrayBuffer);
      } else if (file.type === "image/png") {
        image = await pdf.embedPng(arrayBuffer);
      } else {
        continue; // Skip unsupported formats
      }
      
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
      
      onProgress?.(((i + 1) / files.length) * 100);
    }
    
    const pdfBytes = await pdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    
    return {
      success: true,
      message: "Images converted to PDF successfully!",
      blob,
      filename: "images.pdf",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error converting images: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
