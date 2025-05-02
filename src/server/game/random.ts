import crypto from "node:crypto";
// import xoshiro, { type PRNG } from "@apocentre/xoshiro";

/**
 * Shuffle an array in-place
 * @param array Array to shuffle
 * @param rng Random number generator
 */
export function shuffle<T>(array: T[], rng: RNG): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
}
export type RNG = (max: number) => number;

export function systemRandom(max: number): number {
  return Math.floor(Math.random() * max);
}

export function newSeed(): Seed {
  return crypto.randomBytes(32).toString("hex");
}

export function newPrng(seed: Seed): PRNG {
  const prng = xoshiro.create("256+", Buffer.from(seed));
  console.log(prng.state);
  return prng;
}

export function asRng(prng: PRNG): RNG {
  return (n) => prng.roll() % n;
}

export type Seed = string;
