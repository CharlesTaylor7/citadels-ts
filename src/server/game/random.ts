//https://prng.di.unimi.it/
//https://www.npmjs.com/package/prng-xoshiro

import crypto from "node:crypto";
import { XoShiRo128StarStar, type Generator128 } from "prng-xoshiro";

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
  return crypto.randomInt(max);
}

type Seed = bigint;
type PRNG = Generator128;
export function newSeed(): Seed {
  return BigInt("0x" + crypto.randomBytes(8).toString("hex"));
}

export function newPrng(seed: Seed): PRNG {
  return XoShiRo128StarStar(seed);
}

export function asRng(prng: PRNG): RNG {
  return prng.nextNumber;
}

const prng = newPrng(newSeed());
console.log(prng);
console.log(prng.nextNumber(10));
console.log(prng.nextNumber(10));
console.log(prng.nextNumber(10));
console.log(prng.nextNumber(10));
