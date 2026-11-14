/**
 * The pieces both Instagram stories are drawn with: "Come dance with me" for a
 * weekend (#527, `weekendStory.ts`) and "My dance year" (RAZ-897, `yearStory.ts`).
 * A 1080×1920 canvas, a loud dance-family colour, Anton for the type.
 *
 * Instagram covers the top ~220px (profile bar) and the bottom ~240px (reply
 * bar): nothing important goes there.
 */
import { WD } from '~/lib/brand'
import type { DanceFamilyId } from '#shared/dance-styles'

export const W = 1080
export const H = 1920
export const SAFE_TOP = 230
/** Lowest y anything is drawn at: below it sits Instagram's reply bar. */
export const SAFE_BOTTOM = H - 250
export const PAD = 72
export const POSTER = '"Anton", Impact, "Arial Narrow", sans-serif'
export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export const INK = WD.black
export const CREAM = WD.cream

/**
 * Poster colours per dance family: loud and bright enough to carry black type.
 * (The family accents in the style list are tuned for chips on cream — Cuban's
 * amber-brown, tango's dark red — too dull for a full background.)
 */
export const POSTER_BG: Partial<Record<DanceFamilyId, string>> = {
  salsa: WD.rose600,
  cuban: WD.orange500,
  bachata: WD.violet600,
  kizomba: WD.pink500,
  brazilian: WD.cyan600,
  caribbean: WD.amber500,
  tango: WD.red600,
  swing: WD.sky500,
}
export const DEFAULT_BG = WD.red600

/** A family's colour on black: its poster colour, or amber when the style is unknown. */
export function familyColor(f: DanceFamilyId | null): string {
  return (f && POSTER_BG[f]) || WD.amber400
}

/** Wraps `text` to at most `maxLines`, ending with an ellipsis when cut. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
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
export function fitSize(ctx: CanvasRenderingContext2D, text: string, family: string, width: number, max: number): number {
  let size = max
  ctx.font = `${size}px ${family}`
  while (size > 40 && ctx.measureText(text).width > width) {
    size -= 4
    ctx.font = `${size}px ${family}`
  }
  return size
}

/** Fine grain so the flat colour reads as print, not a screen. Seeded: the same story twice looks the same. */
export function grain(ctx: CanvasRenderingContext2D) {
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 12000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(rnd() * W, rnd() * H, 2, 2)
  }
}

/** A blank story canvas in `bg`, with grain, once the poster font has loaded. */
export async function storyCanvas(bg: string): Promise<{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.load(`120px ${POSTER}`).catch(() => {})
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  grain(ctx)
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

/** The masthead: who on the left, the WeDance mark on the right, a thick rule under both. Returns its baseline y. */
export function masthead(ctx: CanvasRenderingContext2D, title: string): number {
  const y = SAFE_TOP + 30
  ctx.fillStyle = INK
  ctx.font = `900 32px ${SANS}`
  ctx.textAlign = 'left'
  ctx.fillText(title, PAD, y)
  ctx.textAlign = 'right'
  ctx.font = `36px ${POSTER}`
  ctx.fillText('WEDANCE', W - PAD, y)
  ctx.textAlign = 'left'
  ctx.fillRect(PAD, y + 22, W - 2 * PAD, 8)
  return y
}

/** The sharer's line on a tilted cream label at `y`. Returns the y below it. */
export function lineLabel(ctx: CanvasRenderingContext2D, line: string, y: number): number {
  if (!line) return y
  ctx.font = `italic 800 42px ${SANS}`
  const lines = wrap(ctx, line, W - 2 * PAD - 80, 2)
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
  return y + labelH + 10
}

/** The call to action: a black pill at `y`, the link written small under it (room for the link sticker below). */
export function callToAction(ctx: CanvasRenderingContext2D, text: string, link: string, y: number) {
  ctx.font = `64px ${POSTER}`
  const ctaW = ctx.measureText(text).width + 120
  const pillH = 110
  const pillX = (W - ctaW) / 2
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.roundRect(pillX, y, ctaW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.textAlign = 'center'
  ctx.fillText(text, W / 2, y + 80)
  ctx.fillStyle = INK
  ctx.font = `800 30px ${SANS}`
  ctx.fillText(`${link.replace(/^https?:\/\//, '')}  ↓`, W / 2, y + pillH + 52)
  ctx.textAlign = 'left'
}

export function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'))
}
