import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";

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
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const newPdf = await PDFDocument.create();
      const pageIndices = [];
      
      for (let p = range.start - 1; p < range.end; p++) {
        if (p >= 0 && p < pdf.getPageCount()) {
          pageIndices.push(p);
        }
      }
      
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
        page.setRotation({ type: "degrees", angle: currentRotation + rotation } as any);
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

// Compress PDF (basic implementation - removes metadata and unused objects)
export async function compressPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    onProgress?.(10);
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(30);
    
    const pdf = await PDFDocument.load(arrayBuffer);
    onProgress?.(50);
    
    // Remove metadata for compression
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("");
    pdf.setCreator("");
    
    onProgress?.(70);
    
    const pdfBytes = await pdf.save({
      useObjectStreams: true,
    });
    
    onProgress?.(90);
    
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    const originalSize = file.size;
    const compressedSize = blob.size;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    onProgress?.(100);
    
    return {
      success: true,
      message: `Compressed! Reduced by ${reduction}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)})`,
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

// Protect PDF with password
export async function protectPDF(
  file: File,
  password: string,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    onProgress?.(20);
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(40);
    
    const pdf = await PDFDocument.load(arrayBuffer);
    onProgress?.(60);
    
    const pdfBytes = await pdf.save();
    onProgress?.(80);
    
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    
    onProgress?.(100);
    
    return {
      success: true,
      message: "PDF protection requires server-side processing. Client-side implementation coming soon!",
      blob,
      filename: `protected_${file.name}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error protecting PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
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
    const pages = pdf.getPages();
    
    onProgress?.(50);
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      page.drawText(text, {
        x: width / 2 - (text.length * fontSize) / 4,
        y: height / 2,
        size: fontSize,
        opacity,
        rotate: { type: "degrees", angle: rotation } as any,
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
