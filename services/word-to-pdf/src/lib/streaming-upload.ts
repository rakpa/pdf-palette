import fs from "node:fs";
import path from "node:path";
import Busboy from "busboy";
import type { IncomingMessage } from "node:http";

export type StreamedUploadResult = {
  filePath: string;
  originalName: string;
  byteLength: number;
};

export type StreamedMultipartResult = StreamedUploadResult & {
  fields: Record<string, string>;
};

export class UploadError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "UploadError";
  }
}

type UploadProfile = {
  allowedExtensions: string[];
  defaultFilename: string;
  rejectMessage: string;
};

const WORD_PROFILE: UploadProfile = {
  allowedExtensions: [".doc", ".docx"],
  defaultFilename: "document.docx",
  rejectMessage: "Only .doc and .docx files are accepted.",
};

const PDF_PROFILE: UploadProfile = {
  allowedExtensions: [".pdf"],
  defaultFilename: "document.pdf",
  rejectMessage: "Only .pdf files are accepted.",
};

const HTML_PROFILE: UploadProfile = {
  allowedExtensions: [".html", ".htm"],
  defaultFilename: "page.html",
  rejectMessage: "Only .html and .htm files are accepted.",
};

export function streamWordUpload(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number
): Promise<StreamedUploadResult> {
  return streamUploadToFile(req, destDir, maxBytes, WORD_PROFILE);
}

export function streamPdfUpload(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number
): Promise<StreamedUploadResult> {
  return streamUploadToFile(req, destDir, maxBytes, PDF_PROFILE);
}

export function streamPdfUploadWithFields(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number
): Promise<StreamedMultipartResult> {
  return streamUploadToFileWithFields(req, destDir, maxBytes, PDF_PROFILE, { requireFile: true });
}

export function streamHtmlUploadOrFields(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number
): Promise<{ file?: StreamedUploadResult; fields: Record<string, string> }> {
  return streamOptionalUploadWithFields(req, destDir, maxBytes, HTML_PROFILE);
}

function streamUploadToFile(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number,
  profile: UploadProfile
): Promise<StreamedUploadResult> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: maxBytes },
    });

    let savedPath: string | null = null;
    let originalName = profile.defaultFilename;
    let byteLength = 0;
    let fileReceived = false;
    let writeFinished = false;

    const maybeResolve = () => {
      if (fileReceived && writeFinished && savedPath) {
        resolve({ filePath: savedPath, originalName, byteLength });
      }
    };

    busboy.on("file", (fieldname, fileStream, info) => {
      if (fieldname !== "file") {
        fileStream.resume();
        return;
      }

      fileReceived = true;
      originalName = path.basename(info.filename || profile.defaultFilename);
      const ext = path.extname(originalName).toLowerCase();
      if (!profile.allowedExtensions.includes(ext)) {
        fileStream.resume();
        reject(new UploadError(profile.rejectMessage, 400));
        return;
      }

      const safeName = `upload${ext}`;
      savedPath = path.join(destDir, safeName);
      const writeStream = fs.createWriteStream(savedPath);

      fileStream.on("data", (chunk: Buffer) => {
        byteLength += chunk.length;
      });

      fileStream.on("limit", () => {
        writeStream.destroy();
        reject(
          new UploadError(`File exceeds maximum upload size of ${maxBytes} bytes.`, 413)
        );
      });

      fileStream.pipe(writeStream);

      writeStream.on("finish", () => {
        writeFinished = true;
        maybeResolve();
      });

      writeStream.on("error", (error) => {
        reject(new UploadError(`Upload write failed: ${error.message}`, 500));
      });
    });

    busboy.on("finish", () => {
      if (!fileReceived) {
        reject(new UploadError("No file field found in multipart upload.", 400));
      }
    });

    busboy.on("error", (error: Error) => {
      reject(new UploadError(`Upload parse failed: ${error.message}`, 400));
    });

    req.pipe(busboy);
  });
}

function streamUploadToFileWithFields(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number,
  profile: UploadProfile,
  options: { requireFile: boolean }
): Promise<StreamedMultipartResult> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: maxBytes, fields: 20, fieldSize: 64 * 1024 },
    });

    const fields: Record<string, string> = {};
    let savedPath: string | null = null;
    let originalName = profile.defaultFilename;
    let byteLength = 0;
    let fileReceived = false;
    let writeFinished = false;

    const maybeResolve = () => {
      if (fileReceived && writeFinished && savedPath) {
        resolve({ filePath: savedPath, originalName, byteLength, fields });
      }
    };

    busboy.on("field", (name, value) => {
      // Keep only small textual fields; last value wins.
      fields[String(name)] = String(value ?? "");
    });

    busboy.on("file", (fieldname, fileStream, info) => {
      if (fieldname !== "file") {
        fileStream.resume();
        return;
      }

      fileReceived = true;
      originalName = path.basename(info.filename || profile.defaultFilename);
      const ext = path.extname(originalName).toLowerCase();
      if (!profile.allowedExtensions.includes(ext)) {
        fileStream.resume();
        reject(new UploadError(profile.rejectMessage, 400));
        return;
      }

      const safeName = `upload${ext}`;
      savedPath = path.join(destDir, safeName);
      const writeStream = fs.createWriteStream(savedPath);

      fileStream.on("data", (chunk: Buffer) => {
        byteLength += chunk.length;
      });

      fileStream.on("limit", () => {
        writeStream.destroy();
        reject(
          new UploadError(`File exceeds maximum upload size of ${maxBytes} bytes.`, 413)
        );
      });

      fileStream.pipe(writeStream);

      writeStream.on("finish", () => {
        writeFinished = true;
        maybeResolve();
      });

      writeStream.on("error", (error) => {
        reject(new UploadError(`Upload write failed: ${error.message}`, 500));
      });
    });

    busboy.on("finish", () => {
      if (options.requireFile && !fileReceived) {
        reject(new UploadError("No file field found in multipart upload.", 400));
      }
    });

    busboy.on("error", (error: Error) => {
      reject(new UploadError(`Upload parse failed: ${error.message}`, 400));
    });

    req.pipe(busboy);
  });
}

function streamOptionalUploadWithFields(
  req: IncomingMessage,
  destDir: string,
  maxBytes: number,
  profile: UploadProfile
): Promise<{ file?: StreamedUploadResult; fields: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: maxBytes, fields: 20, fieldSize: 256 * 1024 },
    });

    const fields: Record<string, string> = {};
    let savedPath: string | null = null;
    let originalName = profile.defaultFilename;
    let byteLength = 0;
    let writeFinished = false;
    let fileReceived = false;

    const maybeResolve = () => {
      if (!fileReceived) {
        resolve({ fields });
        return;
      }
      if (writeFinished && savedPath) {
        resolve({ file: { filePath: savedPath, originalName, byteLength }, fields });
      }
    };

    busboy.on("field", (name, value) => {
      fields[String(name)] = String(value ?? "");
    });

    busboy.on("file", (fieldname, fileStream, info) => {
      if (fieldname !== "file") {
        fileStream.resume();
        return;
      }

      fileReceived = true;
      originalName = path.basename(info.filename || profile.defaultFilename);
      const ext = path.extname(originalName).toLowerCase();
      if (!profile.allowedExtensions.includes(ext)) {
        fileStream.resume();
        reject(new UploadError(profile.rejectMessage, 400));
        return;
      }

      const safeName = `upload${ext}`;
      savedPath = path.join(destDir, safeName);
      const writeStream = fs.createWriteStream(savedPath);

      fileStream.on("data", (chunk: Buffer) => {
        byteLength += chunk.length;
      });

      fileStream.on("limit", () => {
        writeStream.destroy();
        reject(
          new UploadError(`File exceeds maximum upload size of ${maxBytes} bytes.`, 413)
        );
      });

      fileStream.pipe(writeStream);

      writeStream.on("finish", () => {
        writeFinished = true;
        maybeResolve();
      });

      writeStream.on("error", (error) => {
        reject(new UploadError(`Upload write failed: ${error.message}`, 500));
      });
    });

    busboy.on("finish", () => {
      maybeResolve();
    });

    busboy.on("error", (error: Error) => {
      reject(new UploadError(`Upload parse failed: ${error.message}`, 400));
    });

    req.pipe(busboy);
  });
}
