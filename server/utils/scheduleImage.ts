import cloudinary from 'cloudinary'
import { TRPCError } from '@trpc/server'
import { cloudinaryKeys } from './rehostImage'
import type { ScheduleDay } from '../../shared/utils/citySchedule'

/**
 * The weekly schedule as a picture (city channels, migration 0067): a 1080×1350 (4:5)
 * poster, drawn as SVG and rasterised by Cloudinary (f_jpg), so no fonts or browser
 * are needed on the server. Long weeks shrink the type, then end in "+N more".
 */
const W = 1080
const H = 1350
const PAD = 72
const HEADER = 250
const FOOTER = 110
// Rows a day heading takes (the gap above it and the heading itself).
const DAY_ROWS = 1.5
// Below this the type is too small to read on a phone: drop events and say "+N more".
const MIN_LINE = 40
const MAX_LINE = 58

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]!))
// Emoji and other astral characters don't render in the rasteriser's fonts.
const plain = (s: string) => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim()
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, Math.max(1, max - 1)).trimEnd()}…` : s)

/** Which days and events fit at the smallest readable size, and how many are left out. */
export function fitSchedule(days: ScheduleDay[], area: number): { days: ScheduleDay[]; more: number; line: number } {
  const total = days.reduce((n, d) => n + d.items.length, 0)
  const rows = days.length * DAY_ROWS + total
  const line = Math.min(MAX_LINE, Math.max(MIN_LINE, area / Math.max(1, rows)))
  const capacity = Math.floor(area / line + 1e-9)
  if (rows <= capacity) return { days, more: 0, line }
  // Keep one row for "+N more".
  const room = capacity - 1
  let used = 0
  let shown = 0
  const kept: ScheduleDay[] = []
  for (const d of days) {
    const fit = Math.floor(room - used - DAY_ROWS)
    if (fit < 1) break
    const take = d.items.slice(0, fit)
    used += DAY_ROWS + take.length
    shown += take.length
    kept.push({ ...d, items: take })
  }
  return { days: kept, more: total - shown, line }
}

export function scheduleSvg(input: { cityName: string; weekLabel: string; days: ScheduleDay[]; footer: string }): string {
  const area = H - HEADER - FOOTER - 40
  const { days, more, line } = fitSchedule(input.days, area)
  const font = Math.round(line * 0.62)
  const timeW = font * 3.4
  const maxChars = Math.floor((W - 2 * PAD - timeW) / (font * 0.52))
  const out: string[] = []
  let y = HEADER + 20
  for (const d of days) {
    y += line * 1.2
    out.push(`<text x="${PAD}" y="${y}" class="day" font-size="${Math.round(font * 0.8)}">${esc(plain(d.label).toUpperCase())}</text>`)
    y += line * 0.3
    for (const i of d.items) {
      y += line
      const what = clip(plain(i.where && (i.name.length + i.where.length + 3) <= maxChars ? `${i.name} · ${i.where}` : i.name), maxChars)
      out.push(`<text x="${PAD}" y="${y}" class="time" font-size="${font}">${esc(i.time)}</text>`)
      out.push(`<text x="${PAD + timeW}" y="${y}" class="what" font-size="${font}">${esc(what)}</text>`)
    }
  }
  if (more > 0) {
    y += line
    out.push(`<text x="${PAD}" y="${y}" class="more" font-size="${font}">+${more} more on WeDance</text>`)
  }
  if (!days.length) out.push(`<text x="${PAD}" y="${HEADER + 120}" class="what" font-size="40">Nothing picked for this week yet.</text>`)

  const city = clip(plain(input.cityName), 22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
text { font-family: Helvetica, Arial, sans-serif; }
.eyebrow { fill: #fee2e2; font-weight: 700; letter-spacing: 6px; }
.title { fill: #ffffff; font-weight: 700; }
.week { fill: #ffffff; font-weight: 400; }
.day { fill: #b91c1c; font-weight: 700; letter-spacing: 3px; }
.time { fill: #6b7280; font-weight: 700; }
.what { fill: #111827; font-weight: 400; }
.more { fill: #b91c1c; font-weight: 700; }
.foot { fill: #374151; font-weight: 700; }
</style>
<rect width="${W}" height="${H}" fill="#fbf6ef"/>
<rect width="${W}" height="${HEADER}" fill="#dc2626"/>
<text x="${PAD}" y="84" class="eyebrow" font-size="28">THIS WEEK IN</text>
<text x="${PAD}" y="168" class="title" font-size="${city.length > 14 ? 76 : 96}">${esc(city)}</text>
<text x="${PAD}" y="220" class="week" font-size="40">${esc(plain(input.weekLabel))}</text>
${out.join('\n')}
<rect y="${H - FOOTER}" width="${W}" height="1" fill="#e5ded3"/>
<text x="${PAD}" y="${H - FOOTER / 2 + 12}" class="foot" font-size="32">${esc(plain(input.footer))}</text>
</svg>`
}

/**
 * Upload the SVG to Cloudinary and return the JPEG URL Instagram and Telegram take.
 * The same city + week overwrites its picture (public id), with a new version each time.
 */
export async function uploadScheduleImage(svg: string, publicId: string): Promise<string> {
  const keys = cloudinaryKeys()
  if (!keys) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Picture upload isn’t set up on this server (Cloudinary).' })
  cloudinary.v2.config({ cloud_name: keys.cloud, api_key: keys.apiKey, api_secret: keys.apiSecret })
  const res = await cloudinary.v2.uploader.upload(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, {
    folder: 'wedance-2026/schedules', public_id: publicId, overwrite: true, invalidate: true, resource_type: 'image',
  })
  // A plain upload URL (no transformation) so instagramImageUrl can shape it for feed or story;
  // .jpg converts the SVG (Instagram only takes JPEG); the version busts caches after a redraw.
  return `https://res.cloudinary.com/${keys.cloud}/image/upload/v${res.version}/${res.public_id}.jpg`
}
