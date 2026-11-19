---
name: pr-checklist
description: >
  Run before opening a pull request, creating a PR, updating a PR, or marking one ready for review.
  Flags and blocks review until all seven checks pass: clickable demo paths with no URL edits, BDD coverage,
  preview uploads and data, one language, blueprints in sync with the code, desktop and mobile screenshots,
  and a video walkthrough. Use when calling ManagePullRequest, gh pr create, or writing a pull request description.
---

# Pre-PR checklist

Load this skill before a pull request goes up for review. Run the checker. If it exits 1, the PR stays a draft: do not mark it ready, do not ask for review, and put the failing report at the top of the description.

```bash
bun scripts/ci/pr-checklist.ts --evidence /tmp/pr-checklist.evidence.json
```

Exit 0 means every check passed or does not apply. Exit 1 blocks review. Exit 2 means the base ref or git diff could not be read. Do not pass `--no-probe`: the script POSTs to the preview's upload endpoint itself so a pasted status cannot hide a 503.

Paste the script's report into the PR body under the summary. Attach the screenshots and the video it names.

## When a check does not apply

Checks 1, 2, 3, 6 and 7 are n/a only when the diff has no user-visible screen. A user-visible screen is a vue file under `app/pages/` (including sketches) or `app/components/`, except `app/pages/docs/` and `app/components/docs/` and `app/components/ui/`. Docs, scripts, server-only changes and design-system primitives have nothing to demo.

Do not set `noDemo` to skip a screen you changed. A copy tweak on a page is still a demo.

## Order of work

1. List the demo paths a reviewer will be shown. One path is one journey a dancer can finish.
2. Make every step a control in the UI. The only address you may open is the site origin (`https://pr-<n>.dev.wedance.vip/` or local, for yourself). If the next step needs a URL edit, add the link first.
3. Cover that journey with a `Scenario` in `e2e/features/` before anyone sees the PR. A new page needs the feature file in this diff.
4. Update the journey blueprint in `app/lib/blueprint-*.ts` (routes, notes, `updated` date) or record why it did not change.
5. Open the PR as a **draft** so the preview exists. Previews are `https://pr-<n>.dev.wedance.vip` with a scrubbed copy of production: sign up fresh, emails are not sent.
6. On that preview, probe uploads and set up the data the screen filters on. Then walk every path by clicking, at desktop (1280px or wider) and at 375px, and record one video that walks every path.
7. Write the evidence file, run the script, and only then mark the PR ready.

## The seven checks

The bar is the 2026-11-18 walkthrough of RAZ-1071 on PR 674, which could not be demoed.

### 1. Clickable end to end

Pass: from the origin, every later step is a click, tap or a field you fill. `clickedOnly` is true. At least two steps, each naming the control.

Fail: opening `/meet/ritual` (or any other path) by editing the address bar. That is what the PR 674 walkthrough had to do.

### 2. BDD before it is shown

Pass: `bddFeature` is an `e2e/features/*.feature` file on this branch, and `bddScenario` matches a `Scenario` or `Scenario Outline` title in it. A page added in this diff also updates a feature file in this diff.

Fail: the flow is only described in the PR, or the cited scenario is not in the file.

### 3. Preview uploads and data

Pass: `preview.url` is `https://pr-<n>.dev.wedance.vip`. `POST /api/media/image` with an empty body is 400 (no file) or 401/403 (auth). It must not be 503 and the body must not say `Image upload is not configured`. `dataNotes` says what the demo needed and that it was present.

Fail: the preview that hid the two test dancers. Meet only lists a profile that has a photo, and a saved city is not enough — the dance card needs a role and dances, or the deck stays empty and can still say "Add my city". New accounts on a preview have no photo until upload works. Localhost does not stand in for this check.

Cloudinary on the preview is `NUXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY` and `NUXT_CLOUDINARY_API_SECRET` in the preview `app.env`. You cannot fix that box from the PR. Block, and say the preview is not demoable.

### 4. One language

Pass: every string on the demo screens is in one language, `en` or `de`. Set `language` and `languageReviewed: true` after reading the screens, not only the diff. The script also fails if added copy in the diff mixes German and English (a German function word and an English one in the same change). A name like München inside an English sentence is not German.

Fail: the mixed German and English on the meet ritual screen.

### 5. Blueprints match the code

Blueprints live in `app/lib/blueprint-*.ts` and are drawn at `/docs/blueprints/*`. The meet journey is `blueprint-meet-friends.ts`.

Pass: a screen you changed is either updated in the blueprint that cites its route or component (and the blueprint's `YYYY-MM-DD` date is bumped in the diff), or you list that file in `blueprintsReviewed` with a four-word `unchangedBecause`. A new page is cited by a blueprint route, or `newPageNotes.whyNoBlueprint` says why it is not a journey step. Routes resolve including `definePageMeta` `path` and `alias` (`/@handle/book` is `app/pages/book/[handle].vue`; `/ask/[token]` is an alias of `confirm/[token]`).

Fail: shipping a flow the blueprint still describes as missing, or citing a route that has no page.

### 6. Desktop and mobile screenshots

Pass: every demo path has two different files, desktop (1280px or wider) and mobile (375px wide). png, jpg or webp, at least 8KB, and the files exist (or are https URLs of those types).

### 7. A video of every path

Pass: a video walks every demo path by clicking, the same way a reviewer would. mp4, webm or mov, at least 10KB. One recording may cover several paths if it actually walks each of them. Follow the walkthrough-artifacts skill: record the successful click-through, not a failed attempt.

## Evidence file

Do not commit this file. It is the input to the script.

```json
{
  "demoPaths": [
    {
      "name": "Book the meetup after a match",
      "clickedOnly": true,
      "steps": [
        "Open the preview https://pr-674.dev.wedance.vip/",
        "Click Your dance friends on My plan",
        "Click Book the meetup"
      ],
      "bddFeature": "e2e/features/meet-ritual.feature",
      "bddScenario": "Book the meetup after a match",
      "screenshots": {
        "desktop": "/opt/cursor/artifacts/meetup-desktop.png",
        "mobile": "/opt/cursor/artifacts/meetup-mobile.png"
      },
      "video": "/opt/cursor/artifacts/meetup-walkthrough.mp4"
    }
  ],
  "language": "en",
  "languageReviewed": true,
  "preview": {
    "url": "https://pr-674.dev.wedance.vip",
    "dataNotes": "Both new dancers have a photo, Munich, a role and two dances, and they see each other on Meet."
  },
  "blueprintsReviewed": ["app/lib/blueprint-meet-friends.ts"],
  "blueprintNotes": [
    {
      "file": "app/lib/blueprint-meet-friends.ts",
      "unchangedBecause": "Copy only. No step, route or mark moved."
    }
  ]
}
```

For a change with no screen:

```json
{ "noDemo": true, "noDemoReason": "Server-only fix. No page or feature component changed." }
```

`uploadStatus` and `uploadBody` are filled by the script's probe. Leave them out.
