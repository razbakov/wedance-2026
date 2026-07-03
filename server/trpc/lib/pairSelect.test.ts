import { describe, it, expect } from 'vitest'
import { pairKey, allPairs, selectNextPair } from './pairSelect'

describe('pairKey', () => {
  it('is order-independent', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'))
  })

  it('distinguishes different pairs', () => {
    expect(pairKey('a', 'b')).not.toBe(pairKey('a', 'c'))
  })
})

describe('allPairs', () => {
  it('returns n choose 2 pairs', () => {
    expect(allPairs(['a', 'b', 'c', 'd'])).toHaveLength(6)
  })

  it('returns nothing for fewer than two ids', () => {
    expect(allPairs([])).toEqual([])
    expect(allPairs(['a'])).toEqual([])
  })
})

describe('selectNextPair', () => {
  it('returns null when fewer than two videos exist', () => {
    expect(selectNextPair([], new Set())).toBeNull()
    expect(selectNextPair(['only'], new Set())).toBeNull()
  })

  it('returns the two ids when exactly two exist and none seen', () => {
    const pair = selectNextPair(['a', 'b'], new Set(), () => 0)
    expect(pair).not.toBeNull()
    expect(new Set(pair!)).toEqual(new Set(['a', 'b']))
  })

  it('never returns a pair the session has already seen', () => {
    const ids = ['a', 'b', 'c']
    // Seen every pair except (a,c).
    const seen = new Set([pairKey('a', 'b'), pairKey('b', 'c')])
    // Run many times with different RNG values — must always be (a,c).
    for (let i = 0; i < 20; i++) {
      const rand = () => i / 20
      const pair = selectNextPair(ids, seen, rand)
      expect(pair).not.toBeNull()
      expect(new Set(pair!)).toEqual(new Set(['a', 'c']))
    }
  })

  it('returns null once every distinct pair has been seen', () => {
    const ids = ['a', 'b', 'c']
    const seen = new Set([
      pairKey('a', 'b'),
      pairKey('a', 'c'),
      pairKey('b', 'c'),
    ])
    expect(selectNextPair(ids, seen, () => 0)).toBeNull()
  })

  it('shuffles left/right position based on the RNG', () => {
    // rand() is called twice: once to pick the pair (0 → first candidate),
    // once to decide order. <0.5 keeps order, >=0.5 swaps.
    const ids = ['a', 'b']
    const keepOrder = selectNextPair(ids, new Set(), makeSeq([0, 0.1]))
    const swapOrder = selectNextPair(ids, new Set(), makeSeq([0, 0.9]))
    expect(keepOrder).toEqual(['a', 'b'])
    expect(swapOrder).toEqual(['b', 'a'])
  })
})

/** Deterministic RNG that yields the given values in sequence. */
function makeSeq(values: number[]): () => number {
  let i = 0
  return () => values[i++] ?? 0
}
