/**
 * Shuffle an array in-place
 * @param array Array to shuffle
 * @param rng Random number generator
 */
export function shuffle<T>(array: T[], rng: RNG = randomInt): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
}
export type RNG = (max: number) => number;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}
