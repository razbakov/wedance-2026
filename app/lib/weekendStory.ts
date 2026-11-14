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
import { eventLocalTime } from '#shared/utils/eventTime'
import { partyFamily, partyStyleLabel } from '#shared/utils/storyLines'
import {
  W, PAD, POSTER, SANS, INK, CREAM, POSTER_BG, DEFAULT_BG, SAFE_BOTTOM,
  familyColor, wrap, fitSize, storyCanvas, masthead, lineLabel, callToAction, toPng,
} from '~/lib/storyCanvas'

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

/** Where a party's day name is drawn on black: its poster colour, or amber when the style is unknown. */
function partyColor(p: StoryParty): string {
  return familyColor(partyFamily(p))
}

function weekday(iso: string, tz: string | null) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', timeZone: tz || 'Europe/Berlin' }).toUpperCase()
}

export async function drawWeekendStory(input: StoryInput): Promise<Blob> {
  const first = input.parties[0]
  const bgFamily = first ? partyFamily(first) : null
  const { canvas, ctx } = await storyCanvas((bgFamily && POSTER_BG[bgFamily]) || DEFAULT_BG)

  // --- Header: who + the WeDance mark -----------------------------------------
  let y = masthead(ctx, `${input.sharerName.toUpperCase()}’S WEEKEND`)

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
  y = lineLabel(ctx, input.line, y)

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
  callToAction(ctx, 'COMING? TAP THE LINK', input.link, ctaY)

  return await toPng(canvas)
}
