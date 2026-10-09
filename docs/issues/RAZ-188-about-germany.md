---
title: "About Germany"
type: Task
id: RAZ-188
status: done
state: Done
state_type: completed
project: null
labels: []
assignee: null
creator: "Aleksey Razbakov"
priority: "No priority"
estimate: null
parent: null
created: 2026-09-09T06:53:40.167Z
started: "2026-09-09T06:55:46.096Z"
completed: "2026-09-23T07:55:20.004Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-188/about-germany
exported: 2026-10-09
---

# RAZ-188 — About Germany

[https://razbakov.com/ru/blog/2016-02-04-germany](<https://razbakov.com/ru/blog/2016-02-04-germany>) 

This post doesn't have all translations 

And some images are missing

## Comments

### Aleksey Razbakov · 2026-09-09 07:06 UTC

**Dispatched by autopilot → routed via Matrix → Neo.**

**PR:** https://github.com/razbakov/homepage/pull/52
Branch `razbakovaleksey/raz-188-about-germany` · preview https://razbakovcom-git-razbakovaleksey-raz-188-about-germany-wedance.vercel.app

**What changed:** added `de`, `es`, `uk` translations and split the `ru` original into `2016-02-04-germany-ru.md`, leaving `2016-02-04-germany.md` as the English default — 5 locales, +378/−32 across 5 files, with translation cross-links in frontmatter matching the `2018-06-11-munich` convention.

**⚠️ The translations half is done; the images half is not — it is unreproduced, not fixed.**
The post references 5 Medium CDN images. Dispatcher verification just now:

- all 5 return `200` with real JPEG bytes, direct and with a `https://razbakov.com/` referer (so not hotlink-blocked);
- all 5 are present in the live `ru` page HTML.

So no missing image was found from the source side, and the agent changed nothing here — it asserted "no regeneration needed" without diagnosing what you actually saw. If images look missing to you, it is likely client-side (browser blocking Medium CDN, an ad/tracker blocker, a regional block, or the image component's lazy-load) rather than a broken reference. **Worth saying which browser/network you saw it on** — or, better, deciding to self-host the 5 images in the repo so the post stops depending on Medium's CDN at all. That would close the ask properly and is a small follow-up.

Left **In Progress** — the PR is the review signal. Not merged; merge is yours.

### ↳ reply · Aleksey Razbakov · 2026-09-09 07:49 UTC

Images should be in the repository
