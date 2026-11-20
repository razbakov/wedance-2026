/**
 * Your year in dance (RAZ-966): one 1080×1920 story picture per screen of the
 * look back (`shared/utils/yearReview.ts`), drawn with the same canvas pieces
 * as the weekend and year stories (`storyCanvas.ts`): a loud colour per screen
 * (the first is the year's dance colour), the dancer's name and the year on
 * the masthead, one big thing in Anton, a line or two under it. What the player
 * on /my-year shows is exactly what gets posted.
 */
import {
  W, H, PAD, POSTER, SANS, INK, CREAM, POSTER_BG, DEFAULT_BG, SAFE_TOP, SAFE_BOTTOM,
  familyColor, wrap, fitSize, storyCanvas, masthead, toPng,
} from '~/lib/storyCanvas'
import { WD } from '~/lib/brand'
import type { DanceFamilyId } from '#shared/dance-styles'
import type { YearReview, YearReviewScreen } from '#shared/utils/yearReview'

/** Colours the screens walk through after the first (the year's own). */
const ROTATION = [WD.violet600, WD.orange500, WD.cyan600, WD.pink500, WD.amber500, WD.rose600, WD.sky500, WD.red600]

/** Light backgrounds where cream text is too faint: the accent goes black there. */
const LIGHT_BG = new Set<string>([WD.orange500, WD.amber500, WD.sky500, WD.cyan600, WD.pink500])

/** The second colour on a screen: cream on a dark background, black on a light one. */
function accentOn(bg: string): string {
  return LIGHT_BG.has(bg) ? INK : CREAM
}

export function screenColor(review: Pick<YearReview, 'family'>, index: number): string {
  const first = (review.family && POSTER_BG[review.family]) || DEFAULT_BG
  if (index === 0) return first
  const rest = ROTATION.filter(c => c !== first)
  return rest[(index - 1) % rest.length]!
}

/** Where a screen's content starts, before centring. */
const TOP = SAFE_TOP + 110

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many
}

/** Small bold caps line. Returns the y below it. */
function kicker(ctx: CanvasRenderingContext2D, text: string, y: number, color: string = INK): number {
  ctx.fillStyle = color
  ctx.font = `900 38px ${SANS}`
  for (const l of wrap(ctx, text.toUpperCase(), W - 2 * PAD, 2)) {
    y += 48
    ctx.fillText(l, PAD, y)
  }
  return y
}

/** One huge line in Anton, as big as fits (≤ max). Returns the y below it. */
function huge(ctx: CanvasRenderingContext2D, text: string, y: number, max: number, color: string = INK): number {
  const size = fitSize(ctx, text, POSTER, W - 2 * PAD, max)
  y += size * 0.95
  ctx.fillStyle = color
  ctx.font = `${size}px ${POSTER}`
  ctx.fillText(text, PAD - 6, y)
  return y
}

/** A few words in Anton over up to `lines` lines. Returns the y below. */
function headline(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, lines: number, color: string = INK): number {
  ctx.font = `${size}px ${POSTER}`
  ctx.fillStyle = color
  for (const l of wrap(ctx, text.toUpperCase(), W - 2 * PAD, lines)) {
    y += size * 0.98
    ctx.fillText(l, PAD - 4, y)
  }
  return y
}

/** Body text in bold sans. Returns the y below. */
function body(ctx: CanvasRenderingContext2D, text: string, y: number, color: string = INK, lines = 3): number {
  ctx.fillStyle = color
  ctx.font = `800 44px ${SANS}`
  for (const l of wrap(ctx, text, W - 2 * PAD, lines)) {
    y += 58
    ctx.fillText(l, PAD, y)
  }
  return y
}

/** The foot of every picture: "wedance.vip" and the page number. */
function foot(ctx: CanvasRenderingContext2D, index: number, total: number) {
  const y = SAFE_BOTTOM - 10
  ctx.fillStyle = INK
  ctx.fillRect(PAD, y - 58, W - 2 * PAD, 6)
  ctx.font = `900 30px ${SANS}`
  ctx.textAlign = 'left'
  ctx.fillText('WEDANCE.VIP', PAD, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${index + 1} / ${total}`, W - PAD, y)
  ctx.textAlign = 'left'
}

function drawMonths(ctx: CanvasRenderingContext2D, months: number[], y: number, accent: string) {
  const max = Math.max(1, ...months)
  const barW = (W - 2 * PAD) / 12
  const h = 300
  for (let i = 0; i < 12; i++) {
    const n = months[i] ?? 0
    const bh = n ? Math.max(18, Math.round((n / max) * h)) : 6
    const x = PAD + i * barW
    ctx.fillStyle = n === max && n > 0 ? CREAM : INK
    ctx.fillRect(x + 6, y + h - bh, barW - 12, bh)
    ctx.fillStyle = INK
    ctx.font = `900 28px ${SANS}`
    ctx.textAlign = 'center'
    ctx.fillText(MONTH_LETTERS[i]!, x + barW / 2, y + h + 44)
    if (n) {
      ctx.fillStyle = n === max ? INK : accent
      ctx.font = `30px ${POSTER}`
      ctx.fillText(String(n), x + barW / 2, y + h - bh - 12)
    }
  }
  ctx.textAlign = 'left'
}

/** Draws a screen's content from `TOP` down. Returns the y it ended at. */
function drawScreen(ctx: CanvasRenderingContext2D, s: YearReviewScreen, review: YearReview, bg: string): number {
  const ACCENT = accentOn(bg)
  let y = TOP
  switch (s.kind) {
    case 'intro': {
      y = kicker(ctx, 'Your year in dance', y)
      y = huge(ctx, String(review.year), y + 10, 420)
      y = headline(ctx, 'What a year on the floor.', y + 40, 104, 3, ACCENT)
      y = body(ctx, `${s.nights} ${plural(s.nights, 'night', 'nights')} you were going to. Here’s how it went.`, y + 30)
      break
    }
    case 'nights': {
      y = kicker(ctx, 'Nights out', y)
      y = huge(ctx, String(s.nights), y + 10, 460)
      y = headline(ctx, plural(s.nights, 'night you were going to', 'nights you were going to'), y + 20, 84, 2, ACCENT)
      drawMonths(ctx, s.months, y + 70, bg)
      y += 70 + 300 + 50
      break
    }
    case 'style': {
      y = kicker(ctx, 'Your style of the year', y)
      y = headline(ctx, s.style, y + 20, 220, 2)
      y = huge(ctx, `${s.share}%`, y + 30, 260, ACCENT)
      y = body(ctx, 'of your nights.', y + 10)
      if (s.others.length) y = body(ctx, `Also on the menu: ${s.others.join(', ')}.`, y + 40)
      break
    }
    case 'month': {
      y = kicker(ctx, 'Your busiest month', y)
      y = headline(ctx, s.month, y + 20, 230, 2)
      y = headline(ctx, 'was on fire', y + 10, 120, 1, ACCENT)
      y = huge(ctx, String(s.nights), y + 60, 300)
      y = body(ctx, `nights in one month.`, y + 10)
      break
    }
    case 'floor': {
      y = kicker(ctx, 'Your home floor', y)
      y = headline(ctx, s.venue, y + 20, 160, 3)
      if (s.city) y = body(ctx, s.city, y + 10, ACCENT)
      y = huge(ctx, `${s.nights}×`, y + 60, 300, ACCENT)
      y = body(ctx, 'you were going to be there.', y + 10)
      break
    }
    case 'festivals': {
      y = kicker(ctx, 'Festivals', y)
      y = huge(ctx, String(s.festivals.length), y + 10, 300)
      y = headline(ctx, plural(s.festivals.length, 'festival', 'festivals'), y + 10, 110, 1, ACCENT)
      y += 40
      const rowH = 100
      const room = SAFE_BOTTOM - 110 - y
      const fit = Math.max(1, Math.floor((room + 10) / (rowH + 10)))
      const shown = s.festivals.slice(0, s.festivals.length > fit ? fit - 1 : fit)
      for (const f of shown) {
        ctx.fillStyle = INK
        ctx.fillRect(0, y, W, rowH)
        ctx.fillStyle = familyColor(f.family as DanceFamilyId | null)
        ctx.font = `58px ${POSTER}`
        ctx.fillText(f.month, PAD, y + 72)
        ctx.fillStyle = CREAM
        ctx.font = `46px ${POSTER}`
        ctx.fillText(wrap(ctx, f.name.toUpperCase(), W - PAD - 240 - 40, 1)[0] ?? '', PAD + 170, y + 52)
        ctx.font = `700 28px ${SANS}`
        ctx.fillStyle = 'rgba(251,245,234,0.7)'
        ctx.fillText(wrap(ctx, f.place, W - PAD - 240 - 40, 1)[0] ?? '', PAD + 170, y + 86)
        y += rowH + 10
      }
      if (s.festivals.length > shown.length) y = body(ctx, `+ ${s.festivals.length - shown.length} more`, y)
      break
    }
    case 'cities': {
      y = kicker(ctx, 'Where you danced', y)
      y = huge(ctx, String(s.cities.length), y + 10, 360)
      y = headline(ctx, s.countries > 1 ? `cities · ${s.countries} countries` : 'cities', y + 10, 110, 1, ACCENT)
      y += 30
      ctx.font = `64px ${POSTER}`
      for (const c of s.cities.slice(0, 6)) {
        y += 76
        ctx.fillStyle = INK
        ctx.fillText(wrap(ctx, c.toUpperCase(), W - 2 * PAD, 1)[0] ?? '', PAD, y)
        ctx.font = `64px ${POSTER}`
      }
      if (s.cities.length > 6) y = body(ctx, `+ ${s.cities.length - 6} more`, y + 10)
      break
    }
    case 'friends': {
      y = kicker(ctx, 'You didn’t dance alone', y)
      y = huge(ctx, String(s.friends), y + 10, 460)
      y = headline(ctx, plural(s.friends, 'friend said “I’m in”', 'friends said “I’m in”'), y + 20, 100, 2, ACCENT)
      y = body(ctx, 'to a weekend you shared.', y + 20)
      break
    }
    case 'first': {
      y = kicker(ctx, 'Where it all started', y)
      y = headline(ctx, s.date, y + 20, 200, 2, ACCENT)
      y = headline(ctx, s.name, y + 50, 110, 4)
      break
    }
    case 'next': {
      y = kicker(ctx, 'Celebrate. Then plan.', y)
      y = huge(ctx, String(s.year), y + 10, 420, ACCENT)
      y = headline(ctx, 'Let’s plan it.', y + 30, 150, 2)
      y = body(ctx, s.planned
        ? `${s.planned} ${plural(s.planned, 'festival', 'festivals')} already in the plan. See you on the floor.`
        : 'Which festivals, which nights, who with? See you on the floor.', y + 30)
      break
    }
  }
  return y
}

/** The picture for screen `index` of `review`. */
export async function drawYearReviewScreen(review: YearReview, index: number): Promise<Blob> {
  const s = review.screens[index]!
  const bg = screenColor(review, index)
  const { canvas, ctx } = await storyCanvas(bg)
  const who = review.name ? `${review.name.toUpperCase()}’S ${review.year}` : `MY ${review.year}`
  masthead(ctx, who)
  // Draw the content on its own layer, then centre it between masthead and foot.
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const lctx = layer.getContext('2d')!
  lctx.textBaseline = 'alphabetic'
  const end = drawScreen(lctx, s, review, bg)
  const room = (SAFE_BOTTOM - 90) - end
  ctx.drawImage(layer, 0, Math.max(0, Math.round(room / 2)))
  foot(ctx, index, review.screens.length)
  return await toPng(canvas)
}
