/**
 * Share my weekend (#527): the 1080×1920 Instagram story, drawn in the browser
 * on a canvas (the page's own web fonts, no server rendering). The cover of the
 * first party fills the top; the parties are listed below; the bottom stays
 * clear for the link sticker, with the link written out in case it's missing.
 */
import { WD } from '~/lib/brand'
import { sizedImage, IMG } from '#shared/utils/image'
import { eventLocalTime } from '#shared/utils/eventTime'

export type StoryParty = {
  name: string
  startDate: string
  timezone: string | null
  venueName: string
  styles: string[]
  cover: string
}

export type StoryInput = {
  sharerName: string
  parties: StoryParty[]
  /** The link, shown small under the sticker space ("2026.wedance.vip/w/abc2345"). */
  link: string
}

const W = 1080
const H = 1920
const SERIF = '"Playfair Display", Georgia, serif'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** Fetch an image as a bitmap without tainting the canvas; null when CORS or the network says no. */
async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    return await createImageBitmap(await res.blob())
  } catch {
    return null
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

/** Wraps `text` to at most `maxLines`, ending with an ellipsis when cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= maxWidth) { line = next; continue }
    if (line) lines.push(line)
    line = w
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line)
  const used = lines.join(' ').split(/\s+/).length
  if (used < words.length && lines.length) {
    let last = lines[lines.length - 1]!
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[lines.length - 1] = `${last.trimEnd()}…`
  }
  return lines.slice(0, maxLines)
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

function dayLabel(iso: string, tz: string | null): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', timeZone: tz || 'Europe/Berlin' }).toUpperCase()
}

export async function drawWeekendStory(input: StoryInput): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await Promise.all([
      document.fonts.load(`900 96px ${SERIF}`),
      document.fonts.load(`italic 700 96px ${SERIF}`),
    ]).catch(() => {})
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background: warm dark brown.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, WD.brown950)
  bg.addColorStop(1, WD.black)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Cover of the first party with a cover, fading into the background.
  const coverH = 640
  const coverUrl = input.parties.find(p => p.cover)?.cover
  const img = coverUrl ? await loadBitmap(sizedImage(coverUrl, IMG.large)!) : null
  if (img) {
    drawCover(ctx, img, 0, 0, W, coverH)
    const fade = ctx.createLinearGradient(0, coverH * 0.35, 0, coverH)
    fade.addColorStop(0, 'rgba(42,31,18,0)')
    fade.addColorStop(1, WD.brown950)
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, coverH)
  } else {
    const glow = ctx.createRadialGradient(W * 0.7, 200, 40, W * 0.7, 200, 900)
    glow.addColorStop(0, WD.red600 + 'aa')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, coverH)
  }

  const pad = 80
  let y = img ? coverH - 110 : 280

  // Eyebrow + headline.
  ctx.fillStyle = WD.amber400
  ctx.font = `700 34px ${SANS}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${input.sharerName.toUpperCase()}’S WEEKEND`, pad, y)
  y += 110
  ctx.fillStyle = WD.cream
  ctx.font = `italic 700 104px ${SERIF}`
  ctx.fillText('Come dance', pad, y)
  y += 112
  ctx.fillText('with me 💃', pad, y)
  y += 80

  // The parties.
  const ctaY = H - 330
  const rowGap = 24
  const chipW = 170
  let drawn = 0
  for (const p of input.parties) {
    const textX = pad + chipW + 32
    const textW = W - textX - pad
    ctx.font = `800 46px ${SANS}`
    const nameLines = wrap(ctx, p.name, textW, 2)
    const rowH = Math.max(170, 40 + nameLines.length * 56 + 52)
    // Leave room for "+ N more" and the call to action.
    if (y + rowH > ctaY - 80) break
    drawn++

    roundRect(ctx, pad - 20, y, W - 2 * (pad - 20), rowH, 32)
    ctx.fillStyle = 'rgba(251,245,234,0.08)'
    ctx.fill()

    // Day + time chip.
    roundRect(ctx, pad, y + 20, chipW, rowH - 40, 24)
    ctx.fillStyle = WD.red600
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.font = `900 44px ${SANS}`
    ctx.fillText(dayLabel(p.startDate, p.timezone), pad + chipW / 2, y + rowH / 2 - 4)
    ctx.font = `600 36px ${SANS}`
    ctx.fillText(eventLocalTime(p.startDate, p.timezone || undefined), pad + chipW / 2, y + rowH / 2 + 42)
    ctx.textAlign = 'left'

    // Name + venue.
    let ty = y + 40 + 44
    ctx.fillStyle = WD.cream
    ctx.font = `800 46px ${SANS}`
    for (const l of nameLines) { ctx.fillText(l, textX, ty); ty += 56 }
    ctx.fillStyle = WD.sand400
    ctx.font = `500 34px ${SANS}`
    const sub = [p.venueName, p.styles[0]].filter(Boolean).join(' · ')
    ctx.fillText(wrap(ctx, sub, textW, 1)[0] ?? '', textX, ty + 4)

    y += rowH + rowGap
  }
  if (input.parties.length > drawn) {
    ctx.fillStyle = WD.sand400
    ctx.font = `600 36px ${SANS}`
    ctx.fillText(`+ ${input.parties.length - drawn} more on the link`, pad, y + 30)
  }

  // Bottom: the call to action, then room for the link sticker.
  ctx.textAlign = 'center'
  ctx.fillStyle = WD.cream
  ctx.font = `italic 700 62px ${SERIF}`
  ctx.fillText('Coming? Tap the link 👇', W / 2, ctaY)
  // ctaY + 40 … H - 140 stays empty: that's where the link sticker goes.
  ctx.fillStyle = WD.sand400
  ctx.font = `600 32px ${SANS}`
  ctx.fillText(input.link.replace(/^https?:\/\//, ''), W / 2, H - 80)
  ctx.textAlign = 'left'

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'))
}
