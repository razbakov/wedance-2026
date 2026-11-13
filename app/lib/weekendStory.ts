/**
 * Share my weekend (#527): the 1080×1920 Instagram story, drawn in the browser
 * on a canvas with the page's own web fonts. A bold poster, made to stop the
 * thumb: the first party's dance colour as a solid background, huge condensed
 * type (Anton), the sharer's line on a tilted cream label, and each party as
 * a black band with its day name big in the party's own colour.
 *
 * No photos — organisers' flyers are busy with text and ads. Instagram covers
 * the top ~220px (profile bar) and the bottom ~240px (reply bar): nothing
 * important goes there. The space under the call to action is left empty for
 * the link sticker.
 */
import { WD } from '~/lib/brand'
import { eventLocalTime } from '#shared/utils/eventTime'
import { partyFamily, partyStyleLabel } from '#shared/utils/storyLines'
import type { DanceFamilyId } from '#shared/dance-styles'

export type StoryParty = {
  name: string
  startDate: string
  timezone: string | null
  venueName: string
  styles: string[]
}

export type StoryInput = {
  sharerName: string
  /** The line on the label (a suggested one, or the sharer's own). */
  line: string
  parties: StoryParty[]
  /** The link, written small under the call to action ("2026.wedance.vip/w/abc2345"). */
  link: string
}

const W = 1080
const H = 1920
const SAFE_TOP = 230
/** Lowest y anything is drawn at: below it sits Instagram's reply bar. */
const SAFE_BOTTOM = H - 250
const PAD = 72
const POSTER = '"Anton", Impact, "Arial Narrow", sans-serif'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

const INK = WD.black
const CREAM = WD.cream

/**
 * Poster colours per dance family: loud and bright enough to carry black type.
 * (The family accents in the style list are tuned for chips on cream — Cuban's
 * amber-brown, tango's dark red — too dull for a full background.)
 */
const POSTER_BG: Partial<Record<DanceFamilyId, string>> = {
  salsa: WD.rose600,
  cuban: WD.orange500,
  bachata: WD.violet600,
  kizomba: WD.pink500,
  brazilian: WD.cyan600,
  caribbean: WD.amber500,
  tango: WD.red600,
  swing: WD.sky500,
}
const DEFAULT_BG = WD.red600

/** Where a party's day name is drawn on black: its poster colour, or amber when the style is unknown. */
function partyColor(p: StoryParty): string {
  const f = partyFamily(p)
  return (f && POSTER_BG[f]) || WD.amber400
}

/** Wraps `text` to at most `maxLines`, ending with an ellipsis when cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  let used = 0
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= maxWidth) { line = next; used++; continue }
    if (line) lines.push(line)
    if (lines.length === maxLines) { line = ''; break }
    line = w
    used++
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (used < words.length && lines.length) {
    let last = lines[lines.length - 1]!
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[lines.length - 1] = `${last.trimEnd()}…`
  }
  return lines
}

/** Largest font size (≤ max) at which `text` fits `width` in `family`. */
function fitSize(ctx: CanvasRenderingContext2D, text: string, family: string, width: number, max: number): number {
  let size = max
  ctx.font = `${size}px ${family}`
  while (size > 40 && ctx.measureText(text).width > width) {
    size -= 4
    ctx.font = `${size}px ${family}`
  }
  return size
}

/** Fine grain so the flat colour reads as print, not a screen. Seeded: the same story twice looks the same. */
function grain(ctx: CanvasRenderingContext2D) {
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 12000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(rnd() * W, rnd() * H, 2, 2)
  }
}

function weekday(iso: string, tz: string | null) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', timeZone: tz || 'Europe/Berlin' }).toUpperCase()
}

export async function drawWeekendStory(input: StoryInput): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.load(`120px ${POSTER}`).catch(() => {})
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const first = input.parties[0]
  const bgFamily = first ? partyFamily(first) : null
  const bg = (bgFamily && POSTER_BG[bgFamily]) || DEFAULT_BG

  // --- Solid colour + grain ---------------------------------------------------
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  grain(ctx)
  ctx.textBaseline = 'alphabetic'

  // --- Header: who + the WeDance mark -----------------------------------------
  let y = SAFE_TOP + 30
  ctx.fillStyle = INK
  ctx.font = `900 32px ${SANS}`
  ctx.textAlign = 'left'
  ctx.fillText(`${input.sharerName.toUpperCase()}’S WEEKEND`, PAD, y)
  ctx.textAlign = 'right'
  ctx.font = `36px ${POSTER}`
  ctx.fillText('WEDANCE', W - PAD, y)
  ctx.textAlign = 'left'
  // A thick rule under the header, like a poster masthead.
  ctx.fillRect(PAD, y + 22, W - 2 * PAD, 8)

  // --- Headline: two lines, each as wide as the poster -------------------------
  const head1 = 'COME DANCE'
  const head2 = 'WITH ME'
  const s1 = fitSize(ctx, head1, POSTER, W - 2 * PAD, 196)
  y += 30 + s1 * 0.98
  ctx.fillStyle = INK
  ctx.font = `${s1}px ${POSTER}`
  ctx.fillText(head1, PAD - 4, y)
  const s2 = fitSize(ctx, head2, POSTER, W - 2 * PAD, 208)
  y += s2 * 0.92
  ctx.fillStyle = CREAM
  ctx.font = `${s2}px ${POSTER}`
  ctx.fillText(head2, PAD - 4, y)

  // --- The line, on a tilted cream label --------------------------------------
  if (input.line) {
    ctx.font = `italic 800 42px ${SANS}`
    const lines = wrap(ctx, input.line, W - 2 * PAD - 80, 2)
    const labelW = Math.min(W - 2 * PAD, Math.max(...lines.map(l => ctx.measureText(l).width)) + 64)
    const labelH = 34 + lines.length * 52
    y += 34
    ctx.save()
    ctx.translate(PAD + 6, y)
    ctx.rotate(-0.035)
    ctx.fillStyle = CREAM
    ctx.fillRect(0, 0, labelW, labelH)
    ctx.fillStyle = INK
    lines.forEach((l, i) => ctx.fillText(l, 32, 58 + i * 52))
    ctx.restore()
    y += labelH + 10
  }

  // --- The parties: black bands, day name huge in the party's colour -----------
  const ctaY = SAFE_BOTTOM - 236
  y += 36
  const dayW = 250
  let drawn = 0
  for (const p of input.parties) {
    const color = partyColor(p)
    const textX = PAD + dayW + 28
    const textW = W - textX - 40
    ctx.font = `48px ${POSTER}`
    const left = input.parties.length - drawn
    // Two lines for the name while every party left still fits; else one, with an ellipsis.
    const room = ctaY - 40 - y
    let nameLines = wrap(ctx, p.name.toUpperCase(), textW, 2)
    const bandFor = (n: number) => Math.max(50 + n * 54 + 46, 168)
    if (nameLines.length > 1 && bandFor(2) + (left - 1) * (bandFor(1) + 12) > room) nameLines = wrap(ctx, p.name.toUpperCase(), textW, 1)
    let bandH = bandFor(nameLines.length)
    if (y + bandH > ctaY - 40 && nameLines.length > 1) {
      nameLines = wrap(ctx, p.name.toUpperCase(), textW, 1)
      bandH = bandFor(1)
    }
    if (y + bandH > ctaY - 40) break
    drawn++

    ctx.fillStyle = INK
    ctx.fillRect(0, y, W, bandH)

    // Day + time.
    ctx.fillStyle = color
    ctx.font = `${fitSize(ctx, weekday(p.startDate, p.timezone), POSTER, dayW - 20, 112)}px ${POSTER}`
    ctx.fillText(weekday(p.startDate, p.timezone), PAD, y + bandH / 2 + 22)
    ctx.fillStyle = CREAM
    ctx.font = `800 36px ${SANS}`
    ctx.fillText(eventLocalTime(p.startDate, p.timezone || undefined), PAD + 2, y + bandH / 2 + 66)

    // Name + venue · style.
    let ty = y + (bandH - (nameLines.length * 54 + 46)) / 2 + 52
    ctx.fillStyle = CREAM
    ctx.font = `48px ${POSTER}`
    for (const l of nameLines) { ctx.fillText(l, textX, ty); ty += 54 }
    ctx.font = `700 32px ${SANS}`
    const style = partyStyleLabel(p).toUpperCase()
    const sep = '  ·  '
    const styleW = style ? ctx.measureText(sep + style).width : 0
    const venue = wrap(ctx, p.venueName || '', textW - styleW, 1)[0] ?? ''
    ctx.fillStyle = 'rgba(251,245,234,0.7)'
    ctx.fillText(venue, textX, ty - 4)
    if (style) {
      const vx = textX + ctx.measureText(venue).width
      ctx.fillText(sep, vx, ty - 4)
      ctx.fillStyle = color
      ctx.fillText(style, vx + ctx.measureText(sep).width, ty - 4)
    }

    y += bandH + 12
  }
  if (input.parties.length > drawn) {
    ctx.fillStyle = INK
    ctx.font = `900 34px ${SANS}`
    ctx.fillText(`+ ${input.parties.length - drawn} MORE ON THE LINK`, PAD, y + 40)
  }

  // --- Call to action: a black pill; under it, room for the link sticker --------
  const cta = 'COMING? TAP THE LINK'
  ctx.font = `64px ${POSTER}`
  const ctaW = ctx.measureText(cta).width + 120
  const pillH = 110
  const pillX = (W - ctaW) / 2
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.roundRect(pillX, ctaY, ctaW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.textAlign = 'center'
  ctx.fillText(cta, W / 2, ctaY + 80)
  ctx.fillStyle = INK
  ctx.font = `800 30px ${SANS}`
  ctx.fillText(`${input.link.replace(/^https?:\/\//, '')}  ↓`, W / 2, ctaY + pillH + 52)
  ctx.textAlign = 'left'

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'))
}
