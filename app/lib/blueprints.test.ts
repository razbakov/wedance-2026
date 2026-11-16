import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blueprints } from './blueprints'
import { jobById, jobs } from './jobs'

describe('blueprint index', () => {
  it('lists each blueprint under its job’s flows', () => {
    for (const b of blueprints)
      expect(jobById(b.job).flows.map(f => f.to)).toContain(b.to)
  })

  it('lists every blueprint a job links to', () => {
    const listed = new Set(blueprints.map(b => b.to))
    const linked = jobs.flatMap(j => j.flows.map(f => f.to)).filter(to => to.startsWith('/docs/blueprints/'))
    for (const to of linked) expect(listed).toContain(to)
  })

  it('has a page for each blueprint', () => {
    for (const b of blueprints)
      expect(existsSync(join(process.cwd(), 'app/pages', `${b.to}.vue`))).toBe(true)
  })
})
