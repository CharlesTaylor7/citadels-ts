declare module "@apocentre/xoshiro" {
  export default {
    create: (type: Algorithm, seed: Buffer) => PRNG,
  };

  export type Algorithm =
    | "256+"
    | "256++"
    | "256**"
    | "512+"
    | "512++"
    | "512**";

  // something impossible and opaque will unify with nothing
  export type PrngState = number & string & { __brand__: "state" };

  export interface PRNG {
    roll(): number;
    state: PrngState;
  }
}
