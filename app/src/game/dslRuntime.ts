import type { GameDSL } from '../dsl/schema';

let current: GameDSL;

export function setDSL(dsl: GameDSL): void {
  current = dsl;
}

export function getDSL(): GameDSL {
  if (!current) {
    throw new Error('DSL not initialized. Call setDSL() first.');
  }
  return current;
}