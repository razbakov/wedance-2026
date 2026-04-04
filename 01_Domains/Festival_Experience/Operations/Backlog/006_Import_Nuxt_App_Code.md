# Operations Item: Import Nuxt App Code from festival-schedule Repo

**Date:** 2026-04-04
**Status:** Ready
**Assigned to:** Engineer

## Description
Move the existing Nuxt app codebase from `~/Projects/WeDance/engineering/nuxt-app/` (remote: razbakov/festival-schedule) into the `app/` directory of this repository (razbakov/wedance-2026). This brings the working code into the monorepo so all future development happens here.

## Scope
- Copy the full `engineering/nuxt-app/` directory contents into `app/`
- Preserve directory structure (nuxt.config.ts, server/, public/, components.json, drizzle.config.ts, e2e/, etc.)
- Exclude `node_modules/` and any local env files (.env.local, .env)
- Exclude `playwright-report/` (generated artifact)
- Verify the app builds after import (`bun install && bun run build` or equivalent)
- Update any path references if needed (e.g., in nuxt.config.ts or tsconfig.json)
- Add a brief note in a commit message referencing the source repo and commit hash

## Out of scope
- Refactoring the app code
- Changing the tech stack or dependencies
- Setting up CI/CD (separate item)
- Design or product changes

## Source
- Repo: `~/Projects/WeDance` (remote: razbakov/festival-schedule)
- Directory: `engineering/nuxt-app/`
- Key files: nuxt.config.ts, package.json, bun.lockb, drizzle.config.ts, server/, public/, e2e/, vitest.config.ts, playwright.config.ts

## Dependencies
- None (this is foundational — other items depend on this being done)

## What I Learned
_(To be filled by Engineer after completion per Policy 004)_
