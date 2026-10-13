---
status: proposal — not built
created: 2026-10-14 09:00
builds on: docs/proposals/2026-10-12-flyer-journeys.md (journey 3, the launch campaign; journey 4, the people around the flyer)
---

# Festivals: artist confirmation and the content plan

## Why

A festival is promoted for weeks, not with one flyer: a launch, an announcement
for every artist, a line-up poster, then the programme, countdown and last
tickets. Today the organizer makes all of that by hand, and the artists find
out what was posted about them afterwards (wrong photo, wrong spelling, a
workshop they never agreed to).

The artist's confirmation link (built: /confirm/<token>) is the natural place
where the two meet: the artist checks their part of the festival — and their
own announcement post — once, before anything goes out.

## 1. What the artist confirms (the link, in this order)

1. **About the event** (context, nothing to fill in): name, type, dates, venue
   and address (plus other venues in the programme), the organizer and how to
   reach them, music styles, size (workshops, parties, dancers planning), and
   who else is in the line-up with photos.
2. **I'm in** — participation: invited → confirmed / declined. The organizer
   sees the status on the artist's line-up card.
3. **Your programme** — every session they teach or play (title, day, time,
   length, room, style, level, teaching partner); for a one-night event their
   agenda line ("21:00 DJ set"). They approve, or say what's wrong as a note:
   the programme stays the organizer's to arrange.
4. **Your posts** — their announcement post (and their place on the line-up
   poster) as previews. Approving also covers using their photo for promotion.
5. **Your page** — name, photos, video, about, links (built).
6. **Make this page yours** — an account, when nobody manages the page (built).

Later, when bookings run through WeDance: arrival and sound check, rider,
travel and accommodation, fee and contract, a share kit to repost.

## 2. The content plan (festivals)

A plan of posts generated from the festival, each made with the flyer
pipeline (Gemini paints, every word read back and checked) in the festival's
look, with a caption (built: caption from fixed detail lines, Gemini writes
only the hook and call to action).

| When (default) | Post | Made from |
|---|---|---|
| Launch | Save the date: name, dates, city, look | event |
| Weekly, one per artist | **Artist announcement**: their photo, name, styles, what they teach | artist profile + their sessions |
| After the announcements | **Line-up poster**: everyone together | line-up |
| ~3 weeks before | Programme / schedule highlights | festival sessions |
| ~2 weeks before | Passes and prices; early-bird deadline | festival passes |
| ~1 week before | Countdown; practical info (venues, transport) | festival details |
| Days before | Last tickets / day passes | passes, sign-ups |
| During | Today's programme (story) | sessions of that day |
| After | Thank you; photos; next edition | event |

The organizer sees the plan as a list with dates, edits or drops posts, and
makes each when its date comes (or all at once). An artist's announcement
waits for that artist's approval (step 4 above) before it can be marked
ready; the line-up poster waits for everyone on it, or goes out with the
confirmed ones only.

"Extras in communication" the plan can carry, beyond posts:
- WhatsApp / Telegram text for the organizer's groups, per post.
- A reminder to the organizer on the post's date.
- For each artist: their post and caption to repost (the share kit).

## Decisions before building

1. **Unconfirmed artists on the public page**: show them as "to be confirmed"
   (recommended), show them as usual, or leave them off until they confirm.
2. **Order of building**: the confirmation steps 1–4 first (they're needed for
   the artist announcements), then the content plan.
3. **How many posts by default**: the full plan above, or launch + artists +
   line-up only, with the rest added by hand.
