# SDTV — Business Processes & Operations Context

last_updated: 2026-04-06

## Tool Stack & CRM Architecture

### Monday.com — Operational Center
- Deals, execution, follow-ups, delivery tracking
- Source of truth for all execution
- Gig CRM via separate Gig Agent project (~/Documents/Projects CURSOR/gig-agent)
- Monday + Telegram integration for gig management

### Notion — Knowledge Layer
- Structure, playbooks, context, client knowledge
- NOT task management
- Support layer for clarity and reference

### Airtable — Capture & Asset Support
- SDTV Dance Capture System (base: appsgtrfnVi2IccFb)
- Real-time event data capture (dancers, clips, contacts)
- 6 tables: Festivals, People, Captures, Clips, Notifications, Photo Leads
- Free plan (no Scripting extension)
- Form system for on-site videographer workflow

### Telegram — Command Layer
- Founder <-> system communication
- Telegram bots (planned, not active yet)

## SDTV Production Pipeline

### On-Site (Festival Day)
```
Staff sets up form (festival, day, videographer, style, format)
    ↓
For each dance: capture partner data (IG/email/name)
    ↓
Submit → Airtable: Capture + Clip + People records created
    ↓
File pointer auto-increments (C0001 → C0002 → ...)
```

### Post-Production
```
1. MATCH  — rename raw files to dancer names (clip-match.js match)
2. EXPORT — generate task sheet for editor (clip-match.js export)
3. Editor works — creates YT and/or IG versions
4. VERIFY — check all expected files delivered (clip-match.js verify)
5. INGEST — write Final URLs to Airtable (clip-match.js ingest)
6. INVOICE — calculate editor payment (clip-match.js invoice)
```

### Clip Status Flow
`Filmed → Edited → Delivered`

### Delivery Format Options
- **YT+IG** — both versions (default, most common)
- **YT** — YouTube only
- **IG** — Instagram only
- Set per-capture by videographer, flows to Clips table

## Editor Relationship

- External editor, paid per video
- Rates: YT=100р, IG=120р (+20 surcharge), aftermovie=6000р fixed
- Tracking (centering dancers) = extra ~50р/video, rare
- Editor prefers dancer names in filenames (match command handles this)
- Task sheet (export command) gives clear instructions with format per clip

## Festival Workflow

### Before Event
- Festival confirmed in Monday (deal stage)
- Airtable festival record created (name, dates, videographer)
- Form configured for the event

### During Event
- Staff uses capture form on phone/tablet
- Each session (day) tracked separately
- Dance counter per session for Dance ID generation
- Delivery Format set once, changed when needed

### After Event
- Raw files renamed and organized (match)
- Editor gets task sheet (export)
- Editor delivers, files verified (verify)
- URLs ingested to Airtable (ingest)
- Editor invoiced (invoice)
- Clips delivered to dancers (notification flow — future)

## Key Business Rules

1. **Dance ID** = unique identifier per dance: `{FEST_CODE}{YY}-{NNN}`
2. **Clip ID** = Dance ID + file number: `MAM26-020-C0010`
3. **Video Title** = "Partner1 & Partner2" (auto-generated)
4. **IG not required** — dancers can be identified by email or name alone
5. **File pointer persists** between captures, resets per camera restart
6. **Delivery Format persists** between captures (staff sets once)
7. **Festival filter** in Clips table — group by Festival for per-event view

## Data Flow

```
Capture Form → Airtable (Captures + Clips + People)
                  ↓
           clip-match.js CLI
                  ↓
        Editor workflow (Dropbox/cloud)
                  ↓
           clip-match.js ingest → Airtable (Final URLs)
                  ↓
        Delivery to dancers (future: notification system)
```

## Current Festivals in System
- **Mambo Italiano 2026** (MAM26) — 12 real clips, active data
- **Test Fest** — 2 test records

## Team Roles in Pipeline
- **Кирилл** — filming, form operation, file management, editor communication
- **Wife** — SMM, photo, content posting
- **Editor** — external, video editing per task sheet
- **Agents** — support: task sheets, invoicing, verification, CRM logic
