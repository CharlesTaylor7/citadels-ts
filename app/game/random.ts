/**
   * Shuffle an array in-place
   * @param array Array to shuffle
   * @param rng Random number generator
   */
  export function shuffle<T>(array: T[], rng: () => number): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }