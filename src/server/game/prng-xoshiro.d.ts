declare module "mangata-prng-xoshiro" {
  export interface Generator128 {
    // eslint-disable-next-line
    new (lo: number, hi: number): Generator128;
    nextNumber(max: number): number;
  }

  export interface Generator256 {
    // eslint-disable-next-line
    new (seed: bigint): Generator256;
    nextBigInt(max: bigint): bigint;
  }
  export class XoShiRo128StarStar extends Generator128 {}
  export class XoShiRo256StarStar extends Generator256 {}
}
