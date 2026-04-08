# SDTV Client Form v3

**Recorded:** 2026-04-08
**Project:** SDTV
**Owner:** Viktor (technical), Kirill (product)

## Location & Launch

- **Source:** `C:/Users/ASUS/AppData/Local/Temp/sdtv-form/` (extracted from `D:/SDTV Form v3.zip`)
- **Server:** port 8001, backed by Airtable + Stripe + ffmpeg preview generation
- **Launch config:** `.claude/launch.json` → "SDTV Client API"

## What It Does

B2C-facing form with 7 flows:
1. Find My Dance
2. Reserve Filming
3. Grow Visibility
4. Not Sure
5. Walk-up
6. Monday Morning
7. Status Check

## Video Preview System

- ffmpeg generates 720p / 10s / faststart previews (~2.6MB) from Dropbox 4K originals (~384MB)
- Cached in `.preview-cache/`
- Video proxy with 150MB ceiling

## Security

- XSS escape on all outputs
- Formula injection sanitization
- Security headers applied
- Video proxy size ceiling (150MB)

## Code Quality

- JSDoc with @ts-check
- View Transitions API
- Container queries
- Service Worker
- Haptic feedback

## Current Score

**~8.5/10**

To reach 9/10:
- E2E tests (Playwright) — queued
- Dropbox auto-match script (folder scanner → Airtable matcher → preview generator) — queued

Both are **Viktor tasks**.

## Status

Production-ready at current quality. Next iteration is hardening and automation.
