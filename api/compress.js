import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile.js";

// Vercel serverless function: compress a PDF with the iLovePDF API.
// The API keys live in environment variables (ILOVEPDF_PUBLIC_KEY /
// ILOVEPDF_SECRET_KEY) and never reach the browser. The client POSTs raw PDF
// bytes and gets the compressed PDF back. The `level` query param maps 1:1 to
// iLovePDF's compression_level (low | recommended | extreme).

async function readRawBody(req) {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (req.body instanceof Uint8Array) return Buffer.from(req.body);
    if (typeof req.body === "string") return Buffer.from(req.body, "binary");
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const secretKey = process.env.ILOVEPDF_SECRET_KEY;
  if (!publicKey || !secretKey) {
    // 501 → the client quietly falls back to in-browser (Ghostscript) compression.
    res.status(501).json({ error: "iLovePDF is not configured on the server." });
    return;
  }

  let buffer;
  try {
    buffer = await readRawBody(req);
  } catch {
    res.status(400).json({ error: "Could not read request body." });
    return;
  }
  if (!buffer || buffer.length === 0) {
    res.status(400).json({ error: "Empty request body." });
    return;
  }

  const allowed = ["low", "recommended", "extreme"];
  const requested = (req.query?.level || "").toString();
  const level = allowed.includes(requested) ? requested : "recommended";

  try {
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("compress");
    await task.start();
    await task.addFile(ILovePDFFile.fromArray(new Uint8Array(buffer), "document.pdf"));
    await task.process({ compression_level: level });
    const data = await task.download();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=compressed.pdf");
    res.status(200).send(Buffer.from(data));
  } catch (err) {
    res.status(502).json({
      error: err?.message ? `iLovePDF: ${err.message}` : "iLovePDF compression failed.",
    });
  }
}
