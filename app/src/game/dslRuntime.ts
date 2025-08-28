import type { GameDSL } from '../dsl/schema';
import type { Game } from 'phaser';

let current: GameDSL;
let gameInstance: Game | null = null;

export function setDSL(dsl: GameDSL): void {
  current = dsl;
}

export function getDSL(): GameDSL {
  if (!current) {
    throw new Error('DSL not initialized. Call setDSL() first.');
  }
  return current;
}

export function isDSLInitialized(): boolean {
  return !!current;
}

export function setGameInstance(game: Game | null): void {
  gameInstance = game;
}

export function applyDslPatch(patch: Partial<GameDSL>): void {
  if (!current) {
    throw new Error('DSL not initialized. Call setDSL() first.');
  }

  // Shallow merge patch into current DSL
  current = { ...current, ...patch };

  // Apply immediate physics changes if game instance exists
  console.log('Game instance exists:', !!gameInstance);
  if (gameInstance) {
    console.log('Game physics exists:', !!(gameInstance as any).physics);
    console.log('Game physics world exists:', !!(gameInstance as any).physics?.world);
    
    // Try different ways to access physics
    const scene = gameInstance.scene.getScene('GameScene');
    console.log('GameScene exists:', !!scene);
    
    if (scene && scene.physics && scene.physics.world) {
      if ('gravityY' in patch && patch.gravityY !== undefined) {
        const physicsWorld = scene.physics.world;
        const oldGravity = physicsWorld.gravity.y;
        physicsWorld.gravity.y = patch.gravityY;
        console.log(`Gravity updated via scene: ${oldGravity} → ${patch.gravityY}`);
        console.log(`Physics world gravity after update:`, physicsWorld.gravity.y);
      }
    } else {
      console.warn('Scene physics not available for immediate gravity update');
    }
  }

  // Restart GameScene if it's active to apply other changes
  if (gameInstance && gameInstance.scene) {
    const gameScene = gameInstance.scene.getScene('GameScene');
    if (gameScene && gameScene.scene.isActive()) {
      gameScene.scene.restart();
    }
  }
}