# Backlog — Meetup Planner

All user stories grouped by feature. Each feature covers the full lifecycle — from browsing to matching to connecting. For the user research behind these, see [Jobs to Be Done](jtbd.md). For the prioritized journey view, see [Story Map](story-map.md).

## Personas

| Persona | Role | Primary job |
| --- | --- | --- |
| **Festival Dancer** | Solo traveler attending 2–6 festivals/year | Job 3: Meet new people beyond the dance floor |
| **Festival Regular** | Experienced dancer (6+/year) who naturally organizes | Job 5: Organize without becoming coordinator |

---

## Epic 1: Festival landing page

**Problem:** Dancers buy a festival ticket and have no idea what social activities exist around it. The festival page shows schedule and tickets — nothing about rides, rooms, or meeting people.

**Jobs:** 3 (Meet new people), 1 (Coordinate travel), 2 (Find accommodation)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 1.1 | See festival name, dates, location, and hero image, so I can confirm I'm looking at the right festival | Festival Dancer | MVP |
| 1.2 | See activity cards with participant counts and availability, so I can tell at a glance what's happening and how popular it is | Festival Dancer | MVP |
| 1.3 | See first names and dance styles of signed-up dancers, so I can feel like real people are already involved | Festival Dancer | MVP |
| 1.4 | Receive a "Your festival plan is ready" message summarizing my matches, so I can see everything in one place and get excited | Festival Dancer | MVP |
| 1.5 | Browse a list of upcoming festivals with activity counts, so I can find festivals where activities are being organized | Festival Dancer | R1 |
| 1.6 | Land on a shareable URL for each festival (e.g. /festivals/salsa-berlin-2026), so I can share it in WhatsApp groups | Festival Dancer | R1 |
| 1.7 | Check in to an activity to confirm I'm attending, so I can signal to my group that I'm coming | Festival Dancer | R1 |
| 1.8 | Embed an activity widget on my festival website, so I can offer social activities without building anything | Festival Regular | R2 |
| 1.9 | See a live feed of what's happening now, so I can join spontaneous plans during breaks | Festival Dancer | R2 |

---

## Epic 2: Dancer sign-up

**Problem:** Any friction between "this looks interesting" and "I'm in" kills conversion. But we need enough info to match people to rides, rooms, and partners.

**Jobs:** 3 (Meet new people), 4 (Find dance partners)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 2.1 | Sign up with name, email, dance styles, role, and city in under 60 seconds, so I can start browsing activities immediately | Festival Dancer | MVP |
| 2.2 | See how many free spots are left (out of 10), so I can feel urgency to claim mine before they're gone | Festival Dancer | MVP |
| 2.3 | Pay €1 via Stripe when free spots are full, so I can still join after the first 10 dancers | Festival Dancer | R1 |
| 2.4 | Sign up with Google or Facebook, so I can join in one tap without typing | Festival Dancer | R2 |

---

## Epic 3: Share a Ride

**Problem:** Dancers post "anyone driving from Berlin?" in WhatsApp groups and hope for a reply. Information gets buried, people miss posts, and many end up driving alone — only to discover others came from the same city.

**Jobs:** 1 (Coordinate travel)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 3.1 | Post a ride offer with origin city, departure date, seats available, and cost contribution, so I can find passengers for the drive | Festival Dancer | MVP |
| 3.2 | Browse available rides from my area and request a seat, so I can split the cost and not travel alone | Festival Dancer | MVP |
| 3.3 | Receive a WhatsApp/Telegram group link with my ride group after matching, so I can coordinate pickup details | Festival Dancer | MVP |
| 3.4 | Get automatically matched to a carpool based on origin city and travel dates, so I can get a ride within hours instead of waiting | Festival Dancer | R1 |

---

## Epic 4: Share a Room

**Problem:** Sharing an Airbnb cuts costs by 70%, but finding compatible roommates through WhatsApp is chaotic. Bad matches (budget, sleep schedule, habits) lead to awkward festivals.

**Jobs:** 2 (Find accommodation)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 4.1 | Post a room listing with dates, budget range, and preferences (gender, sleep habits), so I can find compatible roommates | Festival Dancer | MVP |
| 4.2 | Browse room listings and request to join one that matches my budget and preferences, so I can split accommodation costs | Festival Dancer | MVP |
| 4.3 | Receive a WhatsApp/Telegram group link with my roommates after matching, so I can coordinate booking and logistics | Festival Dancer | MVP |

---

## Epic 5: Group Dinner

**Problem:** The best festival memories happen between workshops — but breaking into groups is hard. Dancers eat alone, scroll their phones, and go back to their room. The dance floor is social; everything around it isn't.

**Jobs:** 3 (Meet new people)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 5.1 | Sign up for a group dinner on a specific evening, so I can meet new people in a relaxed setting instead of eating alone | Festival Dancer | MVP |
| 5.2 | Get assigned to a dinner group of 4–6 people (manual), so I can have a concrete dinner plan without organizing it myself | Festival Dancer | MVP |
| 5.3 | Receive a WhatsApp/Telegram group link with my dinner group, so I can start chatting before we meet | Festival Dancer | MVP |
| 5.4 | Receive the restaurant name and address on the day of the dinner, so I can show up at the right place (surprise element intact) | Festival Dancer | MVP |
| 5.5 | Get automatically assigned to a diverse dinner group of 4–6, so I can meet interesting people without anyone hand-picking groups | Festival Dancer | R1 |

---

## Epic 6: Find Dance Partners

**Problem:** At a 200-person festival, maybe 30 dance your style at your level. Finding them means trial and error. Followers who want intermediate bachata leads have no way to find them except by dancing with everyone.

**Jobs:** 4 (Find dance partners)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 6.1 | Browse dancers by style, role, and level, so I can find potential partners before the festival starts | Festival Dancer | MVP |
| 6.2 | Send a "let's dance" request to a dancer, so I can arrange to meet them at the social or workshop | Festival Dancer | MVP |
| 6.3 | Get automatically matched with partners based on style, role, and level, so I can find compatible partners at scale | Festival Dancer | R2 |
| 6.4 | Book a taxi dancer for specific time slots and styles, so I can guarantee great dances even if I don't know anyone | Festival Dancer | R2 |

---

## Epic 7: Extra Activities

**Problem:** Festivals happen in interesting cities, but there's no structured way to organize or discover side activities (beach trips, city tours, after-parties). These happen spontaneously — and most people miss them.

**Jobs:** 3 (Meet new people), 5 (Organize without burnout)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 7.1 | Browse and join community-proposed activities (beach social, city tour, after-party), so I can fill gaps between workshops | Festival Dancer | R1 |
| 7.2 | Propose a new activity with description, time, and max participants, so I can organize something without WhatsApp chaos | Festival Regular | R1 |

---

## Epic 8: Post-festival retention

**Problem:** After the festival, connections fade. Dancers return home and forget the app exists until the next festival — if they remember at all.

**Jobs:** 3 (Meet new people)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 8.1 | Rate my experience and leave feedback after the festival, so I can help improve future events | Festival Dancer | MVP |
| 8.2 | Receive a recap of my festival (rides shared, dinners attended, partners matched), so I can relive the experience and share it | Festival Dancer | R1 |
| 8.3 | Get invited to upcoming festivals where dancers I met are already signed up, so I can plan the next one with my crew | Festival Dancer | R1 |
| 8.4 | Keep a persistent group with people I connected with across festivals, so I can maintain friendships beyond a single event | Festival Dancer | R2 |

---

## Epic 9: Festival Regular tools

**Problem:** Experienced dancers who naturally organize activities spend hours in WhatsApp coordinating logistics. Without tools, they burn out or stop organizing — and the community loses its most valuable members.

**Jobs:** 5 (Organize without burnout), 6 (Share local knowledge)

| # | Story | Persona | Release |
| --- | --- | --- | --- |
| 9.1 | Share local tips (restaurants, transport, hidden gems) visible to all attendees, so I can help visitors without answering the same DM 10 times | Festival Regular | R1 |
| 9.2 | Create and manage activities for a festival (set capacity, description, time), so I can organize group experiences without spreadsheets | Festival Regular | R1 |
| 9.3 | See a dashboard of my activities with participant counts and status, so I can manage coordination at a glance | Festival Regular | R2 |
| 9.4 | Earn ambassador status for organizing activities across festivals, so I can feel valued and motivated to keep contributing | Festival Regular | R2 |
