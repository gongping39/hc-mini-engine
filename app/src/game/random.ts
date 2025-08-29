// Linear Congruential Generator (LCG) for deterministic random numbers
// Using parameters: a=1664525, c=1013904223, m=2^32

export interface RNG {
  next(): number;
  nextInt(min: number, max: number): number;
  getSeed(): number;
}

export function makeRng(seed: number): RNG {
  let state = seed >>> 0; // Ensure 32-bit unsigned integer

  return {
    next(): number {
      // LCG formula: state = (a * state + c) % m
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000; // Convert to [0, 1)
    },

    nextInt(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },

    getSeed(): number {
      return seed;
    }
  };
}