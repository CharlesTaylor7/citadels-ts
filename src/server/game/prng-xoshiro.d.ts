declare module "prng-xoshiro" {
  export type Generator128 = {
    nextNumber(max: number): number;
  };

  export type Generator256 = {
    nextBigInt(max: bigint): bigint;
  };
  export function XoShiRo128StarStar(seed: bigint): Generator128;
  export function XoShiRo256StarStar(seed: bigint): Generator256;
}
