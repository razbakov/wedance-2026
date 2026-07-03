/**
 * Pair selection + dedupe for the Video-of-the-Day pairwise vote.
 *
 * A "pair" is an unordered set of two video ids. Within one anonymous session
 * we never show the same pair twice. This module is pure and unit-tested
 * (`pairSelect.test.ts`); the router feeds it the approved-video ids and the
 * set of pairs the session has already voted on, and gets back the next pair
 * (or null when the session has exhausted every distinct pair).
 */

/**
 * Canonical, order-independent key for a pair of ids.
 * `pairKey(a, b) === pairKey(b, a)`.
 */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`
}

/**
 * All distinct unordered pairs from a list of ids (combinations, n choose 2).
 */
export function allPairs(ids: string[]): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      out.push([ids[i]!, ids[j]!])
    }
  }
  return out
}

/**
 * Pick the next pair for a session, skipping any pair already voted on.
 *
 * @param ids           approved video ids in the city+month pool
 * @param seenPairKeys  set of `pairKey` values the session has already voted on
 * @param rand          injectable RNG in [0,1) for deterministic tests
 * @returns the two ids to show (shuffled), or null if:
 *          - fewer than 2 videos exist, or
 *          - every distinct pair has already been seen.
 */
export function selectNextPair(
  ids: string[],
  seenPairKeys: Set<string>,
  rand: () => number = Math.random,
): [string, string] | null {
  if (ids.length < 2) return null

  const candidates = allPairs(ids).filter(([a, b]) => !seenPairKeys.has(pairKey(a, b)))
  if (candidates.length === 0) return null

  const chosen = candidates[Math.floor(rand() * candidates.length)]!

  // Randomise left/right so position carries no bias.
  return rand() < 0.5 ? [chosen[0], chosen[1]] : [chosen[1], chosen[0]]
}
