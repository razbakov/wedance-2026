/**
 * RAZ-889 — the My plan badge reads plan.counts; refreshes made while one is in
 * flight collapse into a single follow-up, so the badge ends on the latest answer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'

type D = { resolve: (v: any) => void; reject: (e: any) => void; promise: Promise<any> }
function deferred(): D {
  let d!: Omit<D, 'promise'>
  const promise = new Promise((resolve, reject) => { d = { resolve, reject } })
  return { promise, ...d }
}

let queries: D[] = []
const flush = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  queries = []
  vi.resetModules()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useNuxtApp', () => ({
    $trpc: { plan: { counts: { query: () => { const d = deferred(); queries.push(d); return d.promise } } } },
  }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

const load = async () => (await import('./usePlanCounts')).usePlanCounts()
const c = (total: number, week: number) => ({ festivals: 0, courses: 0, socials: total, week, total })

describe('usePlanCounts', () => {
  it('starts at 0 (matches SSR) and shows the server counts once loaded', async () => {
    const p = await load()
    expect(p.planTotal.value).toBe(0)
    p.refresh()
    queries[0]!.resolve(c(3, 2))
    await flush()
    expect(p.planTotal.value).toBe(3)
    expect(p.planWeek.value).toBe(2)
  })

  it('collapses refreshes made during a fetch into one more fetch, ending on the latest counts', async () => {
    const p = await load()
    p.refresh()
    p.refresh()
    p.refresh()
    expect(queries).toHaveLength(1)
    queries[0]!.resolve(c(1, 1))
    await flush()
    expect(queries).toHaveLength(2)
    queries[1]!.resolve(c(2, 1))
    await flush()
    expect(queries).toHaveLength(2)
    expect(p.planTotal.value).toBe(2)
  })

  it('keeps the last counts when a fetch fails, and reset() clears them on sign-out', async () => {
    const p = await load()
    p.refresh()
    queries[0]!.resolve(c(4, 1))
    await flush()
    p.refresh()
    queries[1]!.reject(new Error('offline'))
    await flush()
    expect(p.planTotal.value).toBe(4)
    p.reset()
    expect(p.planTotal.value).toBe(0)
    expect(p.planWeek.value).toBe(0)
  })
})
