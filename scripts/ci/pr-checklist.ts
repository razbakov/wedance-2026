/**
 * Pre-PR checklist (RAZ-1073). The Cursor agent runs this before a pull
 * request is ready for review. Exit 0 when every check passes or does not
 * apply; exit 1 when one fails — leave the PR in draft and do not ask for
 * review. Exit 2 is a usage or git error.
 *
 *   bun scripts/ci/pr-checklist.ts --evidence /tmp/pr-checklist.evidence.json
 *
 * The evidence file is the agent's own record of the walkthrough (clicks,
 * BDD scenario, preview probe, screenshots, video). The script checks that
 * record against the diff and, by default, probes the preview's image upload
 * itself so a pasted status cannot skip a 503.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

export type CheckStatus = 'pass' | 'fail' | 'na'

export interface CheckResult {
  id: number
  name: string
  status: CheckStatus
  detail: string
}

export interface DiffFile {
  path: string
  /** A added, M modified, D deleted. A rename is recorded as A on the new path. */
  status: 'A' | 'M' | 'D'
}

export interface AddedLine {
  file: string
  line: string
}

export interface DemoPathEvidence {
  name: string
  steps: string[]
  clickedOnly: boolean
  bddFeature: string
  bddScenario: string
  screenshots: { desktop: string, mobile: string }
  video: string
}

export interface Evidence {
  noDemo?: boolean
  noDemoReason?: string
  demoPaths?: DemoPathEvidence[]
  language?: 'en' | 'de'
  languageReviewed?: boolean
  preview?: {
    url?: string
    uploadStatus?: number
    uploadBody?: string
    dataNotes?: string
  }
  blueprintsReviewed?: string[]
  blueprintNotes?: { file: string, unchangedBecause: string }[]
  /** A new page that is not a step on any blueprint, and why. */
  newPageNotes?: { file: string, whyNoBlueprint: string }[]
}

export interface RepoView {
  read(path: string): string | null
  exists(path: string): boolean
  size(path: string): number
  blueprintFiles: string[]
  /** Every app/pages vue file. When set, blueprint routes resolve through these pages, including definePageMeta path and alias. */
  pageFiles?: string[]
}

export interface ChecklistInput {
  files: DiffFile[]
  added: AddedLine[]
  evidence: Evidence | null
  repo: RepoView
}

export const MIN_SCREENSHOT_BYTES = 8_000
export const MIN_VIDEO_BYTES = 10_000

const CHECKS = [
  'Every demo path is clickable end to end in the UI, with no URL edits needed.',
  'The flow is covered in BDD before it is shown.',
  'The preview environment has uploads and data configured.',
  'Language is consistent: one language only, no mixed German/English.',
  'Blueprints are current and in sync with the code.',
  'Screenshots are captured on both desktop and mobile for every demo path.',
  'A video walkthrough of every demo path is recorded.',
] as const

/**
 * Closed word lists. A word counts only on its own, so "München" inside an
 * English sentence is a name, not German. Umlauts alone are not a signal.
 */
const DE_WORDS = new Set([
  'und', 'oder', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einem', 'einen',
  'nicht', 'mit', 'für', 'fuer', 'auf', 'ist', 'sind', 'bitte', 'deine', 'dein', 'deiner', 'deinem',
  'meine', 'mein', 'meiner', 'ich', 'wir', 'zum', 'zur', 'beim', 'auch', 'noch', 'schon', 'hier',
  'jetzt', 'heute', 'morgen', 'willkommen', 'weiter', 'zurück', 'zurueck', 'speichern', 'abbrechen',
  'stadt', 'einstellungen', 'keine', 'kein', 'wenn', 'dass', 'danke', 'fertig', 'warte', 'anzeigen',
  'treffen', 'hinzufügen', 'hinzufuegen', 'veranstaltung', 'anmeldung', 'abmelden', 'tänzer', 'taenzer',
  'tanzen', 'wochenende', 'freunde', 'freund', 'nacht', 'abend', 'später', 'spaeter', 'nächste',
  'naechste', 'schön', 'schoen', 'groß', 'wählen', 'waehlen', 'bereits', 'zusammen', 'hochladen',
  'foto', 'öffnen', 'oeffnen', 'schließen', 'schliessen', 'auswählen', 'auswaehlen', 'klicke', 'tippe',
  'anmelden', 'verpassen', 'karte',
])

const EN_WORDS = new Set([
  'the', 'and', 'or', 'your', 'you', 'please', 'welcome', 'next', 'back', 'find', 'search', 'settings',
  'click', 'tap', 'when', 'what', 'why', 'show', 'hide', 'follow', 'meet', 'dance', 'dancers', 'city',
  'role', 'photo', 'upload', 'continue', 'tonight', 'tomorrow', 'add', 'save', 'cancel', 'with', 'this',
  'that', 'from', 'here', 'wait', 'minutes', 'sign', 'account', 'friends', 'friend', 'night', 'card',
  'match', 'going', 'profile', 'to',
])

const URL_EDIT = /\b(address bar|url bar|edited the url|edit the url|typed (the |a )?url|pasted (the |a )?url|navigated directly|direct url|type the path|edited the address)\b/i
const PATH_IN_STEP = /(?:https?:\/\/[^\s)'"]+|(?<![\w])\/[a-z0-9][\w\-./[\]]*)/gi
const CLICK = /\b(click|tap|press|choose|select|open|fill|type|submit|follow|pick|scan|confirm|toggle|switch|scroll)\b/i
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i
const VIDEO_EXT = /\.(mp4|webm|mov)$/i
const UPLOAD_OK = new Set([200, 400, 401, 403, 413, 415, 422])

export function isUserVisible(path: string): boolean {
  if (path.startsWith('app/pages/docs/') || path.startsWith('app/components/docs/')) return false
  if (path.startsWith('app/components/ui/')) return false
  if (path.includes('.test.')) return false
  return /^app\/pages\/.+\.vue$/.test(path) || /^app\/components\/.+\.vue$/.test(path)
}

export function isBlueprintFile(path: string): boolean {
  return /^app\/lib\/blueprint-[a-z0-9-]+\.ts$/.test(path)
}

export function parseNameStatus(text: string): DiffFile[] {
  const out: DiffFile[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    const code = parts[0]
    if (code.startsWith('R') || code.startsWith('C')) {
      if (parts[1]) out.push({ path: parts[1], status: 'D' })
      if (parts[2]) out.push({ path: parts[2], status: 'A' })
      continue
    }
    const status = code[0]
    if ((status === 'A' || status === 'M' || status === 'D') && parts[1]) {
      out.push({ path: parts[1], status })
    }
  }
  return out
}

export function parseUnifiedAdded(diff: string): AddedLine[] {
  const out: AddedLine[] = []
  let file = ''
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6)
      continue
    }
    if (line.startsWith('+++ /dev/null')) {
      file = ''
      continue
    }
    if (file && line.startsWith('+') && !line.startsWith('+++')) {
      out.push({ file, line: line.slice(1) })
    }
  }
  return out
}

export function pageCandidates(route: string): string[] {
  const path = route.split(/[?#]/)[0].trim()
  if (!path.startsWith('/')) return []
  let p = path.replace(/\/+$/, '') || '/'
  p = p.replace(/^\/@handle$/, '/@[handle]').replace(/^\/@\[handle\]$/, '/@[handle]')
  if (p === '/') return ['app/pages/index.vue']
  const rel = p.slice(1)
  return [`app/pages/${rel}.vue`, `app/pages/${rel}/index.vue`]
}

/**
 * Route shape with the param name erased, so /business/network/[handle]
 * and /business/network/[username] are the same page, and /ask/[token]
 * matches an alias of /ask/:token. Query and hash are not part of the page.
 */
export function routePattern(route: string): string | null {
  const path = route.split(/[?#]/)[0].trim()
  if (!path.startsWith('/')) return null
  const parts = path.split('/').filter(Boolean).map((seg) => {
    if (seg.startsWith('@')) {
      const rest = seg.slice(1)
      if (rest === 'handle' || /^\[[^\]]+\]$/.test(rest) || /^:[A-Za-z]+$/.test(rest)) return '@*'
    }
    if (/^\[[^\]]+\]$/.test(seg) || /^:[A-Za-z]+$/.test(seg)) return '*'
    return seg
  })
  return '/' + parts.join('/')
}

/** Routes a page file actually serves: its path, plus definePageMeta path and alias. */
export function routesFromPage(file: string, source: string): string[] {
  const rel = file.replace(/^app\/pages\//, '').replace(/\.vue$/, '')
  const segs = rel.split('/')
  if (segs[segs.length - 1] === 'index') segs.pop()
  const fallback = '/' + segs.filter(Boolean).join('/')
  const routes = [fallback === '/' ? '/' : fallback]
  const meta = pageMetaBlock(source)
  for (const m of meta.matchAll(/path:\s*['"]([^'"]+)['"]/g)) routes.push(m[1])
  const aliasList = meta.match(/alias:\s*\[([^\]]*)\]/)
  if (aliasList) for (const m of aliasList[1].matchAll(/['"]([^'"]+)['"]/g)) routes.push(m[1])
  const aliasOne = meta.match(/alias:\s*['"]([^'"]+)['"]/)
  if (aliasOne) routes.push(aliasOne[1])
  return routes
}

function pageMetaBlock(source: string): string {
  const start = source.indexOf('definePageMeta')
  if (start < 0) return ''
  const brace = source.indexOf('{', start)
  if (brace < 0) return ''
  let depth = 0
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(brace, i + 1)
    }
  }
  return ''
}

export function parseBlueprintSource(source: string): { routes: string[], codes: string[] } {
  const routes: string[] = []
  const codes: string[] = []
  for (const m of source.matchAll(/route:\s*'([^']*)'/g)) routes.push(...m[1].split(' · ').map(s => s.trim()).filter(Boolean))
  for (const m of source.matchAll(/route:\s*"([^"]*)"/g)) routes.push(...m[1].split(' · ').map(s => s.trim()).filter(Boolean))
  for (const m of source.matchAll(/code:\s*'([^']*)'/g)) codes.push(m[1])
  for (const m of source.matchAll(/code:\s*"([^"]*)"/g)) codes.push(m[1])
  return { routes, codes }
}

export function codeRefs(code: string): string[] {
  const refs = new Set<string>()
  for (const m of code.matchAll(/(?:server|shared|app|scripts)\/[\w./[\]-]+\.(?:ts|vue)/g)) refs.add(m[0])
  for (const m of code.matchAll(/\b[A-Z][\w]+\.vue\b/g)) refs.add(m[0])
  return [...refs]
}

export function classifyPhrase(text: string): 'en' | 'de' | 'mixed' | 'neutral' {
  const words = text.toLowerCase().match(/[a-zäöüß]+/g) ?? []
  let de = false
  let en = false
  for (const w of words) {
    if (DE_WORDS.has(w)) de = true
    if (EN_WORDS.has(w)) en = true
  }
  if (de && en) return 'mixed'
  if (de) return 'de'
  if (en) return 'en'
  return 'neutral'
}

export function uiChunksFromLine(raw: string): string[] {
  const line = raw.replace(/^\+/, '')
  const trimmed = line.trim()
  if (!trimmed) return []
  if (/^(\/\/|\*|\/\*|<!--)/.test(trimmed)) return []
  if (/^(import |export type |export interface )/.test(trimmed)) return []
  const chunks: string[] = []
  for (const m of line.matchAll(/(['"`])((?:\\.|(?!\1).){0,500})\1/g)) {
    const text = m[2].replace(/\\n/g, ' ').trim()
    if (keepChunk(text)) chunks.push(text)
  }
  const noTags = line
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .trim()
  if (keepChunk(noTags) && !chunks.some(c => noTags.includes(c) || c.includes(noTags))) chunks.push(noTags)
  return chunks
}

function keepChunk(text: string): boolean {
  if (text.length < 8 || !text.includes(' ')) return false
  if (/[{};]|=>|\b(function|const|let|return|import)\b/.test(text)) return false
  if (/^https?:\/\//.test(text) || /^\/[\w./[\]-]+$/.test(text)) return false
  return /[A-Za-zÄÖÜäöüß]{3,}/.test(text)
}

export function stepEditsUrl(step: string, index: number): string | null {
  if (URL_EDIT.test(step)) return 'the step edits or types a URL'
  const matches = step.match(PATH_IN_STEP) ?? []
  for (const raw of matches) {
    let path = raw
    if (/^https?:\/\//i.test(raw)) {
      try { path = new URL(raw).pathname }
      catch { return raw }
    }
    if ((path === '/' || path === '') && index === 0) continue
    return raw
  }
  return null
}

export function previewOrigin(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !/^pr-\d+\.dev\.wedance\.vip$/.test(u.hostname)) return null
    return u.origin
  } catch {
    return null
  }
}

/** Null when the upload endpoint is configured. A reason string when it is not. */
export function uploadVerdict(status: number | undefined, body: string | undefined): string | null {
  const text = body ?? ''
  if (/not configured/i.test(text)) return 'Image upload is not configured.'
  if (status == null) return 'No upload probe yet. POST the preview origin /api/media/image.'
  if (status === 200 && /<!doctype html/i.test(text)) return 'The preview returned HTML instead of the upload API.'
  if (UPLOAD_OK.has(status)) return null
  if (status === 503) return 'Image upload is not configured (HTTP 503).'
  if (status === 0) return `The preview could not be probed${text ? `: ${text}` : '.'}`
  return `Image upload returned HTTP ${status}.`
}

export function assessChecklist(input: ChecklistInput): { checks: CheckResult[], blocked: boolean, report: string } {
  const visible = input.files.filter(f => f.status !== 'D' && isUserVisible(f.path))
  const paths = input.evidence?.demoPaths ?? []
  const claimsNone = input.evidence?.noDemo === true && paths.length === 0
  const demo: 'na' | 'missing' | 'run' = paths.length > 0
    ? 'run'
    : (claimsNone || visible.length === 0) && !(claimsNone && visible.length > 0)
        ? 'na'
        : 'missing'

  const checks: CheckResult[] = [
    checkClickable(demo, visible, input.evidence, paths),
    checkBdd(demo, input),
    checkPreview(demo, input.evidence),
    checkLanguage(input, paths.length > 0),
    checkBlueprints(input, visible),
    checkShots(demo, paths, input.repo),
    checkVideo(demo, paths, input.repo),
  ]
  const blocked = checks.some(c => c.status === 'fail')
  return { checks, blocked, report: renderReport(checks, blocked) }
}

function result(id: number, status: CheckStatus, detail: string): CheckResult {
  return { id, name: CHECKS[id - 1], status, detail }
}

function visibleList(files: DiffFile[]): string {
  return files.map(f => f.path).join(', ')
}

function checkClickable(demo: 'na' | 'missing' | 'run', visible: DiffFile[], evidence: Evidence | null, paths: DemoPathEvidence[]): CheckResult {
  if (evidence?.noDemo && visible.length > 0 && paths.length === 0) {
    return result(1, 'fail', `noDemo was set, but the diff changes a screen a dancer can open: ${visibleList(visible)}. Walk that screen by clicking, or remove noDemo.`)
  }
  if (demo === 'na') {
    const why = evidence?.noDemoReason?.trim()
      || 'No user-visible page or feature component in the diff, so there is no demo path to click.'
    return result(1, 'na', why)
  }
  if (demo === 'missing') {
    return result(1, 'fail', `The diff changes ${visibleList(visible)}. Record every demo path as clicks. The only URL you may open is the site origin; do not edit the address bar (this is what blocked the RAZ-1071 walkthrough when /meet/ritual was opened directly).`)
  }
  const problems: string[] = []
  for (const path of paths) {
    const name = path.name?.trim() || '(unnamed path)'
    if (!path.name?.trim()) problems.push(`${name}: give the path a name.`)
    if (path.clickedOnly !== true) problems.push(`${name}: clickedOnly must be true. If you typed a URL, add the missing link first.`)
    if (!Array.isArray(path.steps) || path.steps.length < 2) problems.push(`${name}: list at least two steps.`)
    path.steps?.forEach((step, i) => {
      if (typeof step !== 'string' || step.trim().length < 8) problems.push(`${name}: step ${i + 1} does not say what you did.`)
      else {
        const edit = stepEditsUrl(step, i)
        if (edit) problems.push(`${name}: step ${i + 1} leaves the click path (${edit}). ${step}`)
        else if (!CLICK.test(step)) problems.push(`${name}: step ${i + 1} does not name a control you clicked, tapped, or filled. ${step}`)
      }
    })
  }
  if (problems.length) return result(1, 'fail', problems.join('\n'))
  return result(1, 'pass', paths.map(p => `${p.name}: ${p.steps.length} clicks, no URL edits.`).join('\n'))
}

function checkBdd(demo: 'na' | 'missing' | 'run', input: ChecklistInput): CheckResult {
  if (demo === 'na') return result(2, 'na', 'No demo path, so there is no flow to cover in BDD.')
  if (demo === 'missing') return result(2, 'fail', 'Name the Scenario that walks this flow. A new screen needs the feature file in this diff, before the PR is shown.')
  const problems: string[] = []
  const cited: string[] = []
  for (const path of input.evidence!.demoPaths!) {
    const feature = path.bddFeature?.replace(/^\.\//, '') ?? ''
    const title = path.bddScenario?.trim() ?? ''
    if (!feature.startsWith('e2e/features/') || !feature.endsWith('.feature') || feature.includes('..')) {
      problems.push(`${path.name}: bddFeature must be a file under e2e/features/.`)
      continue
    }
    const body = input.repo.read(feature)
    if (body == null) {
      problems.push(`${path.name}: ${feature} does not exist on this branch.`)
      continue
    }
    if (!scenarioExists(body, title)) problems.push(`${path.name}: ${feature} has no Scenario titled “${title}”.`)
    else cited.push(`${feature} — Scenario: ${title}`)
  }
  const newPages = input.files.filter(f => f.status === 'A' && isUserVisible(f.path) && f.path.startsWith('app/pages/'))
  const featureTouched = input.files.some(f => f.status !== 'D' && /^e2e\/features\/.+\.feature$/.test(f.path))
  if (newPages.length && !featureTouched) {
    problems.push(`New page ${newPages.map(f => f.path).join(', ')} needs a feature file in this same diff, not only a scenario that was already on main.`)
  }
  if (problems.length) return result(2, 'fail', problems.join('\n'))
  return result(2, 'pass', cited.join('\n'))
}

function scenarioExists(body: string, title: string): boolean {
  if (!title) return false
  const want = title.toLowerCase()
  return body.split('\n').some((line) => {
    const m = line.match(/^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/)
    return m != null && m[1].trim().toLowerCase() === want
  })
}

function checkPreview(demo: 'na' | 'missing' | 'run', evidence: Evidence | null): CheckResult {
  if (demo === 'na') return result(3, 'na', 'No demo path, so the preview was not required.')
  if (demo === 'missing') return result(3, 'fail', 'Probe the preview before review. POST https://pr-<n>.dev.wedance.vip/api/media/image must not be 503, and the accounts in the demo need the data the screen filters on.')
  const preview = evidence?.preview
  const origin = preview?.url ? previewOrigin(preview.url) : null
  const problems: string[] = []
  if (!origin) problems.push('preview.url must be the preview origin https://pr-<n>.dev.wedance.vip. Localhost does not stand in for it.')
  const upload = uploadVerdict(preview?.uploadStatus, preview?.uploadBody)
  if (upload) problems.push(upload)
  const notes = preview?.dataNotes?.trim() ?? ''
  const words = notes.split(/\s+/).filter(Boolean)
  if (words.length < 4) problems.push('dataNotes must say what data the demo needed and that it was present (photo, city, role, dances — whatever that screen hides people for).')
  if (problems.length) return result(3, 'fail', problems.join('\n'))
  return result(3, 'pass', `${origin} upload HTTP ${preview!.uploadStatus}. ${notes}`)
}

function checkLanguage(input: ChecklistInput, hasDemo: boolean): CheckResult {
  const phrases: { file: string, text: string, kind: 'en' | 'de' | 'mixed' }[] = []
  for (const added of input.added) {
    if (!isUserVisible(added.file)) continue
    for (const chunk of uiChunksFromLine(added.line)) {
      const kind = classifyPhrase(chunk)
      if (kind !== 'neutral') phrases.push({ file: added.file, text: chunk, kind })
    }
  }
  const problems: string[] = []
  const kinds = new Set(phrases.map(p => p.kind))
  if (kinds.has('mixed') || (kinds.has('en') && kinds.has('de'))) {
    problems.push('The diff mixes German and English:')
    for (const p of phrases.filter(p => p.kind === 'mixed' || kinds.has('en') && kinds.has('de')).slice(0, 8)) {
      problems.push(`- ${p.file}: “${p.text}” (${p.kind})`)
    }
  }
  if (hasDemo) {
    if (input.evidence?.languageReviewed !== true) problems.push('Read every string on the demo screens and set languageReviewed. The diff is not the whole screen.')
    const lang = input.evidence?.language
    if (lang !== 'en' && lang !== 'de') problems.push('Set language to the one language the screens use: en or de.')
    else if (!problems.length && phrases.some(p => p.kind !== 'neutral' && p.kind !== 'mixed' && p.kind !== lang)) {
      problems.push(`The diff’s copy is not ${lang}.`)
    }
  }
  if (problems.length) return result(4, 'fail', problems.join('\n'))
  if (!phrases.length) return result(4, 'pass', 'No user-facing copy in the diff' + (hasDemo ? `, and the screens were read as ${input.evidence?.language}.` : '.'))
  return result(4, 'pass', `Copy in the diff is ${input.evidence?.language ?? (kinds.has('de') ? 'de' : 'en')} (${phrases.length} phrase${phrases.length === 1 ? '' : 's'}).`)
}

interface ParsedBlueprint {
  file: string
  routes: string[]
  codes: string[]
}

function checkBlueprints(input: ChecklistInput, visible: DiffFile[]): CheckResult {
  const parsed: ParsedBlueprint[] = []
  const unreadable: string[] = []
  for (const file of input.repo.blueprintFiles) {
    const source = input.repo.read(file)
    if (source == null) unreadable.push(file)
    else parsed.push({ file, ...parseBlueprintSource(source) })
  }
  if (unreadable.length) return result(5, 'fail', `Could not read ${unreadable.join(', ')}.`)

  const problems: string[] = []
  const changed = new Set(input.files.filter(f => f.status !== 'D').map(f => f.path))
  const touchedBlueprints = input.files.filter(f => f.status !== 'D' && isBlueprintFile(f.path))
  const filesFor = routeFiles(input.repo)

  for (const file of touchedBlueprints) {
    const bp = parsed.find(p => p.file === file.path)
    if (!bp) {
      problems.push(`${file.path} is in the diff but was not readable as a blueprint.`)
      continue
    }
    const missingRoutes = [...new Set(bp.routes.filter(r => filesFor(r).length === 0))]
    if (missingRoutes.length) problems.push(`${file.path} cites routes with no page: ${missingRoutes.join(', ')}`)
    const missingCode = bp.codes.flatMap(codeRefs).filter(ref => !codeRefExists(ref, input.repo.exists))
    if (missingCode.length) problems.push(`${file.path} cites code that is not in the repo: ${[...new Set(missingCode)].join(', ')}`)
    const bumped = file.status === 'A'
      ? /\b20\d{2}-\d{2}-\d{2}\b/.test(input.repo.read(file.path) ?? '')
      : input.added.some(a => a.file === file.path && /\b20\d{2}-\d{2}-\d{2}\b/.test(a.line))
    if (!bumped) problems.push(`${file.path} changed without bumping its updated date (YYYY-MM-DD).`)
  }

  const owned = new Map<string, string[]>()
  for (const screen of visible) {
    for (const bp of parsed) {
      const routeHit = bp.routes.some(r => filesFor(r).includes(screen.path))
      const codeHit = bp.codes.some(code => codeRefs(code).some(ref => ref === screen.path || (!ref.includes('/') && screen.path.endsWith('/' + ref))))
      if (routeHit || codeHit) {
        const list = owned.get(bp.file) ?? []
        list.push(screen.path)
        owned.set(bp.file, list)
      }
    }
  }

  for (const page of input.files.filter(f => f.status === 'A' && isUserVisible(f.path) && f.path.startsWith('app/pages/'))) {
    const covered = parsed.some(bp => bp.routes.some(r => filesFor(r).includes(page.path) || pageServes(page.path, input.repo, r)))
    if (covered) continue
    const why = input.evidence?.newPageNotes?.find(n => n.file === page.path)?.whyNoBlueprint?.trim() ?? ''
    if (why.split(/\s+/).filter(Boolean).length < 4) {
      problems.push(`${page.path} is a new page and no blueprint route points at it. Add the step to the journey blueprint, or set newPageNotes.whyNoBlueprint (at least four words).`)
    }
  }
  for (const [file, screens] of owned) {
    if (changed.has(file)) continue
    const reviewed = input.evidence?.blueprintsReviewed?.includes(file) ?? false
    const note = input.evidence?.blueprintNotes?.find(n => n.file === file)?.unchangedBecause?.trim() ?? ''
    if (!reviewed || note.split(/\s+/).filter(Boolean).length < 4) {
      problems.push(`${screens.join(', ')} ${screens.length === 1 ? 'is' : 'are'} on ${file}, and that blueprint is not in the diff. Read it, update it, or record why it stayed the same (blueprintsReviewed + blueprintNotes, at least four words).`)
    }
  }

  const stale = [...new Set(parsed.flatMap(bp => changed.has(bp.file)
    ? []
    : bp.routes.filter(r => filesFor(r).length === 0).map(r => `${r} (${bp.file})`)))]

  if (problems.length) return result(5, 'fail', problems.join('\n'))
  const note = stale.length
    ? ` Pre-existing routes with no page, not introduced here: ${stale.slice(0, 5).join('; ')}${stale.length > 5 ? `; +${stale.length - 5} more` : ''}.`
    : ''
  if (!owned.size && !touchedBlueprints.length) return result(5, 'pass', `No blueprint-owned screen changed.${note}`)
  return result(5, 'pass', `Blueprints match the screens in this diff.${note}`)
}

/** Pages that serve a blueprint route. Without pageFiles, falls back to the file path the route would have. */
function routeFiles(repo: RepoView): (route: string) => string[] {
  const patternFiles = new Map<string, string[]>()
  if (repo.pageFiles) {
    for (const file of repo.pageFiles) {
      for (const served of routesFromPage(file, repo.read(file) ?? '')) {
        const pattern = routePattern(served)
        if (!pattern) continue
        const list = patternFiles.get(pattern) ?? []
        if (!list.includes(file)) list.push(file)
        patternFiles.set(pattern, list)
      }
    }
    return (route) => {
      const pattern = routePattern(route)
      return pattern ? patternFiles.get(pattern) ?? [] : []
    }
  }
  return (route) => pageCandidates(route).filter(file => repo.exists(file))
}

function pageServes(file: string, repo: RepoView, route: string): boolean {
  const want = routePattern(route)
  if (!want) return false
  return routesFromPage(file, repo.read(file) ?? '').some(served => routePattern(served) === want)
}

function codeRefExists(ref: string, exists: (path: string) => boolean): boolean {
  if (ref.endsWith('.vue') && !ref.includes('/')) return exists(`app/components/${ref}`) || exists(`app/pages/${ref}`)
  return exists(ref)
}

function checkShots(demo: 'na' | 'missing' | 'run', paths: DemoPathEvidence[], repo: RepoView): CheckResult {
  if (demo === 'na') return result(6, 'na', 'No demo path, so there are no screenshots to take.')
  if (demo === 'missing') return result(6, 'fail', 'Capture a desktop screenshot (1280px or wider) and a 375px mobile screenshot for every demo path before the PR is shown.')
  const problems: string[] = []
  for (const path of paths) {
    const desktop = path.screenshots?.desktop
    const mobile = path.screenshots?.mobile
    if (!desktop || !mobile) {
      problems.push(`${path.name}: need both screenshots.desktop and screenshots.mobile.`)
      continue
    }
    if (desktop === mobile) problems.push(`${path.name}: desktop and mobile must be different files.`)
    for (const [label, file] of [['desktop', desktop], ['mobile', mobile]] as const) {
      const issue = mediaIssue(file, 'image', repo)
      if (issue) problems.push(`${path.name} ${label}: ${issue}`)
    }
  }
  if (problems.length) return result(6, 'fail', problems.join('\n'))
  return result(6, 'pass', paths.map(p => `${p.name}: ${p.screenshots.desktop} and ${p.screenshots.mobile}.`).join('\n'))
}

function checkVideo(demo: 'na' | 'missing' | 'run', paths: DemoPathEvidence[], repo: RepoView): CheckResult {
  if (demo === 'na') return result(7, 'na', 'No demo path, so there is no walkthrough to record.')
  if (demo === 'missing') return result(7, 'fail', 'Record a video that walks every demo path by clicking, before the PR is shown.')
  const problems: string[] = []
  for (const path of paths) {
    if (!path.video) problems.push(`${path.name}: video is missing.`)
    else {
      const issue = mediaIssue(path.video, 'video', repo)
      if (issue) problems.push(`${path.name}: ${issue}`)
    }
  }
  if (problems.length) return result(7, 'fail', problems.join('\n'))
  return result(7, 'pass', [...new Set(paths.map(p => p.video))].join('\n'))
}

function mediaIssue(file: string, kind: 'image' | 'video', repo: RepoView): string | null {
  const ext = kind === 'image' ? IMAGE_EXT : VIDEO_EXT
  const min = kind === 'image' ? MIN_SCREENSHOT_BYTES : MIN_VIDEO_BYTES
  if (/^https:\/\//i.test(file)) {
    return ext.test(file.split('?')[0]) ? null : `${file} does not look like a ${kind}.`
  }
  if (!repo.exists(file)) return `${file} does not exist.`
  const size = repo.size(file)
  if (size < min) return `${file} is ${size} bytes, under the ${min}-byte minimum.`
  if (!ext.test(file)) return `${file} is not a ${kind} file.`
  return null
}

export function renderReport(checks: CheckResult[], blocked: boolean): string {
  const lines = [
    '## Pre-PR checklist',
    '',
    blocked
      ? '**Blocked.** Do not mark this pull request ready for review.'
      : '**Clear.** Every check passed or does not apply to this change.',
    '',
    '| # | Check | Result |',
    '| --- | --- | --- |',
    ...checks.map(c => `| ${c.id} | ${c.name} | ${c.status === 'na' ? 'n/a' : c.status} |`),
    '',
  ]
  for (const c of checks) {
    lines.push(`**${c.id}. ${c.name}** — ${c.status === 'na' ? 'n/a' : c.status}`, '', c.detail, '')
  }
  return lines.join('\n')
}

function walkVue(dir: string, rel: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const child = join(dir, name)
    const path = `${rel}/${name}`
    if (statSync(child).isDirectory()) out.push(...walkVue(child, path))
    else if (name.endsWith('.vue')) out.push(path)
  }
  return out
}

function diskRepo(root: string): RepoView {
  const abs = (path: string) => isAbsolute(path) ? path : join(root, path)
  const lib = join(root, 'app/lib')
  const blueprintFiles = existsSync(lib)
    ? readdirSync(lib).filter(name => isBlueprintFile(`app/lib/${name}`)).map(name => `app/lib/${name}`)
    : []
  return {
    blueprintFiles,
    pageFiles: walkVue(join(root, 'app/pages'), 'app/pages'),
    read(path) {
      const file = abs(path)
      return existsSync(file) ? readFileSync(file, 'utf8') : null
    },
    exists(path) { return existsSync(abs(path)) },
    size(path) {
      const file = abs(path)
      return existsSync(file) ? statSync(file).size : 0
    },
  }
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

function collectDiff(base: string, cwd: string): { files: DiffFile[], added: AddedLine[] } {
  const committedStatus = git(['diff', '--name-status', `${base}...HEAD`], cwd)
  const workStatus = git(['diff', '--name-status', 'HEAD'], cwd)
  const untracked = git(['ls-files', '--others', '--exclude-standard'], cwd)
    .split('\n').filter(Boolean)
  const byPath = new Map<string, DiffFile>()
  for (const file of [
    ...parseNameStatus(committedStatus),
    ...parseNameStatus(workStatus),
    ...untracked.map(path => ({ path, status: 'A' as const })),
  ]) byPath.set(file.path, file)

  const added = [
    ...parseUnifiedAdded(git(['diff', '-U0', `${base}...HEAD`], cwd)),
    ...parseUnifiedAdded(git(['diff', '-U0', 'HEAD'], cwd)),
  ]
  for (const path of untracked) {
    const abs = join(cwd, path)
    if (!existsSync(abs) || statSync(abs).isDirectory()) continue
    const text = readFileSync(abs, 'utf8')
    if (text.includes('\0')) continue
    for (const line of text.split('\n')) added.push({ file: path, line })
  }
  return { files: [...byPath.values()], added }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

async function probeUpload(origin: string): Promise<{ status: number, body: string }> {
  const res = await fetch(`${origin}/api/media/image`, { method: 'POST', signal: AbortSignal.timeout(20_000) })
  return { status: res.status, body: (await res.text()).slice(0, 500) }
}

async function main(): Promise<number> {
  const cwd = process.cwd()
  const base = arg('base') ?? 'origin/main'
  try {
    git(['rev-parse', '--verify', base], cwd)
  } catch {
    console.error(`pr-checklist: cannot resolve base ref ${base}`)
    return 2
  }
  let evidence: Evidence | null = null
  const evidencePath = arg('evidence')
  if (evidencePath) {
    try {
      evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as Evidence
    } catch (e) {
      console.error(`pr-checklist: cannot read evidence ${evidencePath}: ${(e as Error).message}`)
      return 1
    }
  }
  const noProbe = process.argv.includes('--no-probe')
  const origin = evidence?.preview?.url ? previewOrigin(evidence.preview.url) : null
  if (evidence && origin && !noProbe && !(evidence.noDemo && !(evidence.demoPaths?.length))) {
    try {
      const probed = await probeUpload(origin)
      evidence = { ...evidence, preview: { ...evidence.preview, uploadStatus: probed.status, uploadBody: probed.body } }
    } catch (e) {
      evidence = { ...evidence, preview: { ...evidence.preview, url: evidence.preview?.url, uploadStatus: 0, uploadBody: (e as Error).message } }
    }
  }
  let diff: { files: DiffFile[], added: AddedLine[] }
  try {
    diff = collectDiff(base, cwd)
  } catch (e) {
    console.error(`pr-checklist: git diff failed: ${(e as Error).message}`)
    return 2
  }
  const { blocked, report } = assessChecklist({ ...diff, evidence, repo: diskRepo(cwd) })
  console.log(report)
  return blocked ? 1 : 0
}

const invoked = process.argv[1] != null && /pr-checklist\.ts$/.test(process.argv[1])
if (invoked) {
  main().then((code) => { process.exit(code) }).catch((e) => {
    console.error(`pr-checklist: ${(e as Error).message}`)
    process.exit(2)
  })
}
