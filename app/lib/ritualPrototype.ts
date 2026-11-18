/**
 * Example night for the color-and-shape ritual prototype (RAZ-1060).
 *
 * Front-end only. These names, the mark and the copy live here so the click-through
 * at `/meet/ritual` can be tapped without seeding the database. Nothing in this
 * file is a real match, a real event or a scannable code.
 */

export const RITUAL_STEPS = [
  'match',
  'scan',
  'optin',
  'here',
  'waiting',
  'reveal',
  'hold',
  'partner',
  'scan-partner',
  'met',
  'done',
] as const

export type RitualStep = (typeof RITUAL_STEPS)[number]

export type RitualLang = 'de' | 'en'

export type RitualShape = 'circle' | 'triangle' | 'square' | 'star' | 'cross'

/** One dancer's signal. The color is a brand token, dark enough for white type. */
export interface RitualMark {
  color: string
  shape: RitualShape
  number: number
  code: string
  /** "orange star 17" / "oranger Stern 17" — the words under the symbol. */
  phrase: Record<RitualLang, string>
}

export const RITUAL = {
  event: 'La Timberia',
  city: { de: 'München', en: 'Munich' } as Record<RitualLang, string>,
  doors: { de: 'Do 21:30', en: 'Thu 21:30' } as Record<RitualLang, string>,
  ritualTime: '23:15',
  you: 'Lena',
  partner: 'Mary',
  matches: ['Mary', 'Jonas', 'Elena'] as const,
  styles: ['Salsa', 'Bachata'] as const,
}

/** Orange star 17, the pair in the storyboard. Short codes differ; the symbol does not. */
export const YOU_MARK: RitualMark = {
  color: 'var(--wd-orange-700)',
  shape: 'star',
  number: 17,
  code: 'B7',
  phrase: { de: 'oranger Stern 17', en: 'orange star 17' },
}

export const PARTNER_MARK: RitualMark = {
  ...YOU_MARK,
  code: 'K4',
}

/** Demo wait. The real night is 23:15; this counts down so the reveal can be reached. */
export const DEMO_COUNTDOWN_SECONDS = 20

/** Decorative 11×11 modules. A tap stands in for the scan — these are not codes. */
export const VENUE_QR = [
  '11111110001',
  '10000010100',
  '10111010111',
  '10111010010',
  '10111010101',
  '10000010001',
  '11111110101',
  '00000000110',
  '11101110101',
  '10010100001',
  '10101011111',
] as const

export const PARTNER_QR = [
  '11111110111',
  '10000010001',
  '10111011101',
  '10111010001',
  '10111010111',
  '10000010100',
  '11111110011',
  '00000000101',
  '10110111001',
  '11001010111',
  '10111100001',
] as const

export function qrCells(rows: readonly string[]): boolean[] {
  return rows.flatMap(row => [...row].map(cell => cell === '1'))
}

export function nextStep(step: RitualStep): RitualStep | null {
  const i = RITUAL_STEPS.indexOf(step)
  return RITUAL_STEPS[i + 1] ?? null
}

export function prevStep(step: RitualStep): RitualStep | null {
  const i = RITUAL_STEPS.indexOf(step)
  return i > 0 ? RITUAL_STEPS[i - 1]! : null
}

export function stepNumber(step: RitualStep): number {
  return RITUAL_STEPS.indexOf(step) + 1
}

/** The mark stays hidden until the countdown flips the screen. */
export function showsSymbol(step: RitualStep): boolean {
  return RITUAL_STEPS.indexOf(step) >= RITUAL_STEPS.indexOf('reveal')
}

export function tickCountdown(seconds: number): { seconds: number; reveal: boolean } {
  if (seconds <= 1) return { seconds: 0, reveal: true }
  return { seconds: seconds - 1, reveal: false }
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function nameList(names: readonly string[], lang: RitualLang): string {
  if (names.length <= 1) return names[0] ?? ''
  const last = names[names.length - 1]!
  const rest = names.slice(0, -1).join(', ')
  return lang === 'de' ? `${rest} und ${last}` : `${rest} and ${last}`
}

export interface JoinChecks {
  adult: boolean
  leave: boolean
  stay: boolean
}

/** 18+ plus the two things the entry screen asks you to accept. */
export function canJoin(checks: JoinChecks): boolean {
  return checks.adult && checks.leave && checks.stay
}

export function joinHint(checks: JoinChecks, lang: RitualLang): string | null {
  if (canJoin(checks)) return null
  if (!checks.adult) {
    return lang === 'de'
      ? 'Bestätige, dass du 18 oder älter bist.'
      : 'Confirm you’re 18 or older.'
  }
  return lang === 'de'
    ? 'Setz die übrigen Haken, dann kannst du dabei sein.'
    : 'Tick the remaining boxes to join.'
}

export interface RitualCopy {
  prototype: string
  language: string
  back: string
  toMeet: string
  example: string
  seeYou: string
  matchTitle: string
  matchBody: string
  matchReason: string
  alsoGoing: string
  scanTitle: string
  scanBody: string
  poster: string
  tapScan: string
  scanned: string
  optinTitle: string
  whatHappens: string
  whatLines: readonly string[]
  adult: string
  leaveAny: string
  keepOpen: string
  join: string
  leaveNow: string
  hereTitle: string
  hereTime: string
  hereHidden: string
  toWait: string
  waitingTitle: string
  waitingAt: string
  waitingHint: string
  skip: string
  revealTitle: string
  revealWalk: string
  looking: string
  toHold: string
  holdTitle: string
  holdBody: string
  spotted: string
  partnerTitle: string
  yourPhone: string
  theirPhone: string
  sameSymbol: string
  toScanPartner: string
  scanPartnerTitle: string
  metTitle: string
  metNames: string
  icebreaker: string
  follow: string
  following: string
  dance: string
  doneTitle: string
  doneBody: string
  tomorrow: string
  dancedCard: string
  backToMeet: string
  again: string
}

export function ritualCopy(lang: RitualLang): RitualCopy {
  const { event, partner, you, ritualTime } = RITUAL
  const names = nameList(RITUAL.matches, lang)
  const phrase = YOU_MARK.phrase[lang]
  if (lang === 'en') {
    return {
      prototype: 'Prototype',
      language: 'Language',
      back: 'Back',
      toMeet: 'Back to Meet',
      example: 'Example — nothing is saved.',
      seeYou: `See you at ${event}`,
      matchTitle: 'It’s a match',
      matchBody: `${partner} said yes to you too. You’ll both be at ${event} tonight.`,
      matchReason: 'You both dance Salsa — and you’re both out tonight.',
      alsoGoing: `Also going · ${RITUAL.doors.en}`,
      scanTitle: 'Scan the venue QR',
      scanBody: 'The code is at the DJ booth or the bar. Tap it — in this prototype a tap stands in for the scan.',
      poster: `WeDance meetup · ${ritualTime}`,
      tapScan: 'Tap to scan',
      scanned: 'Scanned',
      optinTitle: 'Join the meetup',
      whatHappens: 'What happens',
      whatLines: [
        `At ${ritualTime} your phone fills with a color, a shape and a number.`,
        'You walk to the DJ, find the same symbol, and dance one song together.',
        'No name on the phone you hold up. You can leave any time.',
      ],
      adult: 'I’m 18 or older',
      leaveAny: 'I can leave any time',
      keepOpen: 'I’ll keep this page open',
      join: 'Join',
      leaveNow: 'Not now',
      hereTitle: 'Your matches are here tonight',
      hereTime: `The meetup is at ${ritualTime}.`,
      hereHidden: 'No color or shape yet. Those appear when the countdown hits zero.',
      toWait: 'Wait for it',
      waitingTitle: 'Almost time',
      waitingAt: `Meetup at ${ritualTime}`,
      waitingHint: 'Keep this page open. Turn the brightness up.',
      skip: 'Skip to reveal',
      revealTitle: `Find the same ${phrase}.`,
      revealWalk: 'Walk to the DJ.',
      looking: `You’re looking for ${partner}.`,
      toHold: 'Hold your phone up',
      holdTitle: 'Hold your phone up at the DJ',
      holdBody: 'Look for the same symbol in the crowd. Same shape, same number.',
      spotted: 'I see the same symbol',
      partnerTitle: 'The same symbol',
      yourPhone: 'Your phone',
      theirPhone: `${partner}’s phone`,
      sameSymbol: 'Same symbol = your match',
      toScanPartner: 'Scan their screen',
      scanPartnerTitle: `Scan ${partner}’s screen`,
      metTitle: `You met ${partner}!`,
      metNames: `${partner} and ${you}`,
      icebreaker: 'Which song should we dance?',
      follow: 'Follow',
      following: `Following ${partner}`,
      dance: 'Dance this song together',
      doneTitle: 'Back on the floor',
      doneBody: `Tomorrow your Meet deck has an “I danced with ${partner}” card.`,
      tomorrow: 'Tomorrow',
      dancedCard: `I danced with ${partner}`,
      backToMeet: 'Back to the Meet deck',
      again: 'Play it again',
    }
  }
  return {
    prototype: 'Prototyp',
    language: 'Sprache',
    back: 'Zurück',
    toMeet: 'Zum Meet',
    example: 'Beispiel — nichts wird gespeichert.',
    seeYou: `Bis später bei ${event}`,
    matchTitle: 'Es ist ein Match',
    matchBody: `${partner} hat auch Ja gesagt. Ihr seid beide heute Abend bei ${event}.`,
    matchReason: 'Ihr tanzt beide Salsa — und seid heute Abend da.',
    alsoGoing: `Auch da · ${RITUAL.doors.de}`,
    scanTitle: 'QR am DJ scannen',
    scanBody: 'Der Code hängt am DJ oder an der Bar. Tippe darauf — im Prototyp steht der Tipp für den Scan.',
    poster: `WeDance-Treffen · ${ritualTime}`,
    tapScan: 'Tippen zum Scannen',
    scanned: 'Gescannt',
    optinTitle: 'Mitmachen',
    whatHappens: 'Was passiert',
    whatLines: [
      `Um ${ritualTime} füllt eine Farbe, eine Form und eine Zahl dein Display.`,
      'Ihr geht zum DJ, sucht dasselbe Zeichen und tanzt einen Song zusammen.',
      'Auf dem hochgehaltenen Handy steht kein Name. Du kannst jederzeit gehen.',
    ],
    adult: 'Ich bin 18 oder älter',
    leaveAny: 'Ich kann jederzeit gehen',
    keepOpen: 'Ich lasse diese Seite offen',
    join: 'Dabei sein',
    leaveNow: 'Doch nicht',
    hereTitle: 'Deine Matches sind heute Abend da',
    hereTime: `Das Treffen ist um ${ritualTime}.`,
    hereHidden: 'Noch keine Farbe und keine Form. Die kommen, wenn der Countdown bei null ist.',
    toWait: 'Weiter zum Warten',
    waitingTitle: 'Gleich geht’s los',
    waitingAt: `Treffen um ${ritualTime}`,
    waitingHint: 'Lass die Seite offen und dreh die Helligkeit hoch.',
    skip: 'Zur Enthüllung springen',
    revealTitle: `Gleicher ${phrase}.`,
    revealWalk: 'Geh zum DJ.',
    looking: `Du suchst ${partner}.`,
    toHold: 'Handy hochhalten',
    holdTitle: 'Halt dein Handy zum DJ hoch',
    holdBody: 'Such dasselbe Zeichen in der Menge. Gleiche Form, gleiche Zahl.',
    spotted: 'Ich sehe dasselbe Zeichen',
    partnerTitle: 'Dasselbe Zeichen',
    yourPhone: 'Dein Handy',
    theirPhone: `${partner}s Handy`,
    sameSymbol: 'Gleiches Zeichen = euer Paar',
    toScanPartner: 'Bildschirm scannen',
    scanPartnerTitle: `${partner}s Bildschirm scannen`,
    metTitle: `Du hast ${partner} getroffen!`,
    metNames: `${partner} und ${you}`,
    icebreaker: 'Welchen Song tanzen wir?',
    follow: 'Folgen',
    following: `Du folgst ${partner}`,
    dance: 'Tanzt diesen Song zusammen',
    doneTitle: 'Zurück auf der Fläche',
    doneBody: `Morgen liegt auf deinem Meet-Stapel die Karte „Ich habe mit ${partner} getanzt“.`,
    tomorrow: 'Morgen',
    dancedCard: `Ich habe mit ${partner} getanzt`,
    backToMeet: 'Zurück zum Meet-Stapel',
    again: 'Nochmal von vorn',
  }
}
