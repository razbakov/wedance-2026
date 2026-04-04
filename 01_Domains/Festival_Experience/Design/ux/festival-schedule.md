Here's my product design critique of what we built:

## UX Issues I See

**1. Information hierarchy is flat.** The sidebar mixes logistics (dates, tickets, pack) with social activities (ride, meal, activities, taxi dancer). A first-time user sees 10+ identical-looking rows and doesn't know what's new or exciting.

**2. "Find partner" + "Taxi dancer" feels buried.** The taxi dancer card only appears when you expand Find partner — most users won't discover it.

**3. Social activities don't feel social.** The ride shares show avatars but meals and activities are just cards with numbers. No faces = no human pull.

**4. The freemium badge ("2 free spots") is subtle.** It's in the header next to "My Plan" — easy to miss. There's no urgency or explanation of what it unlocks.

**5. No visual separation between "planning" and "connecting".** The whole sidebar is one flat checklist, but the value prop shift is from planning → connecting with people.

## What I'd Recommend

**Group the sidebar into two clear sections:**

```
── PLAN YOUR TRIP ──
  Workshops
  Save the dates
  Get tickets
  Book stay
  Pack

── CONNECT WITH DANCERS ──  (← NEW, visually distinct)
  Share a ride     3 sharing
  Share a meal     3 dinners
  Extra activities 3 available
  Invite friends
  Find partner / Taxi dancer
  Discover dancers
```

**Plus**: A small "hero banner" at the top of the Connect section explaining the group dinner concept and showing the free spots counter prominently.

Want me to implement this grouping? It's a template-only change in CartDrawer — splitting the `divide-y` container into two sections with a labeled divider between them.
