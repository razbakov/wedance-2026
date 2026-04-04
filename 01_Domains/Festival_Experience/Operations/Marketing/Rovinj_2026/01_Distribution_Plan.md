# Distribution Plan -- Summer Bachata Festival, Rovinj 2026

**Festival:** Summer Bachata Festival
**City:** Rovinj, Croatia
**Dance styles:** Bachata (sensual + dominicana), some kizomba/salsa likely on the side
**Festival dates:** June 5-8, 2026 (Friday-Monday)
**Estimated attendance:** 300-600 dancers (mid-size European bachata festival)
**Purpose:** Early B2C test -- validate that dancers will use an interactive schedule without organizer involvement.

---

## Festival Variables

| Variable | Value |
|----------|-------|
| Festival name | Summer Bachata Festival |
| City | Rovinj, Croatia |
| Dance styles | Bachata (sensual, dominicana), kizomba, salsa |
| Festival dates | June 5-8, 2026 |
| Schedule link (UTM base) | `https://wedance.vip/festival/summer-bachata-rovinj?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=rovinj-2026` |
| WhatsApp group(s) | TBD -- see Channel Research section |
| Facebook event page URL | TBD -- search "Summer Bachata Festival Rovinj 2026" on Facebook Events |
| Facebook groups (city/style) | See Channel Tracker below |
| Instagram handles to tag | See Channel Tracker below |
| Key artists/teachers to mention | TBD -- check lineup once published on festival website |

---

## Timeline (Working Backwards from June 5)

### Now through May 15: Preparation Phase

| Date | Action | Owner |
|------|--------|-------|
| Apr 4-11 | Operations Manager converts Rovinj schedule once published | Ops Manager |
| Apr 4-11 | Engineer deploys app with real Rovinj data | Engineer |
| Apr 11-18 | Marketing Lead confirms all messages are reviewed by Kirill | Marketing Lead / Kirill |
| May 1 | Kirill confirms access to target WhatsApp/Facebook groups | Kirill |
| May 8 | Analytics tracking is live, UTM links are tested | Engineer / Analyst |
| May 15 | Screenshot/preview image of schedule is ready | Designer |
| May 15 | All channel access confirmed, insider contacts identified | Kirill |

### Pre-Launch Checklist (complete by May 20)

- [ ] Schedule is published and link works on mobile
- [ ] UTM parameters are set up and tested for each channel
- [ ] Analytics tracking is live (PostHog events per Analyst spec)
- [ ] Kirill has access to all target WhatsApp/Facebook groups (or insider contacts identified)
- [ ] Message drafts reviewed and approved by Kirill
- [ ] Screenshot/preview image of the schedule ready for Instagram/Facebook
- [ ] SDTV account clear for posting (no conflicting content on launch days)
- [ ] Landing page copy is live with Rovinj-specific content

---

## T-14: May 22 (Two Weeks Before)

**Goal:** Plant the seed. Get the link in front of early planners who are booking flights and hotels.

| Channel | Action | Message Variation | UTM |
|---------|--------|-------------------|-----|
| WhatsApp -- festival group | Share link with utility hook | Rovinj Utility (see 02_Share_Messages.md) | `utm_source=whatsapp&utm_medium=message&utm_campaign=rovinj-2026-launch` |
| Facebook event page | Post with schedule preview image | Rovinj Utility (Facebook version) | `utm_source=facebook&utm_medium=event&utm_campaign=rovinj-2026-launch` |
| Facebook -- bachata groups (Croatia, DACH, Italy) | Post announcing the interactive schedule | Rovinj Insider Tip | `utm_source=facebook&utm_medium=group&utm_campaign=rovinj-2026-GROUP` |
| Instagram Stories (SDTV) | Story with schedule screenshot + link sticker | Rovinj Utility visual | `utm_source=instagram&utm_medium=story&utm_campaign=rovinj-2026-launch` |
| Direct messages | Send to 10-20 known attendees personally | Casual DM (see below) | `utm_source=direct&utm_medium=dm&utm_campaign=rovinj-2026-seed` |

**Seed DM (Kirill sends personally):**
```
Hey! We built an interactive schedule for Summer Bachata Festival in Rovinj.
You can filter by style and plan your whole weekend on your phone.
Check it out -- would love to hear if it's useful: {LINK}
```

**Key angle:** "The schedule just dropped -- here's a way better way to browse it than the usual PDF or Instagram story screenshot."

---

## T-7: May 29 (One Week Before)

**Goal:** Catch the second wave of planners. Start building social proof with early usage numbers.

| Channel | Action | Message Variation | UTM |
|---------|--------|-------------------|-----|
| WhatsApp -- festival group | Re-share with social proof hook | Rovinj Social Proof | `utm_source=whatsapp&utm_medium=message&utm_campaign=rovinj-2026-week` |
| Facebook event page | Comment on original post with usage numbers | Social proof update | same UTM |
| Instagram Stories (SDTV) | Poll: "Which Rovinj workshop are you picking?" + link | FOMO / engagement | `utm_source=instagram&utm_medium=story&utm_campaign=rovinj-2026-week` |
| YouTube community tab (SDTV) | Image post with poll about workshops | FOMO | `utm_source=youtube&utm_medium=community&utm_campaign=rovinj-2026-week` |

**Key angle:** "One week until Rovinj. X dancers already checked the schedule. Have you planned your workshops yet?"

---

## T-3: June 2 (Three Days Before)

**Goal:** Urgency. "Last chance to plan before you pack your bags."

| Channel | Action | Message Variation | UTM |
|---------|--------|-------------------|-----|
| WhatsApp -- festival group | Short reminder with FOMO hook | Rovinj Countdown | `utm_source=whatsapp&utm_medium=message&utm_campaign=rovinj-2026-countdown` |
| Instagram Stories (SDTV) | Countdown sticker + "3 days to Rovinj" + link | FOMO | `utm_source=instagram&utm_medium=story&utm_campaign=rovinj-2026-countdown` |
| Instagram Reels (SDTV) | 15s screen recording: filtering bachata workshops on the schedule | Utility + FOMO | `utm_source=instagram&utm_medium=reel&utm_campaign=rovinj-2026-countdown` |

**Key angle:** "Rovinj in 3 days. Popular workshops fill up fast -- check the schedule now."

---

## T-1: June 4 (Day Before)

**Goal:** Last push. Bookmark the link for the weekend.

| Channel | Action | Message Variation | UTM |
|---------|--------|-------------------|-----|
| WhatsApp -- festival group | "See you tomorrow! Bookmark this for the weekend" | Rovinj Direct | same UTM |
| Instagram Stories (SDTV) | "Save this link for Rovinj" + link sticker | Utility | `utm_source=instagram&utm_medium=story&utm_campaign=rovinj-2026-eve` |

**Key angle:** Keep it short. "Tomorrow! Bookmark the schedule -- you will need it between workshops."

---

## During Festival: June 5-8

**Goal:** Be the go-to reference. Drive real-time usage. Capture organic shares.

| Channel | Action | Frequency |
|---------|--------|-----------|
| WhatsApp -- festival group | Morning message: "Today's workshops at a glance" with link | Once per day (morning) |
| Instagram Stories (SDTV) | Live story from festival + "check what's on now" link | 1-2 per day if Kirill is there |
| Instagram Stories (SDTV) | Re-share any dancer stories mentioning the schedule | As they appear |

**Key angle:** "Between workshops? Check what's next." Service-oriented, not promotional.

**Important:** If Kirill is NOT physically at Rovinj, during-festival social content will be limited to WhatsApp messages and Instagram stories using screenshots / remote content. Confirm Kirill's attendance by May 15.

---

## Post-Festival: June 9-15

**Goal:** Capture feedback. Document results for Munich pilot and organizer outreach.

| Channel | Action | Message Variation |
|---------|--------|-------------------|
| WhatsApp -- festival group | Thank you + "How was the schedule? Reply with feedback" | Post-festival feedback |
| Instagram Stories (SDTV) | "Thanks Rovinj! X dancers used the interactive schedule" | Social proof for next festival |
| Facebook event page | Comment with results and most-used features | Social proof / close the loop |

**Key angle:** Close the loop. Thank people. Share a stat. Ask what to improve. Collect quotes for Munich pilot.

---

## Budget

**Paid advertising:** None. Organic only for the Rovinj test per partnership decision.

**Costs:** Zero. All distribution uses existing channels and Kirill's network.

---

## Success Metrics (per Requirement 002)

| Metric | Target for Rovinj | How Measured |
|--------|-------------------|--------------|
| Unique schedule opens | 60-120 (20%+ of estimated 300-600 attendees) | PostHog |
| Return visits during festival | 3+ average per user | PostHog |
| Organic shares | At least 5 measurable (UTM referral or `utm_medium=share`) | PostHog |
| WhatsApp click-throughs | 30+ from festival group | UTM tracking |
| Organizer inbound inquiry | Bonus: festival organizer sees usage and reaches out | Partnership Manager tracks |

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Schedule not published in time by festival | Medium | Monitor festival's Instagram/website weekly starting May 1. Ops Manager needs at least 1 week to convert. |
| Kirill not a member of Rovinj WhatsApp group | High | Research group links now. Ask known Croatian bachata dancers. See channel research below. |
| Low attendance at this specific festival | Low | Even 100 users is valuable B2C test data. Adjust targets down if needed. |
| Festival changes schedule last-minute | Medium | Ops Manager monitors for updates during festival. Landing page shows "last updated" timestamp. |
| No Kirill presence at Rovinj physically | Medium | Plan for remote distribution only. During-festival content relies on WhatsApp + Instagram screenshots, not live stories. |

---

## Language Considerations

| Audience | Language | Notes |
|----------|----------|-------|
| Croatian dancers | English | International bachata festivals in Croatia run in English. Croatian-only groups can be skipped. |
| German/Austrian dancers | English (or German) | Most DACH bachata groups are bilingual. Post in English. If a group is German-only, a short German intro line helps. |
| Italian dancers | English (or Italian) | Northern Italy feeds into Rovinj festivals. Post in English for international groups. For Italian-only groups, a 1-line Italian intro. |
| International / online | English | Default. |

---

## Open Questions for Kirill

1. Will you attend Summer Bachata Festival in Rovinj personally? (Affects during-festival content plan.)
2. Do you know anyone in the Croatian bachata scene who can share links in local groups?
3. Have you attended this festival before or know the organizer?
4. Can you check if SDTV has covered this festival in previous years (video archive)?

---

*This plan follows the reusable playbook at `../01_Launch_Distribution_Playbook.md`. After Rovinj, update this document with lessons learned for the Munich pilot in October.*
