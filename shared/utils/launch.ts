/**
 * Launch workspace (Business → page → Launch): the path an organiser walks to
 * set up a new night or business, by doing the real work. Most steps happen
 * outside WeDance (Google Maps, Instagram, listing sites, a sign at the door),
 * so each step gives ready-to-paste text, a link to the right screen, a place
 * for evidence and a done tick. The catalogue is code; the organiser's answers
 * live in `launch_steps` / `launch_names` / `launch_evidence` (migration 0068).
 *
 * Rules that came out of the chat this was built from (2026-11-12):
 * - Never show a check result without evidence: a name is "free" only when an
 *   evidence entry with a link says so, and no entry says "taken".
 * - The organiser knows the scene better than the AI: every draft, field and
 *   link is editable, and an edit sticks (it is stored, not re-derived).
 * - Every step says in one line why it matters.
 */

export type LaunchStatus = 'todo' | 'doing' | 'done'
export type Verdict = 'free' | 'taken' | 'unclear'
/** A name's standing, computed from its evidence. */
export type NameVerdict = Verdict | 'unchecked'
export type Values = Record<string, string>

export interface LaunchField {
  key: string
  label: string
  kind?: 'text' | 'textarea' | 'url'
  max?: number
  hint?: string
}
export interface LaunchCopy {
  key: string
  label: string
  /** Platform limit, shown as a counter (e.g. Instagram bio = 150). */
  max?: number
  hint?: string
  draft: (v: Values) => string
}
export interface LaunchLink {
  label: string
  url: (v: Values, ctx: { username: string }) => string | null
  /** false = we didn't confirm this is the right screen; the organiser can correct it. */
  checked?: boolean
}
export interface LaunchStep {
  key: string
  stage: StageKey
  title: string
  why: string
  fields: LaunchField[]
  copy: LaunchCopy[]
  links: LaunchLink[]
  /** 'link' = it can only be marked done with at least one evidence link (the live listing, the profile…). */
  proof?: 'link'
  /** The name step has its own body: candidates with evidence. */
  kind?: 'names'
}

export const STAGES = [
  { n: 1, key: 'brand', title: 'Brand', line: 'Why you exist and where people find you.', live: true },
  { n: 2, key: 'name', title: 'Name', line: 'A name nobody in your city uses, checked with evidence.', live: true },
  { n: 3, key: 'channels', title: 'Channels', line: 'Google Maps, Instagram, your page and free listings, set up once.', live: true },
  { n: 4, key: 'goals', title: 'Goals', line: 'One number to watch for the first 8 weeks, and a keep-or-change line.', live: false },
  { n: 5, key: 'campaigns', title: 'First campaigns', line: 'The first initiatives that bring the first people.', live: false },
  { n: 6, key: 'content', title: 'Content plan', line: 'What you post each week, planned ahead.', live: false },
  { n: 7, key: 'repeat', title: 'Run, measure, review', line: 'Every week: run the night, count, look back, adjust.', live: false },
  { n: 8, key: 'money', title: 'Money', line: 'Door, bar, bookings: what comes in and what goes out.', live: false },
] as const
export type StageKey = typeof STAGES[number]['key']

// --- helpers for drafts: never invent — an empty field leaves its words out.
const has = (s?: string) => !!s && !!s.trim()
const t = (s?: string) => (s ?? '').trim()
const at = (h?: string) => (has(h) ? `@${t(h).replace(/^@/, '')}` : '')
const join = (parts: (string | false | undefined)[], sep = ' ') => parts.filter(p => typeof p === 'string' && p.trim()).join(sep)
export const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`)
const enc = encodeURIComponent
const placeOf = (v: Values) => t(v.placeName) || t(v.displayName)
const fullName = (v: Values) => t(v.displayName) || placeOf(v)
const whenLine = (v: Values) => join([t(v.night), t(v.hours)], ', ')
const whereLine = (v: Values) => join([t(v.venueName), t(v.address)], ', ')

/** What a listing site needs: title, when, where, a few lines, price, link. */
const listingText = (v: Values) => join([
  fullName(v),
  whenLine(v),
  whereLine(v),
  '',
  t(v.pitchLong) || t(v.pitchShort),
  has(v.music) && `Music: ${t(v.music)}`,
  has(v.price) && `Entry: ${t(v.price)}`,
  has(v.brandName) && `Presented by ${t(v.brandName)}${has(v.brandWebsite) ? ` (${t(v.brandWebsite)})` : ''}`,
  has(v.placeInstagram) && `Instagram: ${at(v.placeInstagram)}`,
], '\n').replace(/\n{3,}/g, '\n\n')

/**
 * Instagram bio (150 max): whole lines only — the pitch gives way to the
 * search words, then the last lines drop, so nothing ends half-cut.
 */
export function igBio(v: Values) {
  const tail = [has(whenLine(v)) && `🗓 ${whenLine(v)}`, has(v.address) && `📍 ${t(v.address)}`, has(v.brandInstagram) && `by ${at(v.brandInstagram)}`]
  const lines = (head: string) => [head, ...tail].filter(x => typeof x === 'string' && x.trim()) as string[]
  // The pitch if everything fits, else the shorter search words; then drop lines from the end.
  const full = lines(t(v.pitchShort)).join('\n')
  if (full.length <= 150) return full
  const short = lines(t(v.searchWords))
  while (short.length) {
    const text = short.join('\n')
    if (text.length <= 150) return text
    short.pop()
  }
  return clip(t(v.searchWords), 150)
}

const listing = (key: string, title: string, why: string, home: string, checked: boolean): LaunchStep => ({
  key, stage: 'channels', title, why,
  fields: [],
  copy: [{ key: 'text', label: 'Event text', draft: listingText }],
  links: [{ label: `Open ${title.replace(/^List on /, '')}`, url: () => home, checked }],
  proof: 'link',
})

export const STEPS: LaunchStep[] = [
  // ── 1 · Brand ──────────────────────────────────────────────────────────
  {
    key: 'brand.why', stage: 'brand', title: 'Why: who is behind it',
    why: 'A brand with a reason is easier to post about every week than a party with a date.',
    fields: [
      { key: 'brandName', label: 'Organiser brand', hint: 'The “why”: the community or brand that presents the night.' },
      { key: 'brandWhy', label: 'The why, in one line', kind: 'textarea', max: 200 },
      { key: 'brandInstagram', label: 'Its Instagram handle' },
      { key: 'brandWebsite', label: 'Its website', kind: 'url' },
    ],
    copy: [{ key: 'presents', label: '“Presents” line', hint: 'For captions, flyers and listings.', draft: v => join([t(v.brandName), has(v.brandName) && has(placeOf(v)) && 'presents', fullName(v)]) }],
    links: [],
  },
  {
    key: 'brand.where', stage: 'brand', title: 'Where: the place',
    why: 'People search for a place, not an organiser. The place name is what goes on Maps and on the door.',
    fields: [
      { key: 'placeName', label: 'Place name (working)', hint: 'Stage 2 replaces it with the name you decide on.' },
      { key: 'displayName', label: 'Full name, as on the sign', hint: 'Name plus search words, e.g. “… – Latin Disco”. Maps and Instagram use it.' },
      { key: 'venueName', label: 'Venue (whose room it is)' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'night', label: 'When', hint: 'e.g. Every Thursday' },
      { key: 'hours', label: 'Hours', hint: 'e.g. 19:00–00:00' },
      { key: 'price', label: 'Entry' },
      { key: 'music', label: 'Music' },
      { key: 'placeInstagram', label: 'The place’s Instagram handle' },
      { key: 'venueInstagram', label: 'The venue’s Instagram handle' },
    ],
    copy: [{ key: 'line', label: 'Where-and-when line', draft: v => join([fullName(v), whenLine(v), whereLine(v)], ' · ') }],
    links: [],
  },
  {
    key: 'brand.pitch', stage: 'brand', title: 'The pitch',
    why: 'One sentence you can paste anywhere, so every channel says the same thing.',
    fields: [
      { key: 'searchWords', label: 'Search words', hint: 'What people type when they look for a night like this, most important first.' },
      { key: 'pitchShort', label: 'Short pitch', kind: 'textarea', max: 140 },
      { key: 'pitchLong', label: 'Longer pitch (3–4 lines)', kind: 'textarea', max: 600 },
    ],
    copy: [{ key: 'oneLiner', label: 'One-liner', max: 140, draft: v => clip(join([fullName(v), has(v.pitchShort) ? `– ${t(v.pitchShort)}` : '']), 140) }],
    links: [],
  },

  // ── 2 · Name ───────────────────────────────────────────────────────────
  {
    key: 'name.pick', stage: 'name', kind: 'names', title: 'Pick a name nobody here uses',
    why: 'If the name is already taken nearby, searches send your people to someone else’s event.',
    fields: [{ key: 'nameArea', label: 'Where to check', hint: 'City or region the name must be free in.' }],
    copy: [],
    links: [
      { label: 'German trademark register (DPMA)', url: () => 'https://register.dpma.de/DPMAregister/marke/einsteiger', checked: false },
    ],
  },

  // ── 3 · Channels: Google Maps ──────────────────────────────────────────
  {
    key: 'maps.name', stage: 'channels', title: 'Google Maps: name matches the sign',
    why: 'Google suspends listings whose name isn’t what people see at the door. A sign on the night keeps it safe.',
    fields: [
      { key: 'mapsUrl', label: 'Your Maps listing link', kind: 'url' },
      { key: 'signText', label: 'What the sign at the door says' },
    ],
    copy: [
      { key: 'name', label: 'Business name on Maps', draft: fullName },
      { key: 'sign', label: 'Text for the sign', draft: v => join([fullName(v), whenLine(v)], '\n') },
    ],
    links: [
      { label: 'Google Business Profile', url: () => 'https://business.google.com/locations', checked: true },
      { label: 'Your listing on Maps', url: v => (has(v.mapsUrl) ? t(v.mapsUrl) : null), checked: true },
    ],
    proof: 'link',
  },
  {
    key: 'maps.basics', stage: 'channels', title: 'Google Maps: category and hours',
    why: 'Category and opening hours decide which searches show you, and “open now” only works with the right hours.',
    fields: [
      { key: 'mapsCategory', label: 'Primary category', hint: 'Pick from what Google offers when you type it.' },
      { key: 'mapsHours', label: 'Opening hours', hint: 'Only the night you run; every other day closed.' },
    ],
    copy: [{ key: 'hours', label: 'Hours', draft: v => t(v.mapsHours) || join([t(v.night), t(v.hours)], ' ') }],
    links: [{ label: 'Edit profile in Google Business Profile', url: () => 'https://business.google.com/locations', checked: true }],
  },
  {
    key: 'maps.description', stage: 'channels', title: 'Google Maps: description',
    why: 'Start with the words people search for; Google and people read the first line first.',
    fields: [],
    copy: [{
      key: 'description', label: 'Business description', max: 750, hint: 'Starts with your search words.',
      draft: v => clip(join([
        has(v.searchWords) ? `${t(v.searchWords)}${has(v.city) ? ` in ${t(v.city)}` : ''}.` : '',
        t(v.pitchShort),
        join([whenLine(v), has(v.venueName) && `at ${t(v.venueName)}`, has(v.address) && `(${t(v.address)})`]) + (has(whenLine(v)) ? '.' : ''),
        has(v.price) && `${t(v.price)}.`,
        has(v.brandName) && `Presented by ${t(v.brandName)}.`,
      ]), 750),
    }],
    links: [{ label: 'Edit profile in Google Business Profile', url: () => 'https://business.google.com/locations', checked: true }],
  },
  {
    key: 'maps.weekly_post', stage: 'channels', title: 'Google Maps: a post every week',
    why: 'A fresh post each week tells Google the place is alive and shows this week’s night to people who find you.',
    fields: [],
    copy: [{ key: 'post', label: 'Weekly post', max: 1500, draft: v => join([`This week at ${fullName(v) || 'our place'}`, whenLine(v), has(v.music) && t(v.music), has(v.price) && t(v.price), has(v.address) && `📍 ${t(v.address)}`], '\n') }],
    links: [{ label: 'Add update in Google Business Profile', url: () => 'https://business.google.com/locations', checked: true }],
  },
  {
    key: 'maps.reviews', stage: 'channels', title: 'Google Maps: reviews from a QR code',
    why: 'Reviews move you up in Maps; a QR code at the bar turns a good night into a review on the spot.',
    fields: [{ key: 'reviewLink', label: 'Your review link', kind: 'url', hint: 'Google Business Profile → Ask for reviews → copy the link.' }],
    copy: [{ key: 'card', label: 'Text next to the QR code', draft: v => join([`Danced with us at ${fullName(v) || 'our place'}?`, 'Tell Google about it — it takes 30 seconds.', t(v.reviewLink)], '\n') }],
    links: [{ label: 'Google Business Profile', url: () => 'https://business.google.com/locations', checked: true }],
  },

  // ── 3 · Channels: Instagram ────────────────────────────────────────────
  {
    key: 'ig.handle', stage: 'channels', title: 'Instagram: the handle',
    why: 'The handle is how people tag you and find you; one that matches the name is easy to remember.',
    fields: [{ key: 'igHandle', label: 'Handle' }],
    copy: [{ key: 'handle', label: 'Handle', draft: v => t(v.igHandle).replace(/^@/, '') }],
    links: [
      { label: 'Open the handle on Instagram', url: v => (has(v.igHandle) ? `https://www.instagram.com/${enc(t(v.igHandle).replace(/^@/, ''))}/` : null), checked: true },
      { label: 'Edit profile', url: () => 'https://www.instagram.com/accounts/edit/', checked: true },
    ],
    proof: 'link',
  },
  {
    key: 'ig.profile', stage: 'channels', title: 'Instagram: name, category and bio',
    why: 'Instagram search reads the name field, not just the handle — put your search words there.',
    fields: [{ key: 'igCategory', label: 'Category', hint: 'Set in the app: Edit profile → Category.' }],
    copy: [
      { key: 'name', label: 'Name field', max: 64, draft: v => clip(join([placeOf(v), has(v.searchWords) ? `| ${t(v.searchWords)}` : '']), 64) },
      { key: 'bio', label: 'Bio', max: 150, draft: igBio },
    ],
    links: [{ label: 'Edit profile', url: () => 'https://www.instagram.com/accounts/edit/', checked: true }],
  },
  {
    key: 'ig.habits', stage: 'channels', title: 'Instagram: collab and geotag, every post',
    why: 'A collab post shows on both accounts; a geotag puts you on the place’s map page. Both cost nothing.',
    fields: [],
    copy: [{ key: 'checklist', label: 'Before you post', draft: v => join([
      `☐ Collab: invite ${join([at(v.brandInstagram), at(v.venueInstagram)], ' and ') || 'the organiser and the venue'}`,
      `☐ Location: ${fullName(v) || 'your place'}`,
      '☐ Tag the DJ and teachers of the night',
      '☐ Story the post the same day',
    ], '\n') }],
    links: [],
  },

  // ── 3 · Channels: WeDance ──────────────────────────────────────────────
  {
    key: 'site.page', stage: 'channels', title: 'Your page on WeDance',
    why: 'One link that always has the next date, the address and the line-up — for the bio, Maps and listings.',
    fields: [],
    copy: [{ key: 'link', label: 'Link for your bio', draft: v => t(v.pageUrl) }],
    links: [{ label: 'Edit your website on WeDance', url: (_v, c) => `/business/network/${c.username}/website`, checked: true }],
  },
  {
    key: 'wedance.series', stage: 'channels', title: 'The weekly event series on WeDance',
    why: 'A series puts every week on the city calendar automatically, so dancers can plan it and say they’re going.',
    fields: [],
    copy: [{ key: 'title', label: 'Event title', draft: fullName }, { key: 'description', label: 'Description', draft: listingText }],
    links: [{ label: 'Create the event series', url: () => '/business/events/new', checked: true }],
    proof: 'link',
  },

  // ── 3 · Channels: free listings ────────────────────────────────────────
  listing('listing.salsavida', 'List on SalsaVida', 'The salsa guide dancers check when they’re new in town or travelling.', 'https://www.salsavida.com/guides/germany/munich/', true),
  listing('listing.rausgegangen', 'List on Rausgegangen', 'Munich’s going-out app: reaches people who aren’t dancers yet.', 'https://rausgegangen.de/muenchen/', true),
  listing('listing.inmuenchen', 'List on in-muenchen.de', 'The city magazine’s free calendar; a repeating night can be entered as a series.', 'https://www.in-muenchen.de/eintragsformular', true),
  listing('listing.gonedancing', 'List on Gone Dancing', 'Another place travelling dancers look for a night out.', 'https://www.gone-dancing.com/', false),
  listing('listing.latindancecalendar', 'List on Latin Dance Calendar', 'A Latin dance calendar dancers search by city.', 'https://www.latindancecalendar.com/', false),
]

export const STEP_KEYS = STEPS.map(s => s.key)
export const stepByKey = (key: string) => STEPS.find(s => s.key === key)

/** A step's own link overrides (`link:<i>` in its fields) win over the defaults. */
export function stepLinks(step: LaunchStep, v: Values, ctx: { username: string }, own: Values = {}) {
  return step.links.map((l, i) => {
    const mine = t(own[`link:${i}`])
    return { label: l.label, url: mine || l.url(v, ctx), checked: mine ? true : l.checked !== false, edited: !!mine }
  }).filter(l => !!l.url) as { label: string; url: string; checked: boolean; edited: boolean }[]
}

/** The text to paste: the organiser's edit if there is one, else the draft from the fields. */
export function copyText(step: LaunchStep, c: LaunchCopy, v: Values, edits: Record<string, string> = {}) {
  const mine = edits[c.key]
  return { text: mine ?? c.draft(v), edited: mine !== undefined }
}

/**
 * Every field from every step in one map. The decided name (stage 2) is the
 * place name everywhere, whatever the working name in stage 1 says.
 */
export function workspaceValues(stepFields: Values[], chosenName?: string | null): Values {
  const v: Values = Object.assign({}, ...stepFields)
  if (chosenName) {
    const old = t(v.placeName)
    v.placeName = chosenName
    // The full name follows the decision when it was built on the old working name.
    if (old && t(v.displayName).startsWith(old)) v.displayName = chosenName + t(v.displayName).slice(old.length)
    else if (!has(v.displayName)) v.displayName = chosenName
  }
  return v
}

/**
 * A name's standing from its evidence. "taken" wins; "free" needs at least one
 * entry with a link that says free. Anything else is unclear (or unchecked).
 */
export function nameVerdict(evidence: { verdict: string | null; url: string | null }[]): NameVerdict {
  const rated = evidence.filter(e => e.verdict)
  if (!rated.length) return 'unchecked'
  if (rated.some(e => e.verdict === 'taken')) return 'taken'
  if (rated.some(e => e.verdict === 'free' && has(e.url ?? ''))) return 'free'
  return 'unclear'
}

/** Can this step be ticked done? Proof steps need at least one evidence link. */
export function doneBlocker(step: LaunchStep, evidence: { url: string | null }[], ctx: { chosenName?: string | null } = {}): string | null {
  if (step.kind === 'names' && !ctx.chosenName) return 'Decide on a name first.'
  if (step.proof === 'link' && !evidence.some(e => has(e.url ?? ''))) return 'Add a link that shows it’s live (evidence) first.'
  return null
}

/** Quick-check links for a name candidate: where to look, ready to log as evidence. */
export function nameChecks(name: string, area = '') {
  const q = join([`"${name}"`, area])
  const handle = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9._]/g, '')
  return [
    { source: 'Google', url: `https://www.google.com/search?q=${enc(q)}` },
    { source: 'Google Maps', url: `https://www.google.com/maps/search/${enc(join([name, area]))}` },
    { source: 'Instagram', url: `https://www.instagram.com/${handle}/`, handle },
    { source: 'Facebook events', url: `https://www.facebook.com/search/events/?q=${enc(name)}` },
  ]
}

/** Steps per stage with how many are done — the progress path. */
export function stageProgress(statuses: Record<string, LaunchStatus | undefined>) {
  return STAGES.map((s) => {
    const steps = STEPS.filter(x => x.stage === s.key)
    const done = steps.filter(x => statuses[x.key] === 'done').length
    const started = steps.some(x => statuses[x.key] && statuses[x.key] !== 'todo')
    return { ...s, total: steps.length, done, state: !s.live ? 'next' as const : steps.length && done === steps.length ? 'done' as const : started ? 'doing' as const : 'todo' as const }
  })
}
