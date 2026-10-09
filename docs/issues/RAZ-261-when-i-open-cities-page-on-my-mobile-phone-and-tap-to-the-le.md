---
title: "🐞 When I open cities page on my mobile phone and tap to the left and rig…"
type: Bug
id: RAZ-261
status: done
state: Done
state_type: completed
project: null
labels: ["user-report"]
assignee: null
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-06T16:03:17.412Z
started: null
completed: "2026-10-07T13:50:35.481Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/171"]
linear_url: https://linear.app/alosha/issue/RAZ-261/when-i-open-cities-page-on-my-mobile-phone-and-tap-to-the-left-and-rig
exported: 2026-10-09
---

# RAZ-261 — 🐞 When I open cities page on my mobile phone and tap to the left and rig…

When I open cities page on my mobile phone and tap to the left and right focus get lost. Make the page more stable during scrolling and ensure responsive design

---

**Reported by:** Vamos_a_bailar · [[email redacted]](<mailto:[email redacted]>) · dancer `8b03b1ce-d791-4dd9-ab13-2a94b12d0fb9`
**Page:** [https://2026.wedance.vip/events/e48c624d-948b-450f-90b4-70c6fc17593d](<https://2026.wedance.vip/events/e48c624d-948b-450f-90b4-70c6fc17593d>)
**Route:** `/events/e48c624d-948b-450f-90b4-70c6fc17593d`
**Referrer:** [https://2026.wedance.vip/](<https://2026.wedance.vip/>)
**Environment:** UA: Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1 · viewport 344×582 · screen 393×852 · dpr 3 · lang en-GB · tz Europe/Berlin · online · build dadf4fc

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Links

- [fix: stop page scrolling sideways on mobile](https://github.com/razbakov/wedance-2026/pull/171)

## Comments

### Forge · 2026-10-07 13:50 UTC

### ✅ Done — Fixed sideways scrolling on mobile city and event pages

**Live:** https://2026.wedance.vip/cities
**PR:** https://github.com/razbakov/wedance-2026/pull/171

**Try it**
1. Open https://2026.wedance.vip/cities on your phone
2. Scroll left and right — page should no longer shift sideways
3. Tap into a city page and scroll — layout stays stable
