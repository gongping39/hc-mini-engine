import type { GameSpec } from '../schema/types';
import type { GameDSL } from '../dsl/schema';
import { setDSL } from '../game/dslRuntime';

export function applySpec(spec: GameSpec): void {
  // Convert GameSpec to GameDSL format
  const dsl: GameDSL = {
    // Map gravity directly
    gravityY: spec.gravity,
    
    // Map jumpForce to playerJump (keeping negative values as-is)
    playerJump: spec.jumpForce,
    
    // Map scrollSpeed to obstacleSpeed (negative for leftward movement)
    obstacleSpeed: spec.scrollSpeed,
    
    // Convert spawnRate to spawnIntervalMs
    // spawnRate is obstacles per second, so interval = 1000 / rate
    spawnIntervalMs: spec.obstacle ? Math.round(1000 / spec.obstacle.spawnRate) : 1250,
    
    // Keep existing loseBelowY default
    loseBelowY: -100
  };

  // Apply density adjustments from levelSections if available
  if (spec.levelSections && spec.levelSections.length > 0) {
    // Use the first section's density as a base multiplier
    const firstSection = spec.levelSections[0];
    if (firstSection.density !== 1.0) {
      // Adjust spawn interval based on density (higher density = shorter interval)
      dsl.spawnIntervalMs = Math.round(dsl.spawnIntervalMs / firstSection.density);
    }
  }

  console.log('Applied GameSpec:', {
    spec: spec.title || 'Untitled Spec',
    dsl,
    originalSpec: spec
  });

  // Set the converted DSL
  setDSL(dsl);
}