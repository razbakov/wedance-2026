# SDTV Admin Panel & Brief — Current State

last_updated: 2026-04-09

## Project Location
- Code: `C:\tmp\sdtv-capture\`
- ZIP: `C:\tmp\sdtv-capture.zip`
- Last commit: `758fe05` on `master` branch
- Server: `node server.js` with env `AIRTABLE_TOKEN`
- Port: 8000

## Pages
- `/` — Capture form (staff mode for filming)
- `/admin` — Operations panel (PIN: `sdtv2026`)
- `/brief/{event}` — Editor brief page (e.g. `/brief/MAM26`)

## Admin Panel (`admin.html`)
- 4 tabs: Setup → Production → Matching → Connect
- PIN auth (sessionStorage), localStorage save/restore
- Contextual summary chips per tab
- Next step guidance bar
- Result cards above activity log
- Shimmer loading on buttons
- All paths saved between sessions (festival, folders, URLs)

### Tab: Setup
- Local folder (raw files) + Browse button
- Cloud base URL + Copy/Open
- Readiness dots (Festival/Folder/Cloud)
- Event summary card (right column)
- Quick links: Monday, Notion, Airtable

### Tab: Production
- Editor Brief Settings (RAW link, upload link, festival logo URL, branding mode)
- "Open brief page" button → `/brief/{event}`
- Export task sheet → `/api/admin/export`
- Calculate invoice → `/api/admin/invoice` (aftermovie, tracking, animation extras)

### Tab: Matching
- Match dancer names → `/api/admin/match` (preview + apply with confirm)
- Verify deliverables → `/api/admin/verify-fuzzy` (with Levenshtein fuzzy matching)
- Session-aware sorting: Thursday→Friday→Saturday→Sunday

### Tab: Connect
- Separate fields: editor output folder + cloud URL for finished videos
- Generate previews → `/api/admin/previews` (FFmpeg: 10s clip + thumbnail)
- Connect deliverables → `/api/admin/ingest` (write URLs to Airtable Clips table)

## Brief Page (`brief.html`)
- Premium dark UI, Linear/Stripe-inspired
- RU/EN language toggle (top-right pill)
- Header: SDTV logo + festival name + meta + auto-deadline (+2 weeks, amber)
- KPI cards: Files, YouTube, IG Reels, Dancers (with icons)
- 2-column layout: Info (metrics) + Links (RAW folder, Upload folder)
- Fallback links: MyAirBridge for RAW, Dropbox for upload
- Branding section: SDTV logo (downloadable) + Festival logo (downloadable)
- Video list: Linear-style items grouped by session
- Clickable format badges (YT+IG → YT → IG cycle, saves to Airtable via PATCH)
- Cascade animations on load
- Print CSS included

## API Endpoints
- `GET /api/festivals` — list festivals
- `GET /api/captures/next-number` — dance counter
- `POST /api/captures` — create capture + clip
- `GET /api/admin/export?event=MAM26` — task sheet data
- `GET /api/admin/invoice?event=MAM26&aftermovie=1&tracking=3&animation=2120` — invoice
- `GET /api/admin/match?event=MAM26&dir=...&apply=1` — match files
- `GET /api/admin/verify-fuzzy?event=MAM26&dir=...` — verify with fuzzy
- `GET /api/admin/ingest?event=MAM26&dir=...&url=...&apply=1` — connect deliverables
- `GET /api/admin/previews?dir=...&out=...&apply=1` — FFmpeg previews
- `PATCH /api/captures/:id/format` — update delivery format
- `GET /api/brief/:event` — brief data (with record IDs for format toggle)
- `POST /api/verify-pin` — PIN auth

## Pending Work for Next Session
1. Premium redesign of brief page (SVG social icons, glassmorphism, enhanced animations)
2. Deploy to Railway
3. Archive names from paper notebooks
4. Test on real festival data
5. Remove dead code / cleanup

## Assets
- `sdtv-logo.png` — SDTV logo with shadow (2.4MB)
- `festival-logo-example.png` — The Dance House logo example (329KB)

## Airtable IDs
- Base: `appsgtrfnVi2IccFb`
- Captures: `tblgiQssV0qnosiUl`
- Clips: `tbl4SqKCD9F65l48y`
- Festivals: `tblfxBXaajR8Pny9k`
- People: `tblZR7aYmeSGvPqE2`
