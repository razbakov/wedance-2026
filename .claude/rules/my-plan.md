---
paths:
  - "app/pages/{my-plan,my-year,dance-card}.vue"
  - "app/pages/meet/**"
  - "app/components/RitualSymbol.vue"
  - "shared/utils/ritual.ts"
  - "server/utils/ritual.ts"
  - "server/trpc/routers/ritual.ts"
  - "server/api/cron/ritual-followup.get.ts"
  - "app/pages/w/**"
  - "server/trpc/routers/{plan,weekend,wave}*.ts"
  - "server/api/match-emails/**"
  - "**/{MyPlan,myPlanFeeds,weekendStory,WeekendStory,weekendShare,storyLines,storyCanvas,meetMatch,MeetMatch,MeetFriends,yearReview,YearReview,YearStory,SharedYearPlan,TellYourStory,shareInvite,SettingsEmails}*"
---

# Dancer side: my plan, weekend share, dance friends, year in dance

## Share my weekend (#527)

A dancer shares this week's parties as `/w/<code>` (`weekend_shares`, migration 0066 — a snapshot of event ids;
the same parties within 6 days reuse the link) plus a 1080×1920 Instagram story drawn on a canvas in the browser
(`app/lib/weekendStory.ts` — a bold poster, no photos (flyers are too busy): the first party's dance colour as the
background, Anton (Google Fonts, loaded only when used) for the type, each party a black band; a short line of
our own per style from `shared/utils/storyLines.ts`, which the sharer can shuffle or rewrite) and shared through the phone's share sheet, the link copied for the link sticker.
Friends tap "I'm in" per party (`weekend_share_joins`): signed in → it goes on their plan; signed out → a first
name + the RSVP guest token, mirrored as an unconfirmed "yes" on the event's poll. After a guest's tap the page offers an
optional email: a magic link back to `/w/<code>?confirm=<event>&guest=<token>`, which (signed in) folds that
browser's guest joins into the account — on their plan, confirmed "yes" on the poll, no second email to the
sharer. Signed-in joins also add a confirmed "yes" on the poll. When nobody manages the event (RAZ-1016, the page
bookings go to has no team), "I'm in" still puts the night on the friend's plan and on the weekend page, and writes
nothing on the event's sign-up list. The sharer gets `sendWeekendJoinEmail` per new join. Entry points: My plan → "Your week" shows the story in place (nights only — classes stay off it) (`app/components/WeekendStory.vue`, shared with `/w/<code>`; the link is made when the list loads and again when its parties change — RAZ-895), MCP `share_my_weekend`
(returns `storyUrl` = the link + `?story=1`, which shows the story maker to whoever opens it).
Code: `server/trpc/routers/weekend.ts`, `shared/utils/weekendShare.ts`, `app/pages/w/[code].vue`.
**After booking (RAZ-1010):** the event page does not open a share popup. Once a dancer is booked and signed in,
"Tell your story" (`TellYourStory`, `storyAfterBooking` in `app/lib/shareInvite.ts`) opens My plan: `#share-week`
when the night is today or the next six days (the story already on the Week tab), `#share-year` for a festival
later or one that has already started. A class, course, practica or workshop gets no button — the week story is
nights only — and nothing is offered before they book, or while they are still confirming the email. Going together
stays lifts, rooms and dinners. `weekend.share` `surface: 'event'` remains for a one-event link; the page no longer
calls it. An old `?invite=` workshop-plan link still opens.
No auto-posting: Instagram's publishing API is Business/Creator-only and the Meta app is in dev mode.


## My plan: Today / Week / Month / Year (RAZ-1006)

`/my-plan` is four tabs (sketch `/sketches/plan-zoom`, variant A; opens on Today). Each tab holds everything in its span,
of every kind — a Sunday class is in Today on Sunday, in Week and in Month. **Today**: tonight's nights and classes, each
with the hangouts posted for it, then "Also out tonight", and "I'm out". **Week**: the next seven days by day + the weekend
story (nights only). **Month**: the next 30 days grouped this week / next week / later, then **Your courses**. **Year**:
**Your festivals** (+ the year story) and **Your goals**. One feed: `plan.weekSocials({ days: 30 })` with classes
(`isClass`), every class of a planned course (`everyClass`); `weekend.share` / `planCounts` still call `weekSocials`
without classes. A class row books on its event page and is removed under Your courses (`MyPlanEventRow`). Old anchors
open their tab (`#tonight`, `#socials`, `#courses`, `#festivals`, `#goals`; the tab writes `#today|week|month|year`).

## Dance friends: mutual yeses (RAZ-985)

A Yes in Meet new friends (`/meet`, `discover_swipes`) or a wave on a festival page (`festival_waves`, paired per
festival) that comes back is a **match**: `plan.meetMatches` → `server/utils/meetMatches.ts`, one list per other dancer
(public profiles with a photo only). Shown on My plan under the Meet entry as **Your dance friends** (`MeetMatches.vue`,
sketch `/sketches/meet-matches` variant D), newest first, "New" for 7 days. Each match has one night out in the next 14
days (both going › they're going › I'm going › a social in my city that suits both): **I'm going too** adds it with
`plan_items.metadata.with = <their id>` (that match sees "<name> is going" even without `share_going`), **Next time** is
an event Skip in `discover_swipes` (never suggested again; Undo). A night only you are going to is an **invite**
(`Invite <name>`, the same `metadata.with`), not a meetup. **How you'll meet** and `/meet/ritual` are only on a night
you are both going to that has not started. A booked ritual whose event has ended shows above that as
"You met at <night> · Thu 19 Nov" (`latestMet`). Nights read "Tonight · 18:00", "Tomorrow · Thu 26 Nov · 18:00", or
"Thu 3 Dec · 18:00", in the event's own time zone (`relativeNightWhen`). Yeses count from `MEET_MATCHES_SINCE` (2026-11-16
19:00 UTC, when the deck's copy became "If they say yes too, we tell you both").

**Telling both:** the Yes (or wave) that completes a match returns `{ match: true }` — /meet shows "It's a match" under the
deck — and the other dancer gets one email, "<name> said yes too" (`server/utils/meetMatchNotify.ts` `afterYes` →
`sendMeetMatchEmail`, link to `/my-plan#dance-friends`, with the night out when there is one). Once per pair
(`meet_match_emails`, 0075), at most one a day per recipient, never about a private / photo-less dancer, and never when
`dancers.match_emails` is off: Settings → Emails (`SettingsEmails`, `plan.emailPrefs` / `setEmailPrefs`) or the signed
"Stop these emails" link + List-Unsubscribe (`/api/match-emails/off`).

## Your year in dance (RAZ-966)

`/my-year` is only the look back at the dancer's year, told as a story (Wrapped style) to post at New Year, ending on
"Plan <next year>" (→ My plan's "Your festivals"). The festival year is planned and shared in My plan: the year story
(`YearStory`, RAZ-897) sits in place under "Your festivals", for the festivals still ahead. Found in My plan only (`YearReviewEntry`): a
banner at the top in December and January (`isYearTurn`), a quiet link under "Your festivals" (and on an empty plan) the rest
of the year; not in the footer or account menu. Year = `lookBackYear` (last year in January, else this one).
A "night" = a past, not-cancelled event of that year the dancer was going to — Going! (plan_items), a confirmed poll
answer other than "next", an attendance, a weekend they shared or joined — plus real festivals in their year plan;
intent, not proof, so the copy says "nights you were going to". Mock ids never resolve (only real `events` / `festivals`
rows are joined). A thin year just drops screens (no filling in with the city's year).
Code: `server/utils/yearReview.ts` (`plan.yearReview`), `shared/utils/yearReview.ts` (`buildYearReview`, screens),
`app/lib/yearReviewStory.ts` (one 1080×1920 picture per screen, `storyCanvas.ts`), `app/components/YearReview.vue`.
`/my-year?user=<handle or id>` (a friend's festival year, `SharedYearPlan`) stays: the year story's link leads there.

## Meetup after a match (RAZ-1071)

`/meet/ritual?with=<dancer id>` is the night two dancers who said yes actually meet. It reads the real match (`plan.meetMatches`): book the suggested night (a plan item, `metadata.with` = them), then the time and place — 23:15 near the DJ booth when that clock time falls during the event, otherwise a little after the start. The page says why (the night's own start, then 23:15 once the floor is going) and shows the event's picture and how many are going. The next step is a sentence, not a button: open the screen and turn the phone. The screen is a shared color, shape and number (derived from the two ids and the event, same on both phones), with no name. No scan and no follow on that screen. Safety lines are optional first-person ticks (I can leave any time, I’m meeting in a public spot, I’m 18+). "Couldn't meet?" is on the turned screen and saves a problem on `meet_rituals`, including "Report someone"; the other dancer is not told. The morning-after email is not a link in the app. `/api/cron/ritual-followup` emails both; that mail is the only follow suggestion, and its link opens `/meet/ritual?with=<id>&morning=1` where one tap follows. The match card on `/meet` stays after booking, with "See when and where you'll meet", and the bell keeps the row until that night is over — then the bell drops it, and does not offer a night only you planned in its place. Opening the meetup after that night shows "You met at …". The morning-after link still opens the follow-up. A match toast shows once per match, small, at the bottom right. Entry points: that card, the bell, and "How you'll meet" on My plan's dance friends when you are both going.
