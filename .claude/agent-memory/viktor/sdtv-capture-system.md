# SDTV Capture System — Technical Context

last_updated: 2026-04-06

## Project Overview

**SDTV Capture** — веб-форма для записи танцев на фестивалях + CLI для пост-продакшна.
Стек: Node.js (Express) + vanilla JS frontend + Airtable backend.
Код: `C:/tmp/sdtv-capture/`
Деплой: пока localhost:8000, zip передан для деплоя на Railway.

## Architecture

```
index.html + app.js (frontend)
       |
   server.js (Express API, port 8000)
       |
   Airtable (via REST API)
       |
   schema.js (shared types, validators — works in Node + browser)
   clip-match.js (CLI tool — post-production pipeline)
```

## Airtable Structure

Base: **SDTV Dance Capture System** (`appsgtrfnVi2IccFb`)

### Tables

| Table | ID | Purpose |
|-------|-----|---------|
| Festivals | tblfxBXaajR8Pny9k | Festival metadata, status |
| People | tblZR7aYmeSGvPqE2 | Dancer contacts (IG, email, name) |
| Captures | tblgiQssV0qnosiUl | Each filmed dance (2 partners, metadata) |
| Clips | tbl4SqKCD9F65l48y | Individual video files, editing status, delivery |
| Notifications | — | Notification flow tracking |
| Photo Leads | — | Photo-related leads |

### Key Fields — Captures
- Dance ID (e.g. MAM26-020) — prefix = festival code + year
- Session (Thursday/Friday/Saturday/Sunday)
- Partner 1/2: IG, Email, Name
- Video Title (auto: "Partner1 & Partner2")
- Dance Style (Salsa/Bachata/Kizomba)
- Delivery Format (YT+IG / YT / IG) — singleSelect
- Source, Status, Notification Flow, Contact Type
- Solo Capture flag
- Dance # (auto-increment per session)

### Key Fields — Clips
- Clip ID (e.g. MAM26-020-C0010) — Dance ID + file
- Expected File (e.g. C0010.MP4)
- Video Title — from Captures
- Festival — text (e.g. "Mambo Italiano 2026")
- Session, Status, Match Status
- Delivery Format (YT+IG / YT / IG)
- Preview URL, Final URL
- Actual File

### Clip Status Flow
`Filmed → Edited → Delivered`

### Match Status
`Expected → Matched → Missing`

### Dance ID Convention
`{FESTIVAL_CODE}{YY}-{NNN}` — e.g. MAM26-001, FES26-001
- MAM = Mambo Italiano
- Festival code derived from festival name

## Capture Form (Staff Mode)

### Flow
1. Staff mode: set Festival, Videographer, Day, File pointer, Dance Style, Mode, Delivery Format
2. Switch to capture mode
3. For each dance: enter Partner 1 (IG/email/name), optionally Partner 2
4. Submit → creates Capture + Clip + People records in Airtable
5. File pointer auto-increments

### Modes
- **Handoff** — standard: both partners enter their data
- **Quick** — fast capture: minimal data
- **Artist** — artist collaboration: sets Contact Type = 'Artist'

### Delivery Format Toggle
- **YT+IG** — both YouTube and Instagram versions (default)
- **YT** — YouTube only
- **IG** — Instagram only
- Persists between captures (not reset), staff changes when needed
- Flows to Clips table on creation

### Validation (v5)
IG no longer required. Valid if any of:
- Partner 1 IG present (2+ chars)
- Partner 1 Email present (valid format)
- Partner 1 Name present (2+ chars)

## CLI Tool: clip-match.js

5 commands for post-production pipeline:

### match
Renames raw camera files to dancer names.
`node clip-match.js match --dir ./raw --event MAM26`
Scans Airtable for captures, renames C0001.MP4 → "Adolfo & Laura.MP4"

### export
Generates editor task sheet grouped by session.
`node clip-match.js export --event MAM26`
Shows format info (YT/IG/both) for each clip.

### verify
Checks deliverables against expected clips.
`node clip-match.js verify --dir ./edited --event MAM26`
Reports missing/extra files.

### invoice
Calculates editor payment.
`node clip-match.js invoice --event MAM26 [--dir ./edited] [--yt N --ig N] [--aftermovie] [--tracking N] [--animation N]`
Sources: Dropbox folder scan, manual flags, or Airtable Delivery Format field.

### ingest
Writes Final URLs to Clips table after editor uploads.
`node clip-match.js ingest --dir ./final --event MAM26 [--apply]`
Dry run by default, --apply to execute. Batches of 10.

## Editor Rate Model

| Type | Rate |
|------|------|
| YouTube base | 100 RUB/video |
| Instagram | 120 RUB/video (base + 20 surcharge) |
| Aftermovie | 6,000 RUB fixed |
| Animation | ~2,120 RUB |
| Tracking | ~50 RUB/video (rare, centering dancers) |

Verified on DHI festival: 49 YT + 71 IG = 13,420 RUB (exact match).

## Server API Endpoints

- `GET /api/festivals` — list active festivals
- `GET /api/counter?festival=...&session=...` — dance count per session
- `POST /api/captures` — submit capture (creates Capture + Clip + People)
- Static files served from project root

## Environment

- `AIRTABLE_TOKEN` — required (Airtable personal access token)
- `PORT` — optional, default 8000
- Token stored in `.claude/launch.json` env for local dev

## User Plan Limitations

- Airtable **FREE plan** — no Scripting extension available
- Invoice/automation logic stays in CLI, not Airtable scripts
- Future: may add invoice view to staff mode web UI
