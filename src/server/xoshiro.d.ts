declare module "xoshiro" {
  export type Algorithm =
    | "256+"
    | "256++"
    | "256**"
    | "512+"
    | "512++"
    | "512**";

  export function create(type: Algorithm, seed: Buffer): PRNG;

  // something impossible and opaque will unify with nothing
  export type PrngState = number & string & { __brand__: "state" };

  export interface PRNG {
    roll(): number;
    state: PrngState;
  }
}
