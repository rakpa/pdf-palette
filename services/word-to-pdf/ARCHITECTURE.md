# Word to PDF Conversion Service — Architecture

## Overview

Local-only Word (`.doc` / `.docx`) → PDF conversion using **LibreOffice Headless** (`soffice --headless --convert-to pdf`). No external SaaS conversion APIs.

```
┌─────────────┐     streaming      ┌──────────────────┐     BullMQ      ┌─────────────────┐
│  React SPA  │ ─── upload ──────► │  Express API     │ ─── enqueue ──► │  Redis Queue    │
│  (Vite)     │ ◄── PDF stream ─── │  :3001           │                 │                 │
└─────────────┘                    └──────────────────┘                 └────────┬────────┘
                                                                                 │
                                                                                 ▼
                                                                        ┌─────────────────┐
                                                                        │  Worker process │
                                                                        │  LibreOffice    │
                                                                        │  child process  │
                                                                        └─────────────────┘
```

## Components

| Component | Responsibility |
|-----------|----------------|
| **API** (`src/index.ts`) | Streaming multipart upload, job enqueue, wait, PDF response stream |
| **Worker** (`src/worker.ts`) | BullMQ consumer, spawns LibreOffice, validates output |
| **LibreOffice runner** | `soffice --headless --convert-to pdf` with isolated user profile per job |
| **Validators** | Encrypted/corrupt Office detection; PDF structural validation |
| **Temp workspace** | Per-job isolated directories; cleaned in `finally` / stream `end` |

## Request Flow

1. Client `POST /v1/word-to-pdf/convert` with `multipart/form-data` field `file`
2. API streams upload to `{TEMP_ROOT}/job-{uuid}/input/` (no full-memory buffering)
3. API enqueues BullMQ job with workspace paths
4. Worker validates Office file (encryption, corruption)
5. Worker runs LibreOffice headless with dedicated profile directory
6. Worker validates generated PDF (`%PDF-` header, page count via `pdf-lib`)
7. API streams PDF to client
8. Temp workspace cleaned after stream completes (input, output, profile, LO artifacts)

## Fidelity

LibreOffice headless preserves fonts, tables, images, headers/footers, page breaks, margins, and section orientation — the same engine used by desktop LibreOffice.

## Failure Modes

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Password-protected file | 422 | Detected pre-conversion (ZIP/OLE) or from LO stderr |
| Corrupted file | 422 | Invalid ZIP/OLE structure |
| File too large | 413 | Busboy `fileSize` limit |
| Conversion timeout | 504 | Process tree killed after `CONVERSION_TIMEOUT_MS` |
| Invalid PDF output | 500 | Post-conversion validation fails |
| LibreOffice missing | 503 | `/health` reports `libreOffice: false` |

## Folder Structure

```
services/word-to-pdf/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── src/
│   ├── index.ts              # API entry
│   ├── worker.ts             # Worker entry
│   ├── app.ts                # Express app
│   ├── config.ts             # Zod-validated env
│   ├── logger.ts             # Pino structured logging
│   ├── lib/
│   │   ├── libreoffice.ts    # Child process + timeout
│   │   ├── office-file-validator.ts
│   │   ├── pdf-validator.ts
│   │   ├── streaming-upload.ts
│   │   └── temp-workspace.ts
│   ├── queue/
│   │   ├── connection.ts     # BullMQ + Redis
│   │   └── word-to-pdf.processor.ts
│   └── routes/
│       ├── health.ts         # /health, /metrics
│       └── word-to-pdf.ts    # /v1/word-to-pdf/*
```

## Operations

### Local development

```bash
# Terminal 1 — Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2 — API
cd services/word-to-pdf && npm install && npm run dev

# Terminal 3 — Worker
cd services/word-to-pdf && npm run dev:worker

# Terminal 4 — Frontend
npm run dev
```

### Docker (production-like)

```bash
cd services/word-to-pdf
docker compose up --build
```

### Monitoring

- `GET /health` — Redis + LibreOffice availability, queue depth
- `GET /metrics` — Prometheus text format (waiting/active/completed/failed jobs)
- Structured JSON logs via Pino (`jobId`, `workspaceId`, durations)

## Security

- Files never leave your infrastructure
- Per-job temp directories with forced cleanup
- Upload size limits enforced during streaming
- Isolated LibreOffice user profile per conversion (prevents profile lock contention)

## Implementation Plan (completed)

1. ✅ LibreOffice headless child-process runner with timeout + kill tree
2. ✅ BullMQ queue for backpressure and concurrency control
3. ✅ Streaming multipart upload via Busboy
4. ✅ Pre/post validation (Office + PDF)
5. ✅ Express API with health/metrics
6. ✅ Docker + docker-compose (API + worker + Redis)
7. ✅ Frontend wired to local `/api/word-to-pdf/convert` proxy
