/**
 * Share my weekend (#527): the 1080×1920 Instagram story, drawn in the browser
 * on a canvas with the page's own web fonts. No photos — organisers' flyers are
 * busy with text and ads — so the story is type-led: a warm dark background lit
 * in the first party's dance colour, the sharer's line in handwriting, and each
 * party as a card with its own colour.
 *
 * Instagram covers the top ~220px (profile bar) and the bottom ~240px (reply
 * bar): nothing important goes there. The space under "Tap the link" is left
 * empty for the link sticker.
 */
import { WD } from '~/lib/brand'
import { eventLocalTime } from '#shared/utils/eventTime'
import { partyAccent, partyStyleLabel } from '#shared/utils/storyLines'

export type StoryParty = {
  name: string
  startDate: string
  timezone: string | null
  venueName: string
  styles: string[]
}

export type StoryInput = {
  sharerName: string
  /** The line under the headline (a suggested one, or the sharer's own). */
  line: string
  parties: StoryParty[]
  /** The link, written small above the sticker space ("2026.wedance.vip/w/abc2345"). */
  link: string
}

const W = 1080
const H = 1920
const SAFE_TOP = 230
/** Lowest y anything is drawn at: below it sits Instagram's reply bar. */
const SAFE_BOTTOM = H - 250
const PAD = 84
const SERIF = '"Playfair Display", Georgia, serif'
const HAND = '"Caveat", "Segoe Print", cursive'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

const INK = '#170d06'
const CREAM = WD.cream
const MUTED = 'rgba(251,245,234,0.62)'

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  g.addColorStop(0, color + a)
  g.addColorStop(1, color + '00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/** Fine film grain, so the gradients don't band on phones. Seeded: the same story twice looks the same. */
function grain(ctx: CanvasRenderingContext2D) {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)'
    ctx.fillRect(rnd() * W, rnd() * H, 2, 2)
  }
}

function weekday(iso: string, tz: string | null, style: 'short' | 'long') {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: style, timeZone: tz || 'Europe/Berlin' })
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // Chrome / Safari 17+; elsewhere the text is just a little tighter.
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${px}px`
}

export async function drawWeekendStory(input: StoryInput): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await Promise.all([
      document.fonts.load(`italic 700 120px ${SERIF}`),
      document.fonts.load(`900 120px ${SERIF}`),
      document.fonts.load(`700 64px ${HAND}`),
    ]).catch(() => {})
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const accent = (input.parties[0] && partyAccent(input.parties[0])) || WD.red600

  // --- Background: warm near-black, lit in the first party's colour --------
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  glow(ctx, W * 0.92, 260, 900, accent, 0.55)
  glow(ctx, W * 0.05, H * 0.72, 800, WD.amber600, 0.22)
  glow(ctx, W * 0.6, H + 100, 700, accent, 0.25)

  // A giant outlined weekday behind everything, tilted.
  const bigDay = input.parties[0] ? weekday(input.parties[0].startDate, input.parties[0].timezone, 'long').toUpperCase() : 'WEEKEND'
  ctx.save()
  ctx.translate(W / 2, 760)
  ctx.rotate(-0.12)
  ctx.font = `italic 900 260px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.strokeStyle = 'rgba(251,245,234,0.07)'
  ctx.lineWidth = 3
  ctx.strokeText(bigDay, 0, 0)
  ctx.restore()
  grain(ctx)

  // --- Header: who + the WeDance mark --------------------------------------
  let y = SAFE_TOP + 40
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = WD.amber400
  ctx.font = `800 30px ${SANS}`
  setSpacing(ctx, 7)
  ctx.fillText(`${input.sharerName.toUpperCase()}’S WEEKEND`, PAD, y)
  setSpacing(ctx, 0)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font = `700 32px ${SERIF}`
  ctx.fillText('WeDance', W - PAD, y)
  ctx.textAlign = 'left'

  // --- Headline -------------------------------------------------------------
  y += 150
  ctx.fillStyle = CREAM
  ctx.font = `italic 700 136px ${SERIF}`
  ctx.fillText('Come dance', PAD - 6, y)
  y += 140
  ctx.fillStyle = accent
  ctx.fillText('with me.', PAD - 6, y)

  // --- The line, handwritten, slightly tilted -------------------------------
  if (input.line) {
    y += 40
    ctx.save()
    ctx.font = `700 66px ${HAND}`
    const lines = wrap(ctx, input.line, W - 2 * PAD - 20, 2)
    ctx.translate(PAD + 4, y)
    ctx.rotate(-0.025)
    ctx.fillStyle = WD.amber400
    lines.forEach((l, i) => ctx.fillText(l, 0, 66 + i * 70))
    ctx.restore()
    y += 66 + (lines.length - 1) * 70
  }

  // --- The parties ------------------------------------------------------------
  const ctaY = SAFE_BOTTOM - 260
  y += 54
  const cardX = PAD - 20
  const cardW = W - 2 * cardX
  const dayW = 196
  let drawn = 0
  for (const p of input.parties) {
    const color = partyAccent(p) || accent
    const textX = cardX + dayW + 34
    const textW = cardX + cardW - textX - 36
    ctx.font = `800 44px ${SANS}`
    const nameLines = wrap(ctx, p.name, textW, 2)
    const rowH = 58 + nameLines.length * 52 + 44
    if (y + rowH > ctaY - 40) break
    drawn++

    // Card + the party's colour as a bar.
    roundRect(ctx, cardX, y, cardW, rowH, 34)
    ctx.fillStyle = 'rgba(251,245,234,0.075)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(251,245,234,0.12)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.save()
    roundRect(ctx, cardX, y, cardW, rowH, 34)
    ctx.clip()
    ctx.fillStyle = color
    ctx.fillRect(cardX, y, 12, rowH)
    ctx.restore()

    // Day + time.
    ctx.textAlign = 'center'
    ctx.fillStyle = CREAM
    ctx.font = `900 54px ${SERIF}`
    ctx.fillText(weekday(p.startDate, p.timezone, 'short'), cardX + 12 + dayW / 2, y + rowH / 2 + 2)
    ctx.fillStyle = MUTED
    ctx.font = `700 34px ${SANS}`
    ctx.fillText(eventLocalTime(p.startDate, p.timezone || undefined), cardX + 12 + dayW / 2, y + rowH / 2 + 48)
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(251,245,234,0.14)'
    ctx.fillRect(cardX + dayW + 12, y + 30, 2, rowH - 60)

    // Name, then venue · style (the style in the party's colour).
    let ty = y + 60
    ctx.fillStyle = CREAM
    ctx.font = `800 44px ${SANS}`
    for (const l of nameLines) { ctx.fillText(l, textX, ty); ty += 52 }
    ctx.font = `600 32px ${SANS}`
    const style = partyStyleLabel(p)
    const styleW = style ? ctx.measureText(`  ·  ${style}`).width : 0
    const venue = wrap(ctx, p.venueName || '', textW - styleW, 1)[0] ?? ''
    ctx.fillStyle = MUTED
    ctx.fillText(venue, textX, ty + 4)
    if (style) {
      const vx = textX + ctx.measureText(venue).width
      ctx.fillText('  ·  ', vx, ty + 4)
      ctx.fillStyle = color
      ctx.fillText(style, vx + ctx.measureText('  ·  ').width, ty + 4)
    }

    y += rowH + 18
  }
  if (input.parties.length > drawn) {
    ctx.fillStyle = MUTED
    ctx.font = `600 34px ${SANS}`
    ctx.fillText(`+ ${input.parties.length - drawn} more on the link`, PAD, y + 34)
  }

  // --- Call to action; under it, empty space for the link sticker ------------
  ctx.textAlign = 'center'
  ctx.fillStyle = CREAM
  ctx.font = `italic 700 66px ${SERIF}`
  ctx.fillText('Coming? Tap the link', W / 2, ctaY)
  ctx.fillStyle = MUTED
  ctx.font = `600 30px ${SANS}`
  ctx.fillText(input.link.replace(/^https?:\/\//, ''), W / 2, ctaY + 52)
  // A small arrow pointing at where the sticker goes.
  ctx.strokeStyle = accent
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(W / 2, ctaY + 84)
  ctx.lineTo(W / 2, ctaY + 124)
  ctx.moveTo(W / 2 - 16, ctaY + 108)
  ctx.lineTo(W / 2, ctaY + 124)
  ctx.lineTo(W / 2 + 16, ctaY + 108)
  ctx.stroke()
  ctx.textAlign = 'left'

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'))
}
