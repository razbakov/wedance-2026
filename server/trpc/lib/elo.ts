/**
 * ELO / Bradley-Terry rating for pairwise city-video voting.
 *
 * Every approved video starts at 1500. On each pairwise vote both videos are
 * updated: the expected score is the logistic of the rating difference, and
 * each side moves toward its outcome (1 for the winner, 0 for the loser) scaled
 * by K. This is a proper skill-ranking signal — unlike raw vote counts, a video
 * that only ever beats weak opponents cannot out-rank one that beats strong
 * opponents.
 *
 * Pure, dependency-free, and unit-tested (`elo.test.ts`). Keep it that way — the
 * router imports these functions but adds no math of its own.
 */

/** Standard chess K-factor. Larger = ratings move faster per vote. */
export const K_FACTOR = 32

/** Every approved video enters the pool at this rating. */
export const INITIAL_ELO = 1500

/**
 * Expected score for player A against player B, in [0, 1].
 * 0.5 means evenly matched; >0.5 means A is favoured.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
}

export interface EloResult {
  winner: number
  loser: number
}

/**
 * Compute the new ratings after `winnerRating` beats `loserRating`.
 * Returns rounded integer ratings (we store ELO as an integer column).
 *
 * The total rating in the system is conserved to within rounding: whatever the
 * winner gains, the loser loses.
 */
export function updateElo(
  winnerRating: number,
  loserRating: number,
  k: number = K_FACTOR,
): EloResult {
  const expectedWinner = expectedScore(winnerRating, loserRating)
  const expectedLoser = expectedScore(loserRating, winnerRating)

  const winner = Math.round(winnerRating + k * (1 - expectedWinner))
  const loser = Math.round(loserRating + k * (0 - expectedLoser))

  return { winner, loser }
}
