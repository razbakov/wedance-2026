import { describe, it, expect } from 'vitest'
import { expectedScore, updateElo, K_FACTOR, INITIAL_ELO } from './elo'

describe('expectedScore', () => {
  it('is 0.5 for equal ratings', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10)
  })

  it('favours the higher-rated player', () => {
    expect(expectedScore(1600, 1400)).toBeGreaterThan(0.5)
    expect(expectedScore(1400, 1600)).toBeLessThan(0.5)
  })

  it('is symmetric — the two expectations sum to 1', () => {
    const a = expectedScore(1720, 1480)
    const b = expectedScore(1480, 1720)
    expect(a + b).toBeCloseTo(1, 10)
  })

  it('matches the known 200-point-gap value (~0.76)', () => {
    // 1 / (1 + 10^(-200/400)) = 0.7597...
    expect(expectedScore(1600, 1400)).toBeCloseTo(0.7597, 3)
  })
})

describe('updateElo', () => {
  it('splits the full K between equally rated players', () => {
    // Equal ratings → expected 0.5 → winner +16, loser -16 with K=32.
    const { winner, loser } = updateElo(INITIAL_ELO, INITIAL_ELO)
    expect(winner).toBe(1516)
    expect(loser).toBe(1484)
  })

  it('conserves total rating (winner gain == loser loss)', () => {
    const wr = 1532
    const lr = 1487
    const { winner, loser } = updateElo(wr, lr)
    expect(winner - wr).toBe(lr - loser)
  })

  it('rewards an upset more than an expected win', () => {
    // Underdog (1400) beats favourite (1600): expected win = 1/(1+10^(200/400)) ≈ 0.24,
    // so gain ≈ 32 * 0.76 ≈ 24.
    const upset = updateElo(1400, 1600)
    const upsetGain = upset.winner - 1400
    // Favourite (1600) beats underdog (1400): expected ≈ 0.76, gain ≈ 32*0.24 ≈ 8.
    const expected = updateElo(1600, 1400)
    const expectedGain = expected.winner - 1600
    expect(upsetGain).toBeGreaterThan(expectedGain)
    expect(upsetGain).toBe(24)
    expect(expectedGain).toBe(8)
  })

  it('never lets the loser gain rating', () => {
    const { loser } = updateElo(1500, 1500)
    expect(loser).toBeLessThan(1500)
  })

  it('respects a custom K factor', () => {
    const withDefault = updateElo(1500, 1500)
    const withHalf = updateElo(1500, 1500, K_FACTOR / 2)
    expect(withDefault.winner - 1500).toBe(16)
    expect(withHalf.winner - 1500).toBe(8)
  })
})
