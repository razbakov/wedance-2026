/**
 * Launch kickoff: about eight plain questions, one screen each, tap answers
 * and a skip. The answers land in the existing step fields (brand name, the
 * place, the pitch…), and the template drafts in launch.ts write every text
 * from those fields only. Nothing here invents a fact the organiser didn't
 * tap or that wasn't already on the page, its events, or the venue.
 *
 * Kept to eight questions on purpose. Past that it becomes another form.
 */
import { clip, type Values } from './launch'
import { eventLocalTime, eventLocalWeekday } from './eventTime'

export const KICKOFF_KEYS = ['call', 'room', 'when', 'dances', 'door', 'friend', 'who', 'why'] as const
export type KickoffKey = typeof KICKOFF_KEYS[number]

export interface LaunchKnown {
  profileName: string
  profileType: string
  city: string
  address: string
  /** Styles already on the page or its events, page first, then most common. */
  styles: string[]
  instagram: string
  website: string
  eventName: string
  /** "Every Thursday" when the events agree on a weekday. */
  night: string
  /** "19:00–00:00" when the events on that weekday agree. */
  hours: string
  price: string
  venueName: string
  venueAddress: string
  venueCity: string
  venueInstagram: string
}

export const EMPTY_KNOWN: LaunchKnown = {
  profileName: '', profileType: '', city: '', address: '', styles: [], instagram: '', website: '',
  eventName: '', night: '', hours: '', price: '', venueName: '', venueAddress: '', venueCity: '', venueInstagram: '',
}

export interface KickoffEvent {
  name?: string | null
  start?: Date | string | null
  end?: Date | string | null
  timezone?: string | null
  price?: string | null
  styles?: string[] | null
  venueName?: string | null
  venueAddress?: string | null
  venueUsername?: string | null
  city?: string | null
}

export interface KickoffProfile {
  username: string
  name: string
  type: string
  city?: string | null
  address?: string | null
  styles?: string[] | null
  instagram?: string | null
  website?: string | null
}

export interface KickoffVenue {
  name: string
  city?: string | null
  address?: string | null
  instagram?: string | null
}

export interface KickoffOption {
  id: string
  label: string
  /** Field values this tap writes. An empty set clears the question's fields (a real "none"). */
  set: Values
}

export interface KickoffQuestion {
  key: KickoffKey
  prompt: string
  hint: string
  pick: 'single' | 'multi'
  /** Chips for short taps; a stack for a sentence. */
  layout: 'chips' | 'stack'
  options: KickoffOption[]
  /** Pre-selected when this question has no saved answer and wasn't skipped. */
  suggest: string[]
  ownWords?: { step: string; field: string; placeholder: string; max: number }
  /** Every field this question is allowed to write, and the step it lives on. */
  owns: { step: string; key: string }[]
  /** Multi questions write the tapped labels, in tap order, into these fields. */
  join?: string[]
}

export interface FieldPatch {
  step: string
  set: Values
  clear: string[]
}

const TAP_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Cuban Salsa', 'Rueda', 'Latin Disco']
const EVENINGS: [string, string][] = [
  ['Every Thursday', '19:00–00:00'],
  ['Every Friday', '21:00–02:00'],
  ['Every Saturday', '21:00–02:00'],
  ['Every Sunday', '18:00–22:00'],
]
const PRICES = ['Free', '€5', '€10', '€15']
const WHYS = [
  'So people have a weeknight to dance',
  'To give this music a home here',
  'Because the scene needed a room',
]

const trim = (s?: string | null) => (s ?? '').trim()

function mode(xs: string[]): string {
  const counts = new Map<string, number>()
  for (const x of xs) {
    const v = x.trim()
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best = ''
  let n = 0
  for (const [k, c] of counts) if (c > n) { best = k; n = c }
  return best
}

function unique(xs: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of xs) {
    const v = x.trim()
    const k = v.toLowerCase()
    if (!v || seen.has(k)) continue
    seen.add(k)
    out.push(v)
  }
  return out
}

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

/** The venue a night keeps returning to, when it isn't the page itself. */
export function mainVenueUsername(profileUsername: string, profileType: string, events: KickoffEvent[]): string {
  if (profileType === 'venue') return ''
  return mode(events.map(e => trim(e.venueUsername)).filter(u => u && u !== profileUsername))
}

/** What the kickoff can offer as taps, from the page, its events and the venue. No guesses. */
export function launchKnown(profile: KickoffProfile, events: KickoffEvent[], venue?: KickoffVenue | null): LaunchKnown {
  const zone = (e: KickoffEvent) => e.timezone || 'Europe/Berlin'
  const dated = events.filter(e => e.start)
  const days = dated.map(e => ({ e, day: eventLocalWeekday(e.start!, zone(e)) }))
  const day = mode(days.map(d => d.day))
  const onDay = day ? days.filter(d => d.day === day) : []
  const hours = mode(onDay.map((d) => {
    if (!d.e.end) return ''
    return `${eventLocalTime(d.e.start!, zone(d.e))}–${eventLocalTime(d.e.end, zone(d.e))}`
  }))
  const eventStyles = modeList(events.flatMap(e => e.styles ?? []))
  const profileStyles = (profile.styles ?? []).map(s => s.trim()).filter(Boolean)
  const pageIsVenue = profile.type === 'venue'
  return {
    profileName: trim(profile.name),
    profileType: profile.type,
    city: trim(profile.city) || trim(venue?.city) || mode(events.map(e => trim(e.city))),
    address: trim(profile.address),
    styles: unique([...profileStyles, ...eventStyles]),
    instagram: trim(profile.instagram).replace(/^@/, ''),
    website: trim(profile.website),
    eventName: mode(events.map(e => trim(e.name))),
    night: day ? `Every ${day}` : '',
    hours,
    price: mode(events.map(e => trim(e.price))),
    venueName: pageIsVenue ? trim(profile.name) : (trim(venue?.name) || mode(events.map(e => trim(e.venueName)))),
    venueAddress: pageIsVenue ? trim(profile.address) : (trim(venue?.address) || mode(events.map(e => trim(e.venueAddress)))),
    venueCity: pageIsVenue ? trim(profile.city) : (trim(venue?.city) || mode(events.map(e => trim(e.city)))),
    venueInstagram: pageIsVenue ? trim(profile.instagram).replace(/^@/, '') : trim(venue?.instagram).replace(/^@/, ''),
  }
}

/** Most common strings, highest first. */
function modeList(xs: string[]): string[] {
  const counts = new Map<string, number>()
  for (const x of xs) {
    const v = x.trim()
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k)
}

/** "La Clave" + "Salsa, Bachata" → "La Clave – Salsa". The place alone when there's no search word. */
export function derivedDisplayName(place: string, search: string): string {
  const name = place.trim()
  const first = search.split(',')[0]?.trim() ?? ''
  if (!name) return ''
  if (!first || first.toLowerCase() === name.toLowerCase()) return name
  const full = `${name} – ${first}`
  return full.length > 80 ? name : full
}

function own(step: string, field: string, placeholder: string, max: number) {
  return { step, field, placeholder, max }
}

/**
 * The eight questions, in order. Options that depend on earlier answers
 * (the sentence a friend would hear) are built from `values`.
 */
export function kickoffQuestions(known: LaunchKnown, values: Values = {}): KickoffQuestion[] {
  const place = trim(values.placeName) || known.profileName
  return [
    callQuestion(known),
    roomQuestion(known),
    whenQuestion(known),
    dancesQuestion(known),
    doorQuestion(known),
    friendQuestion(values),
    whoQuestion(known, place),
    whyQuestion(),
  ]
}

function callQuestion(known: LaunchKnown): KickoffQuestion {
  const options: KickoffOption[] = []
  if (known.profileName) options.push({ id: 'page', label: known.profileName, set: { placeName: known.profileName } })
  if (known.eventName && known.eventName.toLowerCase() !== known.profileName.toLowerCase()) {
    options.push({ id: 'event', label: known.eventName, set: { placeName: known.eventName } })
  }
  const suggest = options[0] ? [options[0].id] : []
  return {
    key: 'call',
    prompt: 'What do you call this night?',
    hint: 'The name on the door. Skip it if you don’t have one yet.',
    pick: 'single', layout: 'stack', options, suggest,
    ownWords: own('brand.where', 'placeName', 'A short name', 80),
    owns: [{ step: 'brand.where', key: 'placeName' }, { step: 'brand.where', key: 'displayName' }],
  }
}

function roomQuestion(known: LaunchKnown): KickoffQuestion {
  const options: KickoffOption[] = []
  if (known.venueName) {
    const bits = [known.venueName, known.venueAddress].filter(Boolean).join(' · ')
    options.push({
      id: 'venue',
      label: bits,
      set: {
        venueName: known.venueName,
        ...(known.venueAddress ? { address: known.venueAddress } : {}),
        ...(known.venueCity ? { city: known.venueCity } : {}),
        ...(known.venueInstagram ? { venueInstagram: known.venueInstagram } : {}),
      },
    })
  }
  return {
    key: 'room',
    prompt: 'Whose room is it?',
    hint: 'The venue, if it has one.',
    pick: 'single', layout: 'stack', options, suggest: options[0] ? [options[0].id] : [],
    ownWords: own('brand.where', 'venueName', 'The venue’s name', 80),
    owns: [
      { step: 'brand.where', key: 'venueName' },
      { step: 'brand.where', key: 'address' },
      { step: 'brand.where', key: 'city' },
      { step: 'brand.where', key: 'venueInstagram' },
    ],
  }
}

function whenQuestion(known: LaunchKnown): KickoffQuestion {
  const options: KickoffOption[] = []
  const add = (night: string, hours: string) => {
    const id = slug(`${night} ${hours}`) || 'evening'
    if (options.some(o => o.id === id)) return id
    options.push({ id, label: hours ? `${night}, ${hours}` : night, set: hours ? { night, hours } : { night } })
    return id
  }
  let suggest: string[] = []
  if (known.night) suggest = [add(known.night, known.hours)]
  for (const [night, hours] of EVENINGS) add(night, hours)
  return {
    key: 'when',
    prompt: 'Which evening, and from when until when?',
    hint: 'The evening you actually run.',
    pick: 'single', layout: 'chips', options, suggest,
    ownWords: own('brand.where', 'night', 'e.g. Every Wednesday, 20:00–01:00', 80),
    owns: [{ step: 'brand.where', key: 'night' }, { step: 'brand.where', key: 'hours' }],
  }
}

function dancesQuestion(known: LaunchKnown): KickoffQuestion {
  const labels = unique([...known.styles, ...TAP_STYLES]).slice(0, 12)
  const options = labels.map(label => ({ id: slug(label) || 'style', label, set: {} }))
  const suggest = known.styles.map(s => slug(s)).filter(id => options.some(o => o.id === id)).slice(0, 6)
  return {
    key: 'dances',
    prompt: 'What do people dance?',
    hint: 'Tap the ones you play, most important first.',
    pick: 'multi', layout: 'chips', options, suggest,
    owns: [{ step: 'brand.where', key: 'music' }, { step: 'brand.pitch', key: 'searchWords' }],
    join: ['music', 'searchWords'],
  }
}

function doorQuestion(known: LaunchKnown): KickoffQuestion {
  const options: KickoffOption[] = []
  const price = known.price
  if (price && !PRICES.some(p => p.toLowerCase() === price.toLowerCase())) {
    options.push({ id: 'known', label: price, set: { price } })
  }
  for (const p of PRICES) options.push({ id: slug(p), label: p, set: { price: p } })
  const suggestId = price ? (options.find(o => o.set.price?.toLowerCase() === price.toLowerCase())?.id ?? '') : ''
  return {
    key: 'door',
    prompt: 'What does it cost to walk in?',
    hint: 'What a dancer pays at the door.',
    pick: 'single', layout: 'chips', options, suggest: suggestId ? [suggestId] : [],
    ownWords: own('brand.where', 'price', 'e.g. €12, or free before 21:00', 40),
    owns: [{ step: 'brand.where', key: 'price' }],
  }
}

function friendQuestion(values: Values): KickoffQuestion {
  const styles = trim(values.music) || trim(values.searchWords)
  const venue = trim(values.venueName)
  const night = trim(values.night)
  const place = trim(values.placeName)
  const candidates = [
    styles && venue ? `${styles} at ${venue}` : '',
    night && styles ? `${night}: ${styles}` : '',
    place && styles ? `${place} — ${styles}` : '',
    styles ? styles : '',
  ].filter(Boolean).map(s => clip(s, 140))
  const options: KickoffOption[] = []
  for (const label of unique(candidates)) {
    options.push({ id: slug(label) || `line-${options.length}`, label, set: { pitchShort: label } })
  }
  return {
    key: 'friend',
    prompt: 'When a friend asks what this night is, what do you say?',
    hint: 'One sentence. Tap one, or say it yourself.',
    pick: 'single', layout: 'stack', options: options.slice(0, 4), suggest: [],
    ownWords: own('brand.pitch', 'pitchShort', 'Say it the way you would', 140),
    owns: [{ step: 'brand.pitch', key: 'pitchShort' }],
  }
}

function whoQuestion(known: LaunchKnown, place: string): KickoffQuestion {
  const options: KickoffOption[] = []
  if (known.profileName) {
    options.push({
      id: 'profile',
      label: known.profileName,
      set: {
        brandName: known.profileName,
        ...(known.instagram ? { brandInstagram: known.instagram } : {}),
        ...(known.website ? { brandWebsite: known.website } : {}),
      },
    })
  }
  if (place && place.toLowerCase() !== known.profileName.toLowerCase()) {
    options.push({ id: 'place', label: `The night itself, ${place}`, set: { brandName: place } })
  }
  options.push({ id: 'none', label: 'No separate brand', set: {} })
  return {
    key: 'who',
    prompt: 'Who presents it — the brand behind the night?',
    hint: 'Skip it if the night has no brand of its own.',
    pick: 'single', layout: 'stack', options, suggest: known.profileName ? ['profile'] : [],
    ownWords: own('brand.why', 'brandName', 'The brand’s name', 80),
    owns: [
      { step: 'brand.why', key: 'brandName' },
      { step: 'brand.why', key: 'brandInstagram' },
      { step: 'brand.why', key: 'brandWebsite' },
    ],
  }
}

function whyQuestion(): KickoffQuestion {
  return {
    key: 'why',
    prompt: 'Why do you run it?',
    hint: 'A reason you can stand behind. We’ll use your words, and nothing else.',
    pick: 'single', layout: 'stack', suggest: [],
    options: WHYS.map(label => ({ id: slug(label), label, set: { brandWhy: label } })),
    ownWords: own('brand.why', 'brandWhy', 'In one line', 200),
    owns: [{ step: 'brand.why', key: 'brandWhy' }],
  }
}

export function encodePicks(picks: Record<string, string[]>): string {
  return Object.entries(picks)
    .filter(([, ids]) => ids.length)
    .map(([k, ids]) => `${k}=${ids.join('+')}`)
    .join(',')
}

export function decodePicks(raw: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const part of raw.split(',')) {
    const i = part.indexOf('=')
    if (i <= 0) continue
    const ids = part.slice(i + 1).split('+').filter(Boolean)
    if (ids.length) out[part.slice(0, i)] = ids
  }
  return out
}

/** What to show selected: a saved tap, their own words, or the prefilled suggestion. */
export function kickoffSelection(q: KickoffQuestion, values: Values, skipped: string[], picks: Record<string, string[]>): { optionIds: string[]; custom: string } {
  if (skipped.includes(q.key)) return { optionIds: [], custom: '' }
  const picked = picks[q.key]
  if (picked?.length) {
    if (picked[0] === 'own' && q.ownWords) return { optionIds: [], custom: trim(values[q.ownWords.field]) }
    return { optionIds: picked.filter(id => q.options.some(o => o.id === id)), custom: '' }
  }
  if (q.pick === 'multi') {
    const key = q.join?.[0]
    const labels = trim(values[key ?? '']).split(',').map(s => s.trim()).filter(Boolean)
    const ids = labels.map(label => q.options.find(o => o.label === label)?.id).filter((id): id is string => !!id)
    if (ids.length) return { optionIds: ids, custom: '' }
  } else {
    const matched = q.options.filter((o) => {
      const entries = Object.entries(o.set).filter(([, v]) => v.trim())
      return entries.length > 0 && entries.every(([k, v]) => (values[k] ?? '') === v)
    })
    if (matched[0]) return { optionIds: [matched[0].id], custom: '' }
    if (q.ownWords) {
      const ownValue = trim(values[q.ownWords.field])
      const covered = q.options.some(o => trim(o.set[q.ownWords!.field]) === ownValue)
      if (ownValue && !covered) return { optionIds: [], custom: ownValue }
    }
  }
  return { optionIds: q.suggest.filter(id => q.options.some(o => o.id === id)), custom: '' }
}

/**
 * Turn one answer into field patches. A skip clears the question's fields.
 * Option ids the question doesn't have are ignored. Own words win over a tap.
 */
export function kickoffPatches(
  q: KickoffQuestion,
  input: { skip: boolean; optionIds?: string[]; custom?: string },
  values: Values,
): FieldPatch[] {
  const buckets = new Map<string, { set: Values; clear: string[] }>()
  const bucket = (step: string) => {
    let b = buckets.get(step)
    if (!b) { b = { set: {}, clear: [] }; buckets.set(step, b) }
    return b
  }
  for (const o of q.owns) bucket(o.step).clear.push(o.key)

  if (!input.skip) {
    const custom = trim(input.custom)
    if (custom && q.ownWords) {
      bucket(q.ownWords.step).set[q.ownWords.field] = custom.slice(0, q.ownWords.max)
    } else if (q.pick === 'multi') {
      const labels = (input.optionIds ?? []).map(id => q.options.find(o => o.id === id)?.label).filter((x): x is string => !!x)
      const joined = labels.join(', ')
      for (const key of q.join ?? []) {
        const own = q.owns.find(o => o.key === key)
        if (own && joined) bucket(own.step).set[key] = joined
      }
    } else {
      for (const id of input.optionIds ?? []) {
        const opt = q.options.find(o => o.id === id)
        if (!opt) continue
        for (const [k, v] of Object.entries(opt.set)) {
          const own = q.owns.find(o => o.key === k)
          if (!own) continue
          const max = q.ownWords?.field === k ? q.ownWords.max : 4000
          if (v.trim()) bucket(own.step).set[k] = v.trim().slice(0, max)
        }
      }
    }
  }

  if (q.owns.some(o => o.key === 'placeName' || o.key === 'searchWords' || o.key === 'displayName')) {
    const merged: Values = { ...values }
    for (const b of buckets.values()) {
      for (const k of b.clear) if (!(k in b.set)) delete merged[k]
      Object.assign(merged, b.set)
    }
    const derived = derivedDisplayName(trim(merged.placeName), trim(merged.searchWords))
    const where = bucket('brand.where')
    if (derived) where.set.displayName = derived
    else if (!where.clear.includes('displayName')) where.clear.push('displayName')
  }

  return [...buckets.entries()].map(([step, b]) => ({ step, set: b.set, clear: b.clear }))
}

/**
 * Facts the page already has, written only into fields the kickoff left empty:
 * the city, the page's Instagram, and the brand's link when the brand is the page.
 */
export function knownFills(known: LaunchKnown, values: Values): FieldPatch[] {
  const extra: { step: string; key: string; value: string }[] = []
  const put = (step: string, key: string, value: string) => {
    if (!value.trim() || trim(values[key])) return
    extra.push({ step, key, value: value.trim() })
  }
  put('brand.where', 'city', known.city || known.venueCity)
  put('brand.where', 'placeInstagram', known.instagram)
  put('ig.handle', 'igHandle', known.instagram)
  if (known.profileName && trim(values.brandName).toLowerCase() === known.profileName.toLowerCase()) {
    put('brand.why', 'brandInstagram', known.instagram)
    put('brand.why', 'brandWebsite', known.website)
  }
  const derived = derivedDisplayName(trim(values.placeName), trim(values.searchWords))
  const current = trim(values.displayName)
  if (derived && (!current || current === trim(values.placeName)) && derived !== current) {
    extra.push({ step: 'brand.where', key: 'displayName', value: derived })
  }
  const byStep = new Map<string, Values>()
  for (const e of extra) {
    const set = byStep.get(e.step) ?? {}
    set[e.key] = e.value
    byStep.set(e.step, set)
  }
  return [...byStep.entries()].map(([step, set]) => ({ step, set, clear: [] }))
}
