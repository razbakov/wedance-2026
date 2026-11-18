/**
 * The pre-PR checklist blocks review (RAZ-1073). These pin the seven gates
 * against the PR 674 walkthrough: a URL edit, no BDD, a 503 upload, mixed
 * German and English, a stale blueprint, and missing screenshots or video.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assessChecklist,
  classifyPhrase,
  codeRefs,
  isBlueprintFile,
  isUserVisible,
  pageCandidates,
  parseBlueprintSource,
  parseNameStatus,
  parseUnifiedAdded,
  routePattern,
  routesFromPage,
  stepEditsUrl,
  uploadVerdict,
  type ChecklistInput,
  type DemoPathEvidence,
  type Evidence,
  type RepoView,
} from './pr-checklist'

const FEATURE = `Feature: Meet ritual

  Scenario: Book the meetup after a match
    When I open My plan
    And I click the dance friend
    Then I can book the meetup
`
const BLUEPRINT = `
export const MEET_BLUEPRINT_UPDATED = '2026-11-18'
export const meetSteps = [
  { id: 'deck', route: '/meet', code: 'MeetDeckCard.vue' },
  { id: 'match', route: '/my-plan', code: 'server/utils/meetMatches.ts' },
]
`
const ENGLISH = [
  { file: 'app/pages/meet.vue', line: '<p>Save your dance card</p>' },
]
const MIXED = [
  { file: 'app/pages/meet.vue', line: '<p>Add deine Stadt hinzu</p>' },
]

function repo(extra: Record<string, string | true> = {}): RepoView {
  const files = new Map<string, string>([
    ['e2e/features/meet-ritual.feature', FEATURE],
    ['app/lib/blueprint-meet-friends.ts', BLUEPRINT],
    ['app/pages/meet.vue', '<template></template>'],
    ['app/pages/my-plan.vue', '<template></template>'],
    ['app/components/MeetDeckCard.vue', '<template></template>'],
    ['server/utils/meetMatches.ts', 'export {}'],
    ['/tmp/desktop.png', 'x'.repeat(9000)],
    ['/tmp/mobile.png', 'x'.repeat(9000)],
    ['/tmp/walk.mp4', 'x'.repeat(11000)],
  ])
  for (const [path, value] of Object.entries(extra)) files.set(path, value === true ? '' : value)
  return {
    blueprintFiles: [...files.keys()].filter(p => p.startsWith('app/lib/blueprint-')),
    read: path => files.has(path) ? files.get(path)! : null,
    exists: path => files.has(path),
    size: path => files.get(path)?.length ?? 0,
  }
}

function demo(over: Partial<DemoPathEvidence> = {}): DemoPathEvidence {
  return {
    name: 'Book the meetup',
    steps: [
      'Open the preview https://pr-674.dev.wedance.vip/',
      'Click Your dance friends on My plan',
      'Click Book the meetup',
    ],
    clickedOnly: true,
    bddFeature: 'e2e/features/meet-ritual.feature',
    bddScenario: 'Book the meetup after a match',
    screenshots: { desktop: '/tmp/desktop.png', mobile: '/tmp/mobile.png' },
    video: '/tmp/walk.mp4',
    ...over,
  }
}

function evidence(over: Partial<Evidence> = {}): Evidence {
  return {
    demoPaths: [demo()],
    language: 'en',
    languageReviewed: true,
    preview: {
      url: 'https://pr-674.dev.wedance.vip',
      uploadStatus: 400,
      uploadBody: 'No form data provided.',
      dataNotes: 'Both new dancers have a photo, Munich, a role and two dances, and they see each other on Meet.',
    },
    blueprintsReviewed: ['app/lib/blueprint-meet-friends.ts'],
    blueprintNotes: [{
      file: 'app/lib/blueprint-meet-friends.ts',
      unchangedBecause: 'The copy change does not move a step, route or mark on the meet blueprint.',
    }],
    ...over,
  }
}

function input(over: Partial<ChecklistInput> = {}): ChecklistInput {
  return {
    files: [{ path: 'app/pages/meet.vue', status: 'M' }],
    added: ENGLISH,
    evidence: evidence(),
    repo: repo(),
    ...over,
  }
}

describe('classifyPhrase', () => {
  it('treats a German article inside English copy as mixed', () => {
    expect(classifyPhrase('Add deine Stadt hinzu')).toBe('mixed')
  })
  it('keeps a German name inside an English sentence', () => {
    expect(classifyPhrase('Dancers in München')).toBe('en')
  })
  it('recognises German and English on their own', () => {
    expect(classifyPhrase('Foto hochladen')).toBe('de')
    expect(classifyPhrase('Save your dance card')).toBe('en')
  })
})

describe('stepEditsUrl', () => {
  it('allows opening the preview origin and nothing further', () => {
    expect(stepEditsUrl('Open the preview https://pr-674.dev.wedance.vip/', 0)).toBeNull()
    expect(stepEditsUrl('Open https://pr-674.dev.wedance.vip/meet/ritual', 0)).toMatch(/meet/)
  })
  it('rejects a path typed on a later step', () => {
    expect(stepEditsUrl('Go to /meet/ritual', 1)).toMatch(/meet/)
    expect(stepEditsUrl('Click Book the meetup', 2)).toBeNull()
  })
})

describe('uploadVerdict', () => {
  it('accepts a configured endpoint that rejected an empty body', () => {
    expect(uploadVerdict(400, 'No form data provided.')).toBeNull()
    expect(uploadVerdict(401, 'Unauthorized')).toBeNull()
  })
  it('rejects the unconfigured preview from the RAZ-1071 walkthrough', () => {
    expect(uploadVerdict(503, 'Image upload is not configured.')).toMatch(/not configured/i)
    expect(uploadVerdict(400, 'Image upload is not configured.')).toMatch(/not configured/i)
  })
})

describe('parsers', () => {
  it('reads name-status, including renames', () => {
    expect(parseNameStatus('M\tapp/pages/meet.vue\nR100\told.vue\tapp/pages/meet.vue\n')).toEqual([
      { path: 'app/pages/meet.vue', status: 'M' },
      { path: 'old.vue', status: 'D' },
      { path: 'app/pages/meet.vue', status: 'A' },
    ])
  })
  it('keeps only added lines, per file', () => {
    const diff = [
      'diff --git a/app/pages/meet.vue b/app/pages/meet.vue',
      '--- a/app/pages/meet.vue',
      '+++ b/app/pages/meet.vue',
      '-old',
      '+Save your dance card',
      '+++ /dev/null',
      '+nope',
    ].join('\n')
    expect(parseUnifiedAdded(diff)).toEqual([{ file: 'app/pages/meet.vue', line: 'Save your dance card' }])
  })
  it('maps blueprint routes onto page files', () => {
    expect(pageCandidates('/meet')).toContain('app/pages/meet.vue')
    expect(pageCandidates('/@handle')).toContain('app/pages/@[handle].vue')
    expect(pageCandidates('/cities?style=Salsa')).toContain('app/pages/cities/index.vue')
    expect(pageCandidates('/my-plan#courses')).toContain('app/pages/my-plan.vue')
    expect(parseBlueprintSource(BLUEPRINT).routes).toEqual(['/meet', '/my-plan'])
    expect(codeRefs('MeetDeckCard.vue · server/utils/meetMatches.ts')).toEqual([
      'server/utils/meetMatches.ts',
      'MeetDeckCard.vue',
    ])
  })
})

describe('routePattern', () => {
  it('treats param names, the profile @, query and hash as the same page', () => {
    expect(routePattern('/@[handle]/book')).toBe(routePattern('/@:handle/book'))
    expect(routePattern('/ask/[token]')).toBe(routePattern('/ask/:token'))
    expect(routePattern('/business/network/[handle]/contacts')).toBe(routePattern('/business/network/[username]/contacts'))
    expect(routePattern('/my-plan#courses')).toBe('/my-plan')
    expect(routePattern('/@handle')).toBe('/@*')
  })

  it('reads a custom path and an alias off definePageMeta', () => {
    const book = "definePageMeta({ layout: false, path: '/@:handle/book' })"
    expect(routesFromPage('app/pages/book/[handle].vue', book).map(routePattern)).toContain('/@*/book')
    const ask = "definePageMeta({ layout: false, alias: ['/ask/:token'] })"
    expect(routesFromPage('app/pages/confirm/[token].vue', ask).map(routePattern)).toContain('/ask/*')
  })
})

describe('assessChecklist', () => {
  it('passes a walkthrough that would have survived the PR 674 review', () => {
    const result = assessChecklist(input())
    expect(result.blocked).toBe(false)
    expect(result.checks.map(c => c.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass'])
    expect(result.report).toContain('**Clear.**')
  })

  it('blocks when the path was opened by editing the URL', () => {
    const result = assessChecklist(input({
      evidence: evidence({ demoPaths: [demo({ steps: ['Open https://pr-674.dev.wedance.vip/meet/ritual', 'Click Book'] })] }),
    }))
    expect(result.checks[0].status).toBe('fail')
    expect(result.blocked).toBe(true)
  })

  it('blocks a screen with no demo evidence', () => {
    const result = assessChecklist(input({ evidence: null }))
    expect(result.blocked).toBe(true)
    expect(result.checks.filter(c => c.id !== 4 && c.id !== 5).every(c => c.status === 'fail')).toBe(true)
  })

  it('does not apply the demo checks to a change with no screen', () => {
    const result = assessChecklist(input({
      files: [{ path: 'scripts/ci/pr-checklist.ts', status: 'A' }],
      added: [],
      evidence: { noDemo: true, noDemoReason: 'Checker and skill only. No page or feature component changed.' },
    }))
    expect(result.blocked).toBe(false)
    expect(result.checks.map(c => c.status)).toEqual(['na', 'na', 'na', 'pass', 'pass', 'na', 'na'])
  })

  it('refuses noDemo when a page changed', () => {
    const result = assessChecklist(input({
      evidence: { noDemo: true, noDemoReason: 'It is only a small copy tweak on the meet page.' },
    }))
    expect(result.checks[0].status).toBe('fail')
    expect(result.checks[0].detail).toMatch(/meet\.vue/)
  })

  it('blocks mixed German and English in the same diff', () => {
    const result = assessChecklist(input({ added: [...ENGLISH, ...MIXED] }))
    expect(result.checks[3].status).toBe('fail')
    expect(result.checks[3].detail).toMatch(/deine Stadt/)
  })

  it('blocks a preview whose image upload is not configured', () => {
    const result = assessChecklist(input({
      evidence: evidence({
        preview: {
          url: 'https://pr-674.dev.wedance.vip',
          uploadStatus: 503,
          uploadBody: 'Image upload is not configured.',
          dataNotes: 'Signed up two dancers but neither could upload a photo.',
        },
      }),
    }))
    expect(result.checks[2].status).toBe('fail')
    expect(result.checks[2].detail).toMatch(/not configured/i)
  })

  it('blocks a cited scenario that is not in the feature file', () => {
    const result = assessChecklist(input({
      evidence: evidence({ demoPaths: [demo({ bddScenario: 'This scenario was never written' })] }),
    }))
    expect(result.checks[1].status).toBe('fail')
  })

  it('requires a feature file in the diff when a page is added', () => {
    const result = assessChecklist(input({
      files: [
        { path: 'app/pages/meet/ritual.vue', status: 'A' },
        { path: 'app/pages/meet.vue', status: 'M' },
      ],
    }))
    expect(result.checks[1].status).toBe('fail')
    expect(result.checks[1].detail).toMatch(/ritual\.vue/)
  })

  it('blocks a blueprint-owned page that was not re-read', () => {
    const result = assessChecklist(input({
      evidence: evidence({ blueprintsReviewed: [], blueprintNotes: [] }),
    }))
    expect(result.checks[4].status).toBe('fail')
    expect(result.checks[4].detail).toMatch(/blueprint-meet-friends/)
  })

  it('blocks a blueprint edit that cites a missing page or forgets the date', () => {
    const broken = BLUEPRINT.replace("route: '/meet'", "route: '/meet/ritual'")
    const result = assessChecklist(input({
      files: [{ path: 'app/lib/blueprint-meet-friends.ts', status: 'M' }],
      added: [{ file: 'app/lib/blueprint-meet-friends.ts', line: "route: '/meet/ritual'," }],
      evidence: evidence(),
      repo: repo({ 'app/lib/blueprint-meet-friends.ts': broken }),
    }))
    expect(result.checks[4].status).toBe('fail')
    expect(result.checks[4].detail).toMatch(/\/meet\/ritual/)
    expect(result.checks[4].detail).toMatch(/updated date/)
  })

  it('blocks screenshots that are the same file, and a missing video', () => {
    const result = assessChecklist(input({
      evidence: evidence({
        demoPaths: [demo({
          screenshots: { desktop: '/tmp/desktop.png', mobile: '/tmp/desktop.png' },
          video: '/tmp/missing.mp4',
        })],
      }),
    }))
    expect(result.checks[5].status).toBe('fail')
    expect(result.checks[6].status).toBe('fail')
  })
})

describe('isUserVisible', () => {
  it('counts product screens and not docs or the design-system primitives', () => {
    expect(isUserVisible('app/pages/meet.vue')).toBe(true)
    expect(isUserVisible('app/pages/sketches/meet-matches.vue')).toBe(true)
    expect(isUserVisible('app/components/MeetDeckCard.vue')).toBe(true)
    expect(isUserVisible('app/pages/docs/blueprints/meet-friends.vue')).toBe(false)
    expect(isUserVisible('app/components/ui/button.vue')).toBe(false)
  })
})

function walkVue(dir: string, rel: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const child = join(dir, name)
    const path = `${rel}/${name}`
    if (statSync(child).isDirectory()) out.push(...walkVue(child, path))
    else if (name.endsWith('.vue')) out.push(path)
  }
  return out
}

describe('blueprint routes on this repo', () => {
  it('resolves the meet journey pages the blueprint names', () => {
    const source = readFileSync('app/lib/blueprint-meet-friends.ts', 'utf8')
    const { routes } = parseBlueprintSource(source)
    for (const route of ['/meet', '/my-plan', '/settings', '/onboarding', '/events/[id]']) {
      expect(routes).toContain(route)
      expect(pageCandidates(route).some(p => existsSync(p))).toBe(true)
    }
  })

  it('finds a page for every blueprint route, including custom paths and aliases', () => {
    const patterns = new Set<string>()
    for (const file of walkVue('app/pages', 'app/pages')) {
      for (const route of routesFromPage(file, readFileSync(file, 'utf8'))) {
        const pattern = routePattern(route)
        if (pattern) patterns.add(pattern)
      }
    }
    const missing: string[] = []
    for (const name of readdirSync('app/lib')) {
      const file = `app/lib/${name}`
      if (!isBlueprintFile(file)) continue
      for (const route of parseBlueprintSource(readFileSync(file, 'utf8')).routes) {
        const pattern = routePattern(route)
        if (pattern && !patterns.has(pattern)) missing.push(`${route} (${name})`)
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })
})
