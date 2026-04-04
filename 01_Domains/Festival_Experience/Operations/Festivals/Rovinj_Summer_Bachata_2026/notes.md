# Schedule Conversion Notes -- Summer Bachata Festival Rovinj 2026

**Conversion date:** 2026-04-04
**Status:** MOCK DATA -- awaiting real schedule publication
**Converted by:** Operations Manager (AI agent)

## Source Material

| # | Source | Status | Notes |
|---|--------|--------|-------|
| 1 | Official website (summerbachatafestival.com) | Collected 2026-04-04 | Artist lineup confirmed; no schedule/timetable published yet |
| 2 | SalsaVida listing (salsavida.com) | Collected 2026-04-04 | Confirms dates and location, no schedule detail |
| 3 | Rovinj tourism portal (rovinj-tourism.com) | Collected 2026-04-04 | Confirms dates, basic description only |
| 4 | FAQ page (summerbachatafestival.com/faq) | Collected 2026-04-04 | Confirms Adris Old Tobacco Factory as workshop venue; mentions additional halls |

No screenshots saved yet -- the website does not yet publish a schedule image or PDF. Source material will be saved to this directory once available.

## What We Know (Confirmed from Official Sources)

### Festival metadata
- **Name:** Summer Bachata Festival 2026 (SBF 2026)
- **Dates:** June 5-8, 2026
- **City:** Rovinj, Croatia
- **Timezone:** Europe/Zagreb (UTC+2 in summer / CEST)
- **Edition:** 1st
- **Estimated size:** 300-600 attendees (first edition)
- **Style mix:** ~80% bachata, ~20% salsa

### Confirmed venues
- **Adris Old Tobacco Factory** -- workshops, registration, evening parties
- **Villas Rubin Resort** -- beach and pool parties (daytime)
- **Katarina Island** -- premium party experience
- Shuttle buses operate between Villas Rubin and Adris

### Confirmed artists (from website, 2026-04-04)

**Bachata instructors:**
1. Gaby & Estefy (Spain) -- headliners, confirmed 3-hour choreography bootcamp
2. Antoni & Belen (Spain)
3. David & Ines (Spain)
4. Junior & Carolina (Dominican Republic / Colombia)
5. Edu & Fati (Spain)
6. Alan & Jessica (Spain)
7. Ofir & Ofri (Israel)
8. Jorge & Monica (Czech Republic / Spain)
9. Lisa & York (Germany / Venezuela) -- known for ballroom-bachata fusion
10. Fabian & Fania (Spain)
11. Willy & Jessy (Italy / Mexico)

**Salsa instructors:**
12. Jorge & Indira (USA)
13. Dado & Conny (Austria)

**DJs:**
DJ Khalid, DJ York, DJ Manuel Citro, DJ Alejandro, DJ Dimen5ions, DJ Clau, DJ Fabris, DJ Dmitri, DJ Sergio, DJ Julian Duke

**Live performance:**
Grupo Extra -- Friday night (June 6)

### Confirmed special events
- Grupo Extra live concert: Friday night (June 6)
- Beach/pool parties at Villas Rubin (daytime)
- Boat cruises mentioned in marketing material
- Katarina Island party (date TBD)

## What We Do NOT Know (Gaps to Fill)

### Critical gaps (must have before real schedule)
1. **Workshop timetable** -- no times, no day assignments, no room assignments published
2. **Room names** -- FAQ says "Adris Old Tobacco Factory" with "additional halls near the main venue." Actual room/hall names are unknown.
3. **Workshop titles** -- individual workshop names have not been announced
4. **Workshop levels** -- no level information published for any workshop
5. **Workshop durations** -- only the 3-hour Gaby & Estefy choreography is confirmed as a duration; standard workshop length is unknown (60 min? 75 min? 90 min?)
6. **Number of parallel tracks** -- how many workshops run simultaneously is unknown
7. **Day 1 (June 5) structure** -- unclear if workshops start in the morning or afternoon on the first day
8. **Day 4 (June 8) structure** -- unclear if this is a full day or just a morning/checkout day

### Nice-to-have gaps
9. **Room capacities** -- not critical for schedule display but useful for filtering
10. **Workshop descriptions** -- longer text descriptions of workshop content
11. **Party schedule** -- exact times for evening socials, beach parties, boat cruises
12. **Registration requirements** -- whether any workshops require pre-registration or have capacity limits

## Assumptions Made in Mock Schedule

The mock schedule in `schedule.json` uses the following assumptions. Each will be replaced when real data is available:

| Assumption | Basis | Confidence |
|------------|-------|------------|
| 4 rooms (Main Hall, Hall 2, Studio, Beach Stage) | FAQ mentions main venue + additional halls; typical festival setup | Low |
| 3 parallel workshop tracks (Thu-Sat), 2 tracks (Sun) | Typical for a 300-600 person bachata festival with 13 instructor pairs | Medium |
| Workshops are 60 minutes with 15-min breaks | Common pattern at European bachata festivals | Medium |
| Thursday (Jun 5): afternoon start, 3 time slots | First day typically has afternoon workshops only | Medium |
| Friday (Jun 6): 4 time slots, 12:00-17:15 | Full workshop day before Grupo Extra evening concert | Medium |
| Saturday (Jun 7): 4 time slots, 12:00-16:00 | Full workshop day | Medium |
| Sunday (Jun 8): 2 time slots, 11:00-13:15 | Closing day, shorter program | Medium |
| 3-hour choreography split into 2x 1.5h (Sat + Sun) | Only confirmed duration; split is assumed | Low |
| Each instructor teaches 2 workshops | Standard for a 4-day festival | Medium |
| ~80/20 bachata/salsa split in workshops | Confirmed by website marketing ("80% bachata") | High |
| 30 total workshops | Fits 13 instructor pairs x ~2 workshops each | Medium |

## Extraction Notes

- All artist names were copied exactly as they appear on summerbachatafestival.com as of 2026-04-04.
- Nationality/origin info comes from the website artist bios.
- "Lisa & York" are listed as "Lisa & DJ York" on some pages. We use "Lisa & York" for the instructor credit since DJ York also appears in the DJ roster separately.
- "Jorge & Indira" and "Jorge & Monica" are two different couples (Jorge from USA with Indira vs. Jorge from Czech Republic with Monica).

## Next Steps

1. **Monitor the website weekly** for schedule publication (check summerbachatafestival.com and their Instagram @summerbachatafestival).
2. **When the schedule is published:** download/screenshot the source, replace mock data with real data, run quality checklist.
3. **Cross-reference** the published schedule against this artist list to catch any lineup changes.
4. **Flag to Engineer** once real data is ready so it can be deployed to the app.
