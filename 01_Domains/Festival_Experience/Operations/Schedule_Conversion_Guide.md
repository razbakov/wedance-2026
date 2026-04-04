# Schedule Conversion Guide

Step-by-step process for converting a festival's existing schedule into the WeDance structured data format.

## Overview

Festival schedules arrive in many forms: PDFs, Instagram screenshots, website pages, printed flyers photographed with a phone, or spreadsheets emailed by organizers. This guide standardizes how we extract that information and produce a clean JSON file conforming to `schedule_schema.json`.

## Prerequisites

- A copy of the source material (saved in the repo or described in the PR)
- The `schedule_schema.json` file for field reference
- The `schedule_template.csv` file if working with an organizer who prefers spreadsheets

## Step 1: Gather source material

Collect every version of the schedule you can find. Festivals often publish schedules in multiple places with slight differences.

**Common sources:**
- Festival website (most authoritative)
- Instagram posts or stories
- Facebook event pages
- PDF attachments in emails
- Photos of printed flyers or posters
- WhatsApp or Telegram group messages

**Save sources locally.** Copy files into the repo under `01_Domains/Festival_Experience/Operations/Sources/<festival-slug>/`. Never rely on external links that may break.

Record what you collected:

```
Source 1: Website schedule page (screenshot saved as source_website.png)
Source 2: Instagram story (screenshot saved as source_instagram.png)
Source 3: PDF from organizer email (saved as source_schedule.pdf)
```

## Step 2: Extract festival metadata

From the source material, identify:

| Field | Example | Notes |
|-------|---------|-------|
| Festival name | Munich Salsa Congress 2026 | Use official name |
| Start date | 2026-06-12 | ISO 8601 (YYYY-MM-DD) |
| End date | 2026-06-14 | ISO 8601 (YYYY-MM-DD) |
| Timezone | Europe/Berlin | IANA format, critical for correctness |
| Venue | Kulturzentrum Gasteig | Primary venue name |
| City | Munich | |
| Country | DE | ISO 3166-1 alpha-2 |

**Timezone is the most common source of errors.** Always verify the timezone of the festival location. Use https://www.timeanddate.com/ if unsure.

## Step 3: Identify rooms and stages

List all distinct rooms, halls, or stages mentioned in the schedule. Assign each a short ID:

| Room name (as printed) | Assigned ID | Notes |
|------------------------|-------------|-------|
| Main Hall | main-hall | |
| Studio A | studio-a | |
| Panorama Terrace | terrace | Outdoor, weather-dependent |

If a room name is ambiguous or inconsistent across sources (e.g., "Room 1" in one place and "Studio 1" in another), pick one canonical name and note the discrepancy.

## Step 4: Extract workshop entries

Go through the schedule systematically, one day and time slot at a time. For each workshop, extract:

| Field | Required | Notes |
|-------|----------|-------|
| name | Yes | Workshop title exactly as printed |
| artist | No | Instructor name(s). Use "TBA" if not announced |
| day | Yes | YYYY-MM-DD |
| startTime | Yes | HH:MM in 24-hour format |
| endTime | Yes | HH:MM in 24-hour format |
| roomId | Yes | Must match a room ID from Step 3 |
| danceStyle | No | Use controlled vocabulary from schema |
| level | No | beginner, intermediate, advanced, all-levels |
| description | No | Longer text if available |
| tags | No | Additional categorization |

**Working method:** Use the CSV template for initial extraction. Fill one row per workshop. This makes it easy to spot gaps (empty cells) and duplicates.

### Handling uncertainties

If any field is unclear, make your best guess and flag it:

```
notes: "UNCERTAIN: source shows '14:00' but also '2:00 PM' with no timezone specified. Assumed Europe/Berlin based on venue location."
```

Common uncertainties:
- Times printed without AM/PM or timezone
- Artist names with variant spellings across sources
- Workshops listed on the image but cut off at the edge
- Room names that do not match between schedule versions

## Step 5: Map dance styles

The schema uses a controlled vocabulary for dance styles. Map the festival's terminology to our values:

| Festival uses | We map to |
|---------------|-----------|
| Salsa Cubana, Casino | salsa-cubana |
| Salsa On1, Salsa On2, Salsa LA, Salsa NY | salsa-linear |
| Bachata, Bachata Sensual, Bachata Moderna | bachata |
| Kizomba, Urban Kiz | kizomba |
| Zouk, Brazilian Zouk, Lambazouk | zouk |
| Semba | semba |
| Cha-cha-cha | cha-cha-cha |
| Son, Son Cubano | son |
| Rumba, Rumba Cubana | rumba |
| Afro, Afro-Cuban, Orishas | afro-cuban |
| Reggaeton | reggaeton |
| Lady Styling, Feminine Movement | lady-styling |
| Men's Styling, Man Styling | man-styling |
| Musicality | musicality |
| Body Movement, Body Isolations | body-movement |
| Anything else | other |

If a workshop spans multiple styles (e.g., "Salsa & Bachata Fusion"), pick the primary one and add the secondary as a tag.

## Step 6: Map levels

Standardize level descriptions:

| Festival uses | We map to |
|---------------|-----------|
| Beginner, Principiante, Level 1, Intro | beginner |
| Intermediate, Intermedio, Level 2 | intermediate |
| Advanced, Avanzado, Level 3, Pro | advanced |
| Open Level, All Levels, Mixed | all-levels |
| No level stated | (leave blank) |

## Step 7: Assemble the JSON

Convert the CSV data into the JSON structure defined in `schedule_schema.json`. Either:

1. **Manual assembly:** Copy the structure from `schedule_sample.json` and replace the data.
2. **Script conversion:** Use a CSV-to-JSON script (to be provided by Engineer if needed).

Validate the JSON:
- All `roomId` values must reference a room in the `rooms` array
- All `day` values must fall within the festival date range
- All `startTime` values must be before `endTime` values
- No two workshops should have the same day + startTime + roomId (no double-booking)

## Step 8: Cross-reference and verify

Before publishing, verify accuracy:

**Quality checklist:**
- [ ] Total workshop count matches what the source shows
- [ ] Every time slot in the source has corresponding entries
- [ ] Artist names are spelled consistently (check across all their workshops)
- [ ] Room assignments are consistent (no room assigned two workshops at the same time)
- [ ] Dates are correct (common error: wrong year, or day-of-week does not match date)
- [ ] Times are in the correct timezone
- [ ] Dance styles are mapped to the controlled vocabulary
- [ ] No duplicate entries

**Cross-reference steps:**
1. Count workshops per day in source vs. JSON. Numbers must match.
2. For each time slot, verify that concurrent workshops are in different rooms.
3. Spot-check 3-5 artist names against the festival website or social media.
4. If multiple sources exist, compare them. Note any conflicts.

## Step 9: Document and deliver

Create a PR with:

1. The JSON schedule file: `Sources/<festival-slug>/schedule.json`
2. Source material copies (images, PDFs) in the same directory
3. PR description that includes:
   - Source(s) used
   - Total workshop count
   - Any uncertainties flagged with the `UNCERTAIN` prefix
   - Quality checklist (completed)

Example PR description:

```
## Festival: Munich Salsa Congress 2026

**Sources:**
- Website schedule page (screenshot: source_website.png)
- PDF from organizer (source_schedule.pdf)

**Data:**
- 18 workshops across 3 days, 4 rooms
- 6 artists/instructor pairs

**Uncertainties:**
- UNCERTAIN: "Body Movement Workshop" room not specified in PDF; assumed Lounge based on website version.

**Quality checklist:**
- [x] All workshops captured (18/18)
- [x] Times verified (Europe/Berlin)
- [x] Artist names cross-referenced with festival Instagram
- [x] Rooms mapped (4 rooms, no double-bookings)
- [x] Dance styles categorized
- [x] No duplicates
```

## Step 10: Handle updates

Festivals frequently update their schedules (artist cancellations, room changes, time shifts). When an update arrives:

1. Save the new source material alongside the original
2. Diff the changes: what workshops changed, were added, or were removed
3. Update the JSON
4. Note the update in the PR or a new PR: "Schedule updated: Workshop X moved from 14:00 to 15:00 per organizer announcement on 2026-06-10"

## Escalation triggers

Escalate to Alex immediately if:
- The festival is tomorrow and the schedule has unresolved errors
- An organizer contacts us about incorrect data
- The source material is too low quality to extract reliably (e.g., blurry photo)
- You discover the schedule has already been published with errors

Format: `URGENT: <description of the issue>`

## File naming conventions

```
01_Domains/Festival_Experience/Operations/
  Sources/
    <festival-slug>/
      schedule.json          -- the structured data
      source_website.png     -- screenshot of website schedule
      source_instagram.png   -- screenshot of Instagram post
      source_schedule.pdf    -- PDF from organizer
      notes.md               -- extraction notes, uncertainties
```

Festival slug format: `<city>-<festival-name>-<year>`, lowercase, hyphens for spaces.
Example: `munich-salsa-congress-2026`
