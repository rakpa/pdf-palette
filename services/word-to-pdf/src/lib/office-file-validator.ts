import fs from "node:fs";
import path from "node:path";
import yauzl from "yauzl";

const DOC_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export type OfficeValidationResult =
  | { ok: true; format: "docx" | "doc" }
  | { ok: false; code: "encrypted" | "corrupted" | "unsupported"; message: string };

function readHeader(filePath: string, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: length - 1 });
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function validateDocxZip(filePath: string): Promise<OfficeValidationResult> {
  return new Promise((resolve) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        resolve({
          ok: false,
          code: "corrupted",
          message: "The Word file appears corrupted or is not a valid .docx archive.",
        });
        return;
      }

      let hasContentTypes = false;
      let hasEncryptedPackage = false;
      let hasDocumentXml = false;

      zip.on("entry", (entry) => {
        const name = entry.fileName;
        if (name === "[Content_Types].xml") hasContentTypes = true;
        if (name === "EncryptedPackage" || name === "EncryptionInfo") hasEncryptedPackage = true;
        if (name === "word/document.xml") hasDocumentXml = true;
        zip.readEntry();
      });

      zip.on("end", () => {
        zip.close();
        if (hasEncryptedPackage) {
          resolve({
            ok: false,
            code: "encrypted",
            message: "This Word document is password-protected. Remove encryption and try again.",
          });
          return;
        }
        if (!hasContentTypes || !hasDocumentXml) {
          resolve({
            ok: false,
            code: "corrupted",
            message: "The .docx file is missing required document structure.",
          });
          return;
        }
        resolve({ ok: true, format: "docx" });
      });

      zip.on("error", () => {
        zip.close();
        resolve({
          ok: false,
          code: "corrupted",
          message: "Failed to read the .docx archive.",
        });
      });

      zip.readEntry();
    });
  });
}

async function validateDoc(filePath: string): Promise<OfficeValidationResult> {
  const header = await readHeader(filePath, 512);
  if (header.length < 8 || !header.subarray(0, 8).equals(DOC_MAGIC)) {
    return {
      ok: false,
      code: "corrupted",
      message: "The file is not a valid legacy .doc document.",
    };
  }

  // Heuristic: encrypted OLE docs often contain these markers in the header region.
  const text = header.toString("latin1");
  if (text.includes("EncryptedPackage") || text.includes("EncryptionInfo")) {
    return {
      ok: false,
      code: "encrypted",
      message: "This Word document is password-protected. Remove encryption and try again.",
    };
  }

  return { ok: true, format: "doc" };
}

export async function validateOfficeFile(filePath: string): Promise<OfficeValidationResult> {
  const ext = path.extname(filePath).toLowerCase();
  const header = await readHeader(filePath, 4);

  if (ext === ".docx" || header.subarray(0, 4).equals(ZIP_MAGIC)) {
    return validateDocxZip(filePath);
  }

  if (ext === ".doc" || header.subarray(0, 8).equals(DOC_MAGIC)) {
    return validateDoc(filePath);
  }

  return {
    ok: false,
    code: "unsupported",
    message: "Only .doc and .docx Word documents are supported.",
  };
}
