# Privacy Policy -- App Footer Version

Use this text in the app footer, linked to the full Privacy Policy page.

---

## Footer Link Text

```
Privacy Policy
```

## Privacy Summary (for a dedicated /privacy page or expandable footer section)

```
Privacy at WeDance

No account required. No login. No personal data collected.

We use PostHog to collect anonymous usage analytics (page views, filter clicks,
return visits) so we can understand whether this schedule is useful. We use
first-party cookies only -- no advertising, no tracking pixels, no retargeting.

We do not sell your data. Ever.

You can opt out by enabling "Do Not Track" in your browser or by blocking
PostHog with an ad blocker.

Questions? Email privacy@wedance.vip

Full privacy policy: [link to /privacy]
```

## Implementation Notes

- The footer currently reads "Powered by WeDance" (per Decision 10).
- Add a "Privacy" link next to it, separated by a dot or pipe character.
- Example: `Powered by WeDance · Privacy`
- The link should point to either:
  - A `/privacy` route within the Nuxt app (preferred -- keeps users in the app), or
  - An anchor that expands the summary text inline (acceptable for MVP)
- The full Privacy_Policy.md should be rendered as the content of that page.
- Cookie consent banner: required before PostHog initializes if serving EU users.
  Display a simple banner: "We use anonymous analytics cookies to improve this schedule. [Accept] [Decline]"
  If declined, do not load the PostHog plugin.
