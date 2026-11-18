import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { jobLink, jobs } from './jobs'
import { uxJourneys } from './ux-map'

const ISSUES = join(process.cwd(), 'docs/issues')
const reference = readFileSync(join(ISSUES, '_reference-cuj-jtbd.md'), 'utf8')

/** `- **J1** — Start dancing …` lines from the reference file's JTBD section. */
function referenceJobs() {
  const section = reference.slice(reference.indexOf('## Jobs To Be Done'))
  return [...section.matchAll(/^- \*\*(J\d+)\*\* — (.+)$/gm)].map(([, id, statement]) => ({ id, statement: statement!.trim() }))
}

/** jtbd + cuj ids from every story's front matter. */
function stories() {
  return readdirSync(ISSUES)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const text = readFileSync(join(ISSUES, f), 'utf8')
      const fm = text.startsWith('---') ? text.slice(3, text.indexOf('\n---', 3)) : ''
      return {
        file: f,
        job: fm.match(/^jtbd:\s*"?(J\d+)/m)?.[1],
        journey: fm.match(/^cuj:\s*"?(C\d+)/m)?.[1],
      }
    })
}

describe('jobs (J1–J7)', () => {
  it('lists every job in the reference file, word for word and in order', () => {
    const ref = referenceJobs()
    expect(ref.length).toBeGreaterThan(0)
    expect(jobs.map(j => ({ id: j.id, statement: j.statement }))).toEqual(ref)
  })

  it('knows every job a backlog story names', () => {
    const known = new Set(jobs.map(j => j.id))
    const unknown = stories().filter(s => s.job && !known.has(s.job as never)).map(s => `${s.file}: ${s.job}`)
    expect(unknown).toEqual([])
  })

  it('lists exactly the journeys of the stories tagged with each job', () => {
    const tagged = new Map<string, Set<string>>()
    for (const s of stories()) {
      if (!s.job || !s.journey) continue
      if (!tagged.has(s.job)) tagged.set(s.job, new Set())
      tagged.get(s.job)!.add(s.journey)
    }
    for (const job of jobs)
      expect([...job.journeys].sort(), job.id).toEqual([...(tagged.get(job.id) ?? [])].sort())
  })

  it('gives every UX map journey a job that lists that journey', () => {
    for (const j of uxJourneys) {
      const job = jobs.find(x => x.id === j.jobId)
      expect(job, j.id).toBeDefined()
      expect(job!.journeys, `${j.id} → ${j.jobId}`).toContain(j.id)
      expect(j.job).toBe(job!.statement)
    }
  })

  it('links each job to its anchor on /docs/jobs', () => {
    expect(jobLink('J3')).toBe('/docs/jobs#j3')
  })
})
