# Word to PDF — Simple Setup

## What you need

1. **LibreOffice** — for Word → PDF ([libreoffice.org](https://www.libreoffice.org/))
2. **Python 3.10+** — for PDF → Word layout reconstruction
3. **Node.js**

No Redis, no Docker, no cloud APIs.

---

## First time only

```powershell
cd C:\RAKESH\pdf-palette
npm run setup
```

This installs Node packages **and** Python packages (`pdf2docx`, `PyMuPDF`, etc.).

If `pip` fails, install Python from [python.org](https://www.python.org/downloads/) and check **“Add Python to PATH”**, then run:

```powershell
npm run setup:python
```

---

## Every time you use the app

```powershell
cd C:\RAKESH\pdf-palette
npm run dev
```

- **Word → PDF:** http://localhost:8080/word-to-pdf (LibreOffice)
- **PDF → Word:** http://localhost:8080/pdf-to-word (pdf2docx — layout, images, tables, code)

---

## PDF → Word engine

Uses **pdf2docx** locally to reconstruct:

- Page layout, margins, spacing, page breaks  
- Embedded images at original resolution  
- Tables as editable Word tables  
- Fonts and colors where available in the PDF  
- Monospace / code blocks (Consolas + preserved indentation)  
- OCR pass for scanned PDFs (if `ocrmypdf` + Tesseract are installed)

---

## Production Deployment (Vercel + separate converter service)

The frontend (Vite/React) is deployed on **Vercel**.

The Word/PDF conversion logic runs in a separate **Node.js + LibreOffice** microservice (see `services/word-to-pdf/`). This service **cannot** run on Vercel serverless functions (needs LibreOffice binary and longer execution time).

### Step-by-step production setup

1. **Deploy the conversion service** (choose one):
   - **Recommended**: Render.com, Fly.io, or Railway (one-click Docker deploy)
   - Use the provided `services/word-to-pdf/Dockerfile` and `docker-compose.yml`
   - After deploy you will get a public URL, e.g. `https://pdf-palette-converter.onrender.com`

2. **On your Vercel frontend project**, add an Environment Variable:
   - Name: `VITE_CONVERSION_PREFIX`
   - Value: the **full public base URL** of the service you just deployed (no trailing slash)
     Example: `https://pdf-palette-converter.onrender.com`
   - Redeploy the frontend on Vercel.

3. The app will now call your converter directly (no more 405/ network errors).

> **Important**: The old internal prefix `/_/word-to-pdf` is no longer used as fallback. You **must** set `VITE_CONVERSION_PREFIX` for production Word → PDF (and other conversion tools) to work.

---

## Quick reference

| Step | Command |
|------|---------|
| First time | `npm run setup` |
| Start app | `npm run dev` |
| Word → PDF | http://localhost:8080/word-to-pdf |
| PDF → Word | http://localhost:8080/pdf-to-word |
