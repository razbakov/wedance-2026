/**
 * City occasions (RAZ-970): the dates a city's WeDance admins plan posts around — Bavaria's
 * silent days (Tanzverbot), Fasching, Halloween, New Year's Eve, Oktoberfest, open-air season —
 * and the post written for each. Pure: the Plan tab and the server use the same rules.
 *
 * Silent days follow the Bavarian holiday law (BayFTG Art. 3, checked 2026-11-15 against
 * gesetze-bayern.de and muenchen.de): nine days, protected 02:00–24:00, Good Friday and Holy
 * Saturday from 00:00, Christmas Eve from 14:00. Public entertainment must keep a "serious
 * character"; Munich reads that as no public dancing. Private parties with invited guests are
 * not affected; New Year's Eve is not a silent day; fines go up to €10,000. Dance classes are
 * not addressed by either source, so the post says "ask your school" rather than guess.
 */
import { scheduleDays, type ScheduleEvent } from './citySchedule'

export type OccasionKind = 'silent' | 'party' | 'season'
export type OccasionPost = 'silent' | 'roundup'
export type Lang = 'en' | 'es' | 'ru' | 'de'
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'ru', label: 'Русский', flag: '🇷🇺' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
]
export const isLang = (s: string): s is Lang => LANGS.some(l => l.id === s)

export interface CityPlace { citySlug: string; countryCode?: string | null; region?: string | null }

export interface Occasion {
  /** `<id>:<year>` — stable across years for the same occasion. */
  key: string
  id: string
  year: number
  name: string
  localName: string | null
  kind: OccasionKind
  /** 'YYYY-MM-DD', inclusive. */
  start: string
  end: string
  note: string
  post: OccasionPost
  /** Post on or before this day. */
  postBy: string
  /** Ask the city's organisers what they plan by this day (party / season only). */
  askBy: string | null
  /** Silent days: when the protection starts each day ('HH:MM'); it ends at 24:00. */
  silentFrom?: string
}

// ── Dates ───────────────────────────────────────────────────────────────────

export const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
/** 0 = Sunday … 6 = Saturday. */
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay()

/** Easter Sunday (Gregorian, anonymous algorithm). */
export function easterSunday(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return ymd(year, month, day)
}

/** First Sunday of Advent: four Sundays before Christmas. */
export function firstAdvent(year: number): string {
  const xmasEve = ymd(year, 12, 24)
  const fourth = addDays(xmasEve, -weekday(xmasEve)) // the Sunday on or before 24 Dec
  return addDays(fourth, -21)
}

/** Oktoberfest: the Saturday after 15 Sep to the first Sunday of October, or to 3 Oct when that is later. */
export function oktoberfest(year: number): { start: string; end: string } {
  const sep16 = ymd(year, 9, 16)
  const start = addDays(sep16, (6 - weekday(sep16) + 7) % 7)
  const oct1 = ymd(year, 10, 1)
  const firstSunday = addDays(oct1, (7 - weekday(oct1)) % 7)
  return { start, end: firstSunday < ymd(year, 10, 3) ? ymd(year, 10, 3) : firstSunday }
}

// ── Where each occasion applies ─────────────────────────────────────────────

const BAVARIAN_CITIES = new Set(['munich', 'nuremberg', 'augsburg', 'regensburg', 'wurzburg', 'ingolstadt', 'erlangen', 'furth', 'bamberg', 'bayreuth', 'landshut', 'passau', 'rosenheim'])
export function isBavaria(place: CityPlace): boolean {
  if (/bavari|bayern/i.test(place.region ?? '')) return true
  return (!place.countryCode || place.countryCode.toUpperCase() === 'DE') && BAVARIAN_CITIES.has(place.citySlug)
}
const inCountry = (place: CityPlace, ...codes: string[]) => !!place.countryCode && codes.includes(place.countryCode.toUpperCase())

interface Def {
  id: string
  name: string
  localName?: string
  kind: OccasionKind
  note: string
  applies: (p: CityPlace) => boolean
  dates: (year: number) => { start: string; end: string }
  silentFrom?: string
  /** Days before `start` to post / ask. */
  postLead: number
  askLead?: number
}

const one = (f: (y: number) => string) => (y: number) => ({ start: f(y), end: f(y) })

const DEFS: Def[] = [
  // Bavarian silent days (BayFTG Art. 3).
  { id: 'ash-wednesday', name: 'Ash Wednesday', localName: 'Aschermittwoch', kind: 'silent', note: 'Silent day · Fasching ends at 02:00', applies: isBavaria, dates: one(y => addDays(easterSunday(y), -46)), silentFrom: '02:00', postLead: 2 },
  { id: 'easter-silent', name: 'Easter silent days', localName: 'Gründonnerstag – Karsamstag', kind: 'silent', note: 'Silent days · Good Friday & Holy Saturday all day', applies: isBavaria, dates: y => ({ start: addDays(easterSunday(y), -3), end: addDays(easterSunday(y), -1) }), silentFrom: '02:00', postLead: 5 },
  { id: 'all-saints', name: 'All Saints’ Day', localName: 'Allerheiligen', kind: 'silent', note: 'Silent day · the Halloween night ends at 02:00', applies: isBavaria, dates: one(y => ymd(y, 11, 1)), silentFrom: '02:00', postLead: 3 },
  { id: 'volkstrauertag', name: 'Remembrance Sunday', localName: 'Volkstrauertag', kind: 'silent', note: 'Silent day · Saturday night ends at 02:00', applies: isBavaria, dates: one(y => addDays(firstAdvent(y), -14)), silentFrom: '02:00', postLead: 2 },
  { id: 'buss-und-bettag', name: 'Day of Prayer and Repentance', localName: 'Buß- und Bettag', kind: 'silent', note: 'Silent day · no public dancing 02:00–24:00', applies: isBavaria, dates: one(y => addDays(firstAdvent(y), -11)), silentFrom: '02:00', postLead: 2 },
  { id: 'totensonntag', name: 'Sunday of the Dead', localName: 'Totensonntag', kind: 'silent', note: 'Silent day · Saturday night ends at 02:00', applies: isBavaria, dates: one(y => addDays(firstAdvent(y), -7)), silentFrom: '02:00', postLead: 2 },
  { id: 'christmas-eve', name: 'Christmas Eve', localName: 'Heiligabend', kind: 'silent', note: 'Silent day from 14:00', applies: isBavaria, dates: one(y => ymd(y, 12, 24)), silentFrom: '14:00', postLead: 2 },
  // Parties and seasons.
  { id: 'fasching', name: 'Fasching', localName: 'Weiberfastnacht – Faschingsdienstag', kind: 'party', note: 'Costume parties', applies: p => inCountry(p, 'DE', 'AT'), dates: y => ({ start: addDays(easterSunday(y), -52), end: addDays(easterSunday(y), -47) }), postLead: 7, askLead: 21 },
  { id: 'open-air', name: 'Open-air season', kind: 'season', note: 'Outdoor socials', applies: () => true, dates: y => ({ start: ymd(y, 5, 1), end: ymd(y, 9, 30) }), postLead: 3, askLead: 21 },
  { id: 'oktoberfest', name: 'Oktoberfest', localName: 'Wiesn', kind: 'season', note: 'The city is full — dancing beyond the Wiesn', applies: p => p.citySlug === 'munich', dates: oktoberfest, postLead: 5, askLead: 30 },
  { id: 'halloween', name: 'Halloween', kind: 'party', note: 'Costume parties the weekend before', applies: () => true, dates: one(y => ymd(y, 10, 31)), postLead: 7, askLead: 30 },
  { id: 'new-years-eve', name: 'New Year’s Eve', localName: 'Silvester', kind: 'party', note: 'Not a silent day — the biggest party night', applies: () => true, dates: one(y => ymd(y, 12, 31)), postLead: 7, askLead: 30 },
]

function build(def: Def, year: number): Occasion {
  const { start, end } = def.dates(year)
  return {
    key: `${def.id}:${year}`,
    id: def.id,
    year,
    name: def.name,
    localName: def.localName ?? null,
    kind: def.kind,
    start,
    end,
    note: def.note,
    post: def.kind === 'silent' ? 'silent' : 'roundup',
    postBy: addDays(start, -def.postLead),
    askBy: def.askLead ? addDays(start, -def.askLead) : null,
    ...(def.silentFrom ? { silentFrom: def.silentFrom } : {}),
  }
}

/** Every occasion of the city that hasn't ended by `today`, until `months` months later, soonest first. */
export function occasionsFor(place: CityPlace, today: string, months = 12): Occasion[] {
  const until = addMonths(today, months)
  const year = Number(today.slice(0, 4))
  const out: Occasion[] = []
  for (const def of DEFS) {
    if (!def.applies(place)) continue
    for (const y of [year, year + 1]) {
      const o = build(def, y)
      if (o.end >= today && o.start < until) out.push(o)
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
}

/** One occasion by key, if it applies to the city. */
export function occasionByKey(place: CityPlace, key: string): Occasion | null {
  const [id, y] = key.split(':')
  const def = DEFS.find(d => d.id === id)
  const year = Number(y)
  if (!def || !Number.isInteger(year) || year < 2000 || year > 2100 || !def.applies(place)) return null
  return build(def, year)
}

export function addMonths(day: string, n: number): string {
  const d = new Date(`${day.slice(0, 7)}-01T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

/** The 12 months of the planner, as 'YYYY-MM', starting with `today`'s. */
export function planMonths(today: string, months = 12): string[] {
  return Array.from({ length: months }, (_, i) => addMonths(today, i).slice(0, 7))
}

// ── Labels ──────────────────────────────────────────────────────────────────

const LOCALE: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU', de: 'de-DE' }
/** "Wed 18 Nov" in the language. */
export function dayLabel(day: string, lang: Lang = 'en'): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
}
/** "Wed 18 Nov" or "Thu 25 – Sat 27 Mar". */
export function rangeLabel(o: Pick<Occasion, 'start' | 'end'>, lang: Lang = 'en'): string {
  return o.start === o.end ? dayLabel(o.start, lang) : `${dayLabel(o.start, lang)} – ${dayLabel(o.end, lang)}`
}
export function monthLabel(month: string): string {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short', year: 'numeric' })
}

// ── The post ────────────────────────────────────────────────────────────────

/** Silent days of the same city after (and including) `o`, for "coming up" — at most four. */
export function nextSilentDays(all: Occasion[], from: Occasion): Occasion[] {
  return all.filter(x => x.kind === 'silent' && x.start >= from.start).slice(0, 4)
}

function silentTimes(o: Occasion, lang: Lang): string {
  const all = o.id === 'easter-silent'
  if (all) return { en: 'Thu 02:00–24:00, Fri & Sat all day', es: 'jue 02:00–24:00, vie y sáb todo el día', ru: 'чт 02:00–24:00, пт и сб весь день', de: 'Do 02:00–24:00, Fr & Sa ganztags' }[lang]
  const from = o.silentFrom ?? '02:00'
  return `${from}–24:00`
}

const SILENT: Record<Lang, (v: { name: string; when: string; times: string; next: string; city: string }) => string> = {
  en: v => `🤫 ${v.when}: ${v.name} — a silent day in Bavaria (${v.times}).

What is Tanzverbot? On 9 “silent days” a year, Bavarian law says public events must keep a serious mood. In practice: no public dance parties. Bars can open — the dance floor stays closed.

• Usually 02:00–24:00. Good Friday & Holy Saturday: all day. Christmas Eve: from 14:00.
• The night before is fine until 02:00 (before Good Friday: until midnight).
• Private parties with invited guests are not affected. New Year’s Eve is not a silent day.
• Taking a class? Ask your school.

Coming up: ${v.next}`,
  es: v => `🤫 ${v.when}: ${v.name} — día de silencio en Baviera (${v.times}).

¿Qué es el Tanzverbot? En 9 “días de silencio” al año, la ley de Baviera pide que los eventos públicos mantengan un carácter serio. En la práctica: no hay fiestas de baile públicas. Los bares pueden abrir, pero la pista se queda cerrada.

• Normalmente de 02:00 a 24:00. Viernes y Sábado Santo: todo el día. Nochebuena: desde las 14:00.
• La noche anterior se baila hasta las 02:00 (antes del Viernes Santo: hasta medianoche).
• Las fiestas privadas con invitados no están afectadas. Nochevieja no es día de silencio.
• ¿Tienes clase? Pregunta a tu escuela.

Próximas fechas: ${v.next}`,
  ru: v => `🤫 ${v.when}: ${v.name} — «тихий день» в Баварии (${v.times}).

Что такое Tanzverbot? В 9 «тихих дней» в году закон Баварии требует, чтобы публичные мероприятия сохраняли серьёзный характер. На практике: никаких публичных танцевальных вечеринок. Бары работают, но танцпол закрыт.

• Обычно с 02:00 до 24:00. Страстная пятница и суббота — весь день. Сочельник — с 14:00.
• Накануне танцевать можно до 02:00 (перед Страстной пятницей — до полуночи).
• Частные вечеринки с приглашёнными гостями запрет не касается. Новый год — не «тихий день».
• Идёте на занятие? Уточните в своей школе.

Ближайшие даты: ${v.next}`,
  de: v => `🤫 ${v.when}: ${v.name} — stiller Tag in Bayern (${v.times}).

Was ist das Tanzverbot? An 9 „stillen Tagen“ im Jahr müssen öffentliche Veranstaltungen in Bayern einen ernsten Charakter wahren. Heißt: keine öffentlichen Tanzpartys. Bars dürfen öffnen — die Tanzfläche bleibt zu.

• Meist 02:00–24:00. Karfreitag & Karsamstag: ganztags. Heiligabend: ab 14:00.
• In der Nacht davor darf bis 02:00 getanzt werden (vor Karfreitag: bis Mitternacht).
• Private Feiern mit geladenen Gästen sind nicht betroffen. Silvester ist kein stiller Tag.
• Kurs? Frag deine Tanzschule.

Die nächsten: ${v.next}`,
}

const ROUNDUP: Record<Lang, { title: (name: string, city: string, when: string) => string; none: string; more: string }> = {
  en: { title: (n, c, w) => `✨ ${n} in ${c} · ${w}`, none: 'No parties listed yet — organisers, add yours on WeDance.', more: 'All parties and who’s going' },
  es: { title: (n, c, w) => `✨ ${n} en ${c} · ${w}`, none: 'Aún no hay fiestas — organizadores, añadid la vuestra en WeDance.', more: 'Todas las fiestas y quién va' },
  ru: { title: (n, c, w) => `✨ ${n} в ${c} · ${w}`, none: 'Пока нет вечеринок — организаторы, добавьте свою на WeDance.', more: 'Все вечеринки и кто идёт' },
  de: { title: (n, c, w) => `✨ ${n} in ${c} · ${w}`, none: 'Noch keine Partys — Veranstalter, tragt eure auf WeDance ein.', more: 'Alle Partys und wer hingeht' },
}

/** The text of one language. */
export function occasionText(input: { occasion: Occasion; lang: Lang; cityName: string; upcoming: Occasion[]; events: ScheduleEvent[]; link: string; tz?: string }): string {
  const { occasion: o, lang } = input
  if (o.post === 'silent') {
    const name = lang === 'en' || !o.localName ? o.name : o.localName
    const next = nextSilentDays(input.upcoming, o).map(x => rangeLabel(x, lang)).join(' · ')
    return `${SILENT[lang]({ name, when: rangeLabel(o, lang), times: silentTimes(o, lang), next: next || rangeLabel(o, lang), city: input.cityName })}\n\n${input.link}`
  }
  const t = ROUNDUP[lang]
  const lines = [t.title(lang === 'de' && o.localName ? o.localName : o.name, input.cityName, rangeLabel(o, lang)), '']
  const days = scheduleDays(input.events, input.tz)
  if (!days.length) lines.push(t.none, '')
  for (const d of days) {
    lines.push(dayLabel(d.date, lang).toUpperCase())
    for (const i of d.items) lines.push(`${i.time} ${i.name}${i.where ? ` · ${i.where}` : ''}`)
    lines.push('')
  }
  lines.push(`${t.more}: ${input.link}`)
  return lines.join('\n')
}

/** The post in the chosen languages: the first in full, the others under their flag. */
export function occasionPostText(input: Omit<Parameters<typeof occasionText>[0], 'lang'> & { langs: Lang[] }): string {
  const langs = input.langs.length ? input.langs : (['en'] as Lang[])
  return langs.map((lang, i) => {
    const text = occasionText({ ...input, lang })
    return i === 0 ? text : `${LANGS.find(l => l.id === lang)!.flag}\n${text}`
  }).join('\n\n— — —\n\n')
}

const PICTURE: Record<Lang, { silent: string; upIn: (city: string) => string; none: string; points: string[] }> = {
  en: { silent: 'Silent day in Bavaria', upIn: c => `Coming up in ${c}`, none: 'No parties listed yet.', points: ['No public dance parties — bars open, dance floor closed.', 'The night before: dance until 02:00.', 'Private parties are not affected.'] },
  es: { silent: 'Día de silencio en Baviera', upIn: c => `Próximamente en ${c}`, none: 'Aún no hay fiestas.', points: ['No hay fiestas de baile públicas — la pista se queda cerrada.', 'La noche anterior: hasta las 02:00.', 'Las fiestas privadas no están afectadas.'] },
  ru: { silent: 'Тихий день в Баварии', upIn: c => `Скоро в ${c}`, none: 'Пока нет вечеринок.', points: ['Никаких публичных танцевальных вечеринок — танцпол закрыт.', 'Накануне — танцуем до 02:00.', 'Частные вечеринки запрет не касается.'] },
  de: { silent: 'Stiller Tag in Bayern', upIn: c => `Demnächst in ${c}`, none: 'Noch keine Partys.', points: ['Keine öffentlichen Tanzpartys — die Tanzfläche bleibt zu.', 'In der Nacht davor: bis 02:00.', 'Private Feiern sind nicht betroffen.'] },
}

/** What the picture says, in the post's first language. */
export function occasionPicture(o: Occasion, lang: Lang, cityName: string): { eyebrow: string; title: string; subtitle: string; lines: string[] | null; empty: string; dark: boolean } {
  const t = PICTURE[lang]
  if (o.post === 'silent') {
    return { eyebrow: t.silent, title: 'Tanzverbot', subtitle: `${rangeLabel(o, lang)} · ${silentTimes(o, lang)}`, lines: t.points, empty: t.none, dark: true }
  }
  return { eyebrow: t.upIn(cityName), title: lang === 'de' && o.localName ? o.localName : o.name, subtitle: rangeLabel(o, lang), lines: null, empty: t.none, dark: false }
}
