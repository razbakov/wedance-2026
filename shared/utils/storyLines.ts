/**
 * Share my weekend (#527): the short line under the story's headline. Our own
 * words, matched to the dance family of the first party — never quotes from
 * someone else. The sharer can shuffle them or write their own.
 */
import { detectDanceStyle, displayDanceStyle, findDanceStyle, danceFamily, type DanceFamilyId } from '../dance-styles'

const LINES: Partial<Record<DanceFamilyId, string[]>> = {
  cuban: [
    'Dale, the timba won’t wait.',
    'Rueda at midnight. Don’t be late.',
    'Casino rules: dance first, talk later.',
    'Cuban Saturday. No excuses.',
    'Bring your guapea, I’ll bring mine.',
  ],
  salsa: [
    'One more song. Then one more.',
    'Salsa tonight, sleep tomorrow.',
    'The floor is calling. I’m answering.',
    'Bring the shoes, I’ll bring the shines.',
  ],
  bachata: [
    'Close embrace, open weekend.',
    'Bachata till the lights come on.',
    'Slow songs, fast hearts.',
    'One more bachata. Always one more.',
  ],
  kizomba: [
    'Slow down. Feel the floor.',
    'Kizomba is a conversation. Come talk.',
    'Fewer steps, more feeling.',
    'Low lights, slow beats, good people.',
  ],
  brazilian: [
    'Zouk flow, all night.',
    'Let the hair flicks begin.',
    'Forró, sweat, repeat.',
  ],
  tango: [
    'One tanda with me?',
    'Milonga night. Bring your best embrace.',
    'A look across the room is all it takes.',
  ],
  swing: [
    'Swing out, show up.',
    'Big band, bigger smiles.',
    'Lindy hop till we drop.',
  ],
}

const ANY = [
  'Shoes in the bag. See you on the floor.',
  'Plans? Dancing. Obviously.',
  'Come for one song, stay till the end.',
  'The best part of the week starts here.',
  'Weekend mode: dancing.',
]

/** Most characters a line may have: two lines on the story. */
export const STORY_LINE_MAX = 70

type Party = { name: string; styles: readonly string[] }

/** The party's dance family: its name first ("Salsa Cubana Party" is cuban even when tagged "Salsa"), then its styles. */
export function partyFamily(p: Party): DanceFamilyId | null {
  const byName = detectDanceStyle(p.name)
  if (byName) return byName.family
  for (const s of p.styles) {
    const st = findDanceStyle(s)
    if (st) return st.family
  }
  return null
}

/** The style to print on the card: the one its name says ("Salsa Cubana Party" → Casino), else its first tag. */
export function partyStyleLabel(p: Party): string {
  const byName = detectDanceStyle(p.name)
  if (byName) return byName.display
  return p.styles[0] ? displayDanceStyle(p.styles[0]) : ''
}

/** The party's colour (its family's brand accent), or null when the style is unknown. */
export function partyAccent(p: Party): string | null {
  const f = partyFamily(p)
  return f && f !== 'topics' ? danceFamily(f).accent : null
}

/** The lines for the first party's family, else the any-style ones. */
export function storyLines(parties: readonly Party[]): string[] {
  const f = parties[0] ? partyFamily(parties[0]) : null
  return (f && LINES[f]) || ANY
}

/** A line, different from `current` when there is another. */
export function pickStoryLine(parties: readonly Party[], current = '', random: () => number = Math.random): string {
  const lines = storyLines(parties)
  const others = lines.filter(l => l !== current)
  const from = others.length ? others : lines
  return from[Math.floor(random() * from.length)]!
}

/** The sharer's own text, cleaned for the canvas: one line of plain text, max STORY_LINE_MAX. */
export function cleanStoryLine(text: string | null | undefined): string {
  return String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, STORY_LINE_MAX)
}
