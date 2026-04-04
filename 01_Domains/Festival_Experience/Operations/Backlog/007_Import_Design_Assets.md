# Operations Item: Import Design Assets and Docs from festival-schedule Repo

**Date:** 2026-04-04
**Status:** Ready
**Assigned to:** Designer + Operations Manager

## Description
Move design assets, product docs, marketing materials, and documentation from `~/Projects/WeDance` (remote: razbakov/festival-schedule) into the appropriate domain folders under `01_Domains/Festival_Experience/` in this repository.

## Scope

### Design assets (`design/` -> domain structure)
- `design/assets/` — visual assets (logos, icons, images)
- `design/brand.md` — brand guidelines
- `design/styles/` — style definitions
- `design/ux/` — UX research and wireframes

**Target:** `01_Domains/Festival_Experience/Design/` (create directory if needed)

### Product docs (`product/` -> domain structure)
- `product/festival-schedule/` — festival schedule product specs and docs
- Skip `product/meetup-planner/` (dormant domain, not needed now)

**Target:** `01_Domains/Festival_Experience/Product/` (create directory if needed)

### Marketing materials (`marketing/` -> domain structure)
- `marketing/meetup-planner/` — skip (dormant domain)

**Target:** Only import if festival-schedule-related content exists

### Documentation (`docs/`)
- `docs/festival-pipeline-2026-Q2.md` — pipeline doc relevant to current strategy

**Target:** `01_Domains/Festival_Experience/Operations/` or appropriate subdirectory

## Out of scope
- Meetup planner content (dormant domain — do not import)
- Restructuring or rewriting the imported content
- Creating new design assets

## Source
- Repo: `~/Projects/WeDance` (remote: razbakov/festival-schedule)
- Directories: `design/`, `product/festival-schedule/`, `docs/`

## Dependencies
- None (can run in parallel with O-006 since files do not overlap)

## What I Learned
_(To be filled by assigned agents after completion per Policy 004)_
