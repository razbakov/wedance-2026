# SDTV — Commercial Model & Unit Economics

last_updated: 2026-04-06

## Editor Cost Structure

| Deliverable | Cost (RUB) | Notes |
|-------------|-----------|-------|
| YouTube video | 100 | Base rate per video |
| Instagram reel | 120 | Base + 20 surcharge |
| Aftermovie | 6,000 | Fixed per festival |
| Animation | ~2,120 | Per animation piece |
| Tracking | ~50 | Per video, rare (centering dancers) |

### Verified Examples

**DHI Festival:**
- 49 YT + 71 IG = 49×100 + 71×120 = 13,420р (exact match with actual invoice)

**Croatia Festival:**
- 244 videos (YT+IG) + aftermovie (6,000) = 36,280р total
- Plus: Turkey 58 reels + animation + aftermovie + 12 Feria reels = 16,520р

**Second Festival:**
- 113 YT + 124 IG = 26,180р calculated vs 25,960р actual
- 220р difference = tracking surcharges on some videos

## Invoice Calculation Logic

Built into `clip-match.js invoice` command:
```
total = (yt_count × 100) + (ig_count × 120)
      + (aftermovie ? 6000 : 0)
      + (animation_count × 2120)
      + (tracking_count × 50)
```

Three data sources for format counts:
1. Dropbox folder scan (count files by naming convention)
2. Manual --yt/--ig flags
3. Airtable Delivery Format field (most accurate going forward)

## Delivery Format Distribution

Most dances get **YT+IG** (both versions).
Some get only YT or only IG — set by videographer per capture.
Format data now captured at filming time → accurate invoicing.

## Cost Per Festival (Estimate)

For a typical festival with ~100 dances:
- If all YT+IG: 100×100 + 100×120 = 22,000р editing
- Plus aftermovie: +6,000р
- Total: ~28,000р editor cost per festival

## Notes
- Editor is external contractor, not employee
- Payment calculated after festival delivery complete
- Airtable free plan — invoice stays in CLI, not Airtable scripts
- Future: may add invoice summary to staff mode web UI
