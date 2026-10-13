/**
 * Event flyers, server side: what an event's flyer says and shows right now,
 * and painting one flyer row in the background.
 *
 * paint / direction: a new poster from the look, the artists' photos and every
 * line. fix / refresh: an edit of an existing poster (keeps the picture, changes
 * what was asked or the words). Painted once per click and read back; the check
 * is shown to the organizer, who decides whether to paint again. Recipe and lessons:
 * ~/Orgs/LaClave/assets/flyer-style.md (story first, one photo per person, retries).
 */
import cloudinary from 'cloudinary'
import { eq, and, inArray, isNotNull } from 'drizzle-orm'
import { events, profiles, eventFlyers } from '../../database/schema'
import { flyerLines, flyerChanges, paintPrompt, fixPrompt, refreshPrompt, checkFlyerText, type FlyerLine, type FlyerCheck } from '../../../shared/utils/flyer'
import { paintWithRetries, readText, fetchImage, IMAGE_MODEL, type InlineImage } from './gemini'

/** More faces → more refusals and smaller faces; the editor warns above two. */
export const MAX_FACES = 2

/** The event's flyer as of now: its lines, who is pictured and with which photo. */
export async function flyerSource(db: any, ev: any) {
  const handles: string[] = ev.artists ?? []
  const rows = handles.length
    ? await db.select({ username: profiles.username, name: profiles.name, photo: profiles.photo }).from(profiles).where(inArray(profiles.username, handles))
    : []
  const byHandle = new Map<string, any>(rows.map((r: any) => [r.username, r]))
  const chosen = (ev.flyerOptions?.photos ?? {}) as Record<string, string | null>
  const people = handles.map((h) => {
    const p = byHandle.get(h)
    // Unset = their main photo; null = name only; a URL = the photo picked for this event.
    const photo = h in chosen ? chosen[h] : (p?.photo || null)
    return { username: h, name: ev.flyerOptions?.names?.[h] || (p?.name as string) || h, photo: photo || null }
  })
  // The venue as it is now: a venue on WeDance may have been renamed or got its
  // address after the event copied them.
  const [venue] = ev.venueUsername
    ? await db.select({ name: profiles.name, address: profiles.address }).from(profiles).where(eq(profiles.username, ev.venueUsername))
    : [null]
  const lines = flyerLines({
    name: ev.name ?? '',
    startDate: ev.startDate,
    endDate: ev.endDate,
    timezone: ev.timezone,
    venueName: venue?.name || ev.venueName,
    venueAddress: venue?.address || ev.venueAddress,
    agenda: ev.agenda ?? [],
    showAgenda: ev.flyerOptions?.showAgenda !== false,
    artists: people,
    styles: ev.styles ?? [],
    price: ev.price,
  })
  const faces = people.filter(p => p.photo)
  return { lines, people, pictured: faces.map(p => p.name), photos: faces.map(p => p.photo as string) }
}

export const texts = (lines: { text: string }[]) => lines.map(l => l.text)

/** Kept flyer + whether it still matches each event. Used by the editor and the home inbox. */
export async function flyerStatusFor(db: any, evs: any[]) {
  const ids = evs.map(e => e.id)
  const kept = ids.length
    ? await db.select().from(eventFlyers).where(and(inArray(eventFlyers.eventId, ids), isNotNull(eventFlyers.keptAt)))
    : []
  const byEvent = new Map<string, any>(kept.map((k: any) => [k.eventId, k]))
  const out = new Map<string, { kept: any | null; changes: { was: string | null; now: string | null }[]; source: Awaited<ReturnType<typeof flyerSource>> }>()
  for (const e of evs) {
    const source = await flyerSource(db, e)
    const k = byEvent.get(e.id) ?? null
    const changes = k ? flyerChanges({ lines: texts(k.lines), pictured: k.pictured }, { lines: texts(source.lines), pictured: source.pictured }) : []
    out.set(e.id, { kept: k, changes, source })
  }
  return out
}

async function upload(img: InlineImage, folder: string) {
  const config = useRuntimeConfig()
  cloudinary.v2.config({ cloud_name: config.public.cloudinaryCloudName, api_key: config.cloudinaryApiKey, api_secret: config.cloudinaryApiSecret })
  // Data URI, not a file path: Bun's file uploads to Cloudinary fail.
  const res = await cloudinary.v2.uploader.upload(`data:${img.mimeType};base64,${img.data}`, { folder: `wedance-2026/flyers/${folder}` })
  return { url: res.secure_url as string, width: res.width as number, height: res.height as number }
}

/** Paint one flyer row (status 'painting') and store the best round. Never throws. */
export async function runFlyer(db: any, flyerId: string) {
  const [f] = await db.select().from(eventFlyers).where(eq(eventFlyers.id, flyerId))
  if (!f) return
  const set = (v: Record<string, unknown>) => db.update(eventFlyers).set({ ...v, updatedAt: new Date() }).where(eq(eventFlyers.id, flyerId))
  // Stopped by the organizer meanwhile: spend nothing more on it.
  const stopped = async () => (await db.select({ status: eventFlyers.status }).from(eventFlyers).where(eq(eventFlyers.id, flyerId)))[0]?.status === 'stopped'
  try {
    const [ev] = await db.select().from(events).where(eq(events.id, f.eventId))
    const [host] = ev?.hostProfileId ? await db.select({ username: profiles.username }).from(profiles).where(eq(profiles.id, ev.hostProfileId)) : [null]
    const lines = f.lines as FlyerLine[]
    const look = f.look as { description: string; palette?: any[]; inspiration?: string | null }

    let prompt: string
    let images: InlineImage[]
    if (f.mode === 'fix' || f.mode === 'refresh') {
      const [base] = await db.select({ url: eventFlyers.url }).from(eventFlyers).where(eq(eventFlyers.id, f.baseFlyerId))
      const img = base?.url ? await fetchImage(base.url) : null
      if (!img) throw new Error('The flyer to change is gone. Make a new one instead.')
      prompt = f.mode === 'fix' ? fixPrompt(lines, f.notes ?? '') : refreshPrompt(lines)
      images = [img]
    } else {
      const src = await flyerSource(db, ev)
      const faces = (await Promise.all(src.photos.slice(0, MAX_FACES).map(fetchImage))).filter(Boolean) as InlineImage[]
      const inspiration = look.inspiration ? await fetchImage(look.inspiration) : null
      prompt = paintPrompt(lines, look, { people: faces.length, notes: f.notes, inspiration: !!inspiration })
      images = inspiration ? [...faces, inspiration] : faces
    }

    // One painting per click. No automatic repaints: each one costs money, so
    // the organizer sees the result and decides.
    const img = await paintWithRetries(prompt, images, '9:16')
    if (await stopped()) return
    const up = await upload(img, host?.username ?? 'unknown')
    // The picture shows now; the words are read back while the organizer looks at it.
    await set({ status: 'checking', url: up.url, width: up.width, height: up.height, prompt, model: IMAGE_MODEL, error: null })
    const check: FlyerCheck = checkFlyerText(lines, await readText(img))
    await set({ status: 'ready', check })
  } catch (e: any) {
    if (await stopped()) return
    // Painted but the read-back failed: keep the picture, just unchecked.
    const [row] = await db.select({ url: eventFlyers.url }).from(eventFlyers).where(eq(eventFlyers.id, flyerId))
    await set(row?.url ? { status: 'ready', check: null } : { status: 'failed', error: e?.message || 'Something went wrong while painting.' })
  }
}
