/**
 * My dance year (RAZ-897): the 1080×1920 Instagram story of a dancer's
 * festival year, drawn in the browser like the weekend story (#527, same
 * canvas pieces from `storyCanvas.ts`): the year's main dance colour as the
 * background, "MY 2026 / DANCE YEAR" in Anton, the sharer's line on a tilted
 * cream label, the four big numbers on a black band, then each festival —
 * its month big in its own dance colour — and "Join me? Tap the link", with
 * room under it for the link sticker that opens their year page.
 */
import {
  W, PAD, POSTER, SANS, INK, CREAM, POSTER_BG, DEFAULT_BG, SAFE_BOTTOM,
  familyColor, wrap, fitSize, storyCanvas, masthead, lineLabel, callToAction, toPng,
} from '~/lib/storyCanvas'
import {
  festivalDayRange, festivalFamily, festivalMonth, festivalPlace, yearFamily,
  yearStoryFestivals, yearStoryStats, type YearStoryFestival,
} from '#shared/utils/yearStory'

export type YearStoryInput = {
  sharerName: string
  year: number
  /** The line on the label (a suggested one, or the sharer's own). */
  line: string
  festivals: YearStoryFestival[]
  /** The link, written small under the call to action. */
  link: string
}

export async function drawYearStory(input: YearStoryInput): Promise<Blob> {
  const fests = yearStoryFestivals(input.festivals)
  const fam = yearFamily(fests)
  const bg = (fam && POSTER_BG[fam]) || DEFAULT_BG
  const { canvas, ctx } = await storyCanvas(bg)

  // --- Header -------------------------------------------------------------------
  const who = input.sharerName.trim() ? `${input.sharerName.trim().toUpperCase()}’S YEAR` : 'MY DANCE YEAR'
  let y = masthead(ctx, who)

  // --- Headline: "MY 2026" / "DANCE YEAR" ----------------------------------------
  const head1 = `MY ${input.year}`
  const head2 = 'DANCE YEAR'
  const s1 = fitSize(ctx, head1, POSTER, W - 2 * PAD, 150)
  y += 30 + s1 * 0.98
  ctx.fillStyle = INK
  ctx.font = `${s1}px ${POSTER}`
  ctx.fillText(head1, PAD - 4, y)
  const s2 = fitSize(ctx, head2, POSTER, W - 2 * PAD, 158)
  y += s2 * 0.92
  ctx.fillStyle = CREAM
  ctx.font = `${s2}px ${POSTER}`
  ctx.fillText(head2, PAD - 4, y)

  // --- The line -----------------------------------------------------------------
  y = lineLabel(ctx, input.line, y)

  // --- The four big numbers, on a black band --------------------------------------
  const stats = yearStoryStats(fests)
  const cells: Array<[number, string]> = [
    [stats.festivals, stats.festivals === 1 ? 'FESTIVAL' : 'FESTIVALS'],
    [stats.danceDays, stats.danceDays === 1 ? 'DANCE DAY' : 'DANCE DAYS'],
    [stats.cities, stats.cities === 1 ? 'CITY' : 'CITIES'],
    [stats.countries, stats.countries === 1 ? 'COUNTRY' : 'COUNTRIES'],
  ]
  y += 30
  const statsH = 150
  ctx.fillStyle = INK
  ctx.fillRect(0, y, W, statsH)
  const cellW = (W - 2 * PAD) / cells.length
  ctx.textAlign = 'center'
  cells.forEach(([n, label], i) => {
    const cx = PAD + cellW * i + cellW / 2
    ctx.fillStyle = CREAM
    ctx.font = `${fitSize(ctx, String(n), POSTER, cellW - 16, 88)}px ${POSTER}`
    ctx.fillText(String(n), cx, y + 92)
    ctx.fillStyle = bg
    ctx.font = `900 24px ${SANS}`
    const lw = ctx.measureText(label).width
    if (lw > cellW - 12) ctx.font = `900 ${Math.floor(24 * (cellW - 12) / lw)}px ${SANS}`
    ctx.fillText(label, cx, y + 128)
  })
  ctx.textAlign = 'left'
  // Thin cream rules between the numbers.
  ctx.fillStyle = 'rgba(251,245,234,0.18)'
  for (let i = 1; i < cells.length; i++) ctx.fillRect(PAD + cellW * i - 1, y + 30, 2, statsH - 60)
  y += statsH + 14

  // --- The festivals: one black row each, the month in the festival's colour -------
  const ctaY = SAFE_BOTTOM - 236
  const rowH = 100
  const monthW = 190
  const textX = PAD + monthW + 20
  const textW = W - textX - 40
  const room = ctaY - 20 - y
  // Leave room for the "+ N more" line when not every festival fits.
  let fit = Math.floor((room + 10) / (rowH + 10))
  if (fit < fests.length) fit = Math.max(0, Math.floor((room - 40 + 10) / (rowH + 10)))
  const shown = fests.slice(0, fit)
  for (const f of shown) {
    const color = familyColor(festivalFamily(f))
    ctx.fillStyle = INK
    ctx.fillRect(0, y, W, rowH)

    ctx.fillStyle = color
    ctx.font = `58px ${POSTER}`
    ctx.fillText(festivalMonth(f), PAD, y + 60)
    ctx.fillStyle = CREAM
    ctx.font = `800 26px ${SANS}`
    ctx.fillText(festivalDayRange(f), PAD + 2, y + 88)

    ctx.fillStyle = CREAM
    ctx.font = `46px ${POSTER}`
    ctx.fillText(wrap(ctx, f.name.toUpperCase(), textW, 1)[0] ?? '', textX, y + 52)
    ctx.font = `700 28px ${SANS}`
    ctx.fillStyle = 'rgba(251,245,234,0.7)'
    ctx.fillText(wrap(ctx, festivalPlace(f), textW, 1)[0] ?? '', textX, y + 86)

    y += rowH + 10
  }
  if (fests.length > shown.length) {
    ctx.fillStyle = INK
    ctx.font = `900 34px ${SANS}`
    ctx.fillText(`+ ${fests.length - shown.length} MORE ON THE LINK`, PAD, y + 36)
  }

  // --- Call to action -------------------------------------------------------------
  callToAction(ctx, 'JOIN ME? TAP THE LINK', input.link, ctaY)

  return await toPng(canvas)
}
