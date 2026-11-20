/**
 * Work in progress on the flyer page (RAZ-1033). The step, the uploaded photos
 * and flyers, and the look that was read live only in the browser until this
 * draft is stored on the post. Coming back — another device, or after changing
 * the title — reopens the same place. Painted versions stay in event_flyers;
 * the draft remembers which sitting and which step.
 */
import { z } from 'zod'

export const FLYER_STEPS = ['ask', 'upload', 'reading', 'look', 'brief', 'painting', 'directions', 'result', 'save', 'done'] as const
export type FlyerStep = (typeof FLYER_STEPS)[number]

/** Steps that show a sitting and need its rows. */
export const FLYER_SITTING_STEPS: ReadonlySet<FlyerStep> = new Set(['painting', 'directions', 'result', 'save', 'done'])

const stepSchema = z.enum(FLYER_STEPS)
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)
/** Only http(s). `new URL` also accepts `javascript:`, and these addresses are shown in <img>. */
const httpUrl = z.string().max(2000).refine((s) => {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}, 'Use an http(s) address')

export const flyerDraftSchema = z.object({
  step: stepSchema,
  path: z.enum(['yes', 'fresh', 'saved']).nullable(),
  history: z.array(stepSchema).max(20),
  uploads: z.array(z.object({
    url: httpUrl,
    name: z.string().max(180),
  })).max(5),
  look: z.object({
    name: z.string().max(60),
    description: z.string().max(2000),
    palette: z.array(z.object({ name: z.string().max(40), hex })).max(8),
  }),
  savedLookId: z.string().uuid().nullable(),
  feeling: z.array(z.string().max(30)).max(3),
  liked: httpUrl.nullable(),
  chosen: z.array(z.string().max(80)).max(12),
  picked: z.array(z.string().uuid()).max(2),
  currentId: z.string().uuid().nullable(),
  batchId: z.string().uuid().nullable(),
})

export type FlyerDraft = z.infer<typeof flyerDraftSchema>

export function emptyFlyerDraft(): FlyerDraft {
  return {
    step: 'ask',
    path: null,
    history: [],
    uploads: [],
    look: { name: 'Main look', description: '', palette: [] },
    savedLookId: null,
    feeling: [],
    liked: null,
    chosen: [],
    picked: [],
    currentId: null,
    batchId: null,
  }
}

/** A stored value we can reopen. Anything else is ignored so a bad row cannot break the page. */
export function parseFlyerDraft(raw: unknown): FlyerDraft | null {
  const parsed = flyerDraftSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/** The first question, with nothing chosen, is not worth restoring. */
export function flyerDraftHasProgress(d: FlyerDraft | null | undefined): boolean {
  if (!d) return false
  if (d.step !== 'ask') return true
  if (d.path) return true
  if (d.uploads.length || d.batchId || d.liked || d.savedLookId) return true
  if (d.feeling.length) return true
  if (d.look.description.trim()) return true
  return false
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type FlyerResume = {
  step: FlyerStep
  batchId: string | null
  /**
   * The URL names a sitting the editor opened (Refresh, Change it, or a batch
   * with no step). That sitting wins over the draft's step. A reload of this
   * page carries both step and batch, and is not explicit.
   */
  explicitBatch: boolean
}

function queryStep(step: unknown): FlyerStep | null {
  return typeof step === 'string' && (FLYER_STEPS as readonly string[]).includes(step) ? step as FlyerStep : null
}
function queryBatch(batch: unknown): string | null {
  return typeof batch === 'string' && UUID.test(batch) ? batch : null
}

/**
 * Where to reopen the page. Refresh and Change it name a sitting. Otherwise the
 * URL step (a reload) or the saved draft (they left, and came back from the event).
 */
export function resumeFlyer(
  query: { step?: unknown; batch?: unknown; refresh?: unknown; flyer?: unknown },
  draft: FlyerDraft | null,
): FlyerResume {
  const qStep = queryStep(query.step)
  const qBatch = queryBatch(query.batch)
  const saved = draft && flyerDraftHasProgress(draft) ? draft : null
  const refreshing = query.refresh === '1'
  const openingVersion = typeof query.flyer === 'string' && UUID.test(query.flyer)

  if (qBatch && (refreshing || openingVersion)) {
    return { step: refreshing ? 'painting' : (qStep ?? 'result'), batchId: qBatch, explicitBatch: true }
  }
  // ?batch= alone is the editor's "open this sitting".
  if (qBatch && !qStep) return { step: 'result', batchId: qBatch, explicitBatch: true }
  if (qStep || saved) {
    return { step: qStep ?? saved!.step, batchId: qBatch ?? saved?.batchId ?? null, explicitBatch: false }
  }
  return { step: 'ask', batchId: null, explicitBatch: false }
}

type SittingRow = { mode: string; status: string; url: string | null }

/**
 * The step to show once we know how the sitting turned out. "Reading" is a
 * spinner: the look is already read, or the uploads are still there. "Painting"
 * moves on when the picture is done, so a reload does not wait forever.
 */
export function landOnSitting(
  step: FlyerStep,
  rows: SittingRow[],
  opts: { lookDescription?: string; picked?: string[] } = {},
): FlyerStep {
  const wanted: FlyerStep = step === 'reading'
    ? ((opts.lookDescription ?? '').trim().length >= 10 ? 'look' : 'upload')
    : step
  if (!FLYER_SITTING_STEPS.has(wanted)) return wanted
  const directions = rows.some(r => r.mode === 'direction')
  const busy = rows.some(r => r.status === 'painting')
  const hasPicture = rows.some(r => !!r.url && (r.status === 'ready' || r.status === 'checking'))
  if (wanted === 'painting') {
    if (busy) return 'painting'
    if (directions && !opts.picked?.length) return 'directions'
    return 'result'
  }
  if (wanted === 'directions') return directions || !rows.length ? 'directions' : (busy ? 'painting' : 'result')
  if ((wanted === 'result' || wanted === 'save' || wanted === 'done') && rows.length && !hasPicture) {
    if (busy) return directions ? 'directions' : 'painting'
    return directions ? 'directions' : wanted
  }
  return wanted
}
