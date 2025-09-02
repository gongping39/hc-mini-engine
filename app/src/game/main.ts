import { Game, type Types } from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { loadDSL } from '../dsl/loader';
import { setDSL, setGameInstance, setSeed, getDSL } from './dslRuntime';
import { applySpec } from '../runtime/applySpec';

export function setSeededRandom(seed: number): void {
  Math.random = (() => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();
}

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const seedParam = urlParams.get('seed');
const specParam = urlParams.get('spec');
const seed = seedParam ? parseInt(seedParam, 10) : Date.now();

// Initialize game configuration
async function initializeGame() {
  if (specParam === 'example') {
    try {
      // Import and apply example spec
      const exampleSpec = await import('../schema/example.json');
      const spec = exampleSpec.default as import('../schema/types').GameSpec;
      applySpec(spec);
      console.log('Game initialized with example spec and seed:', seed);
    } catch (error) {
      console.error('Failed to load example spec, falling back to DSL:', error);
      const dsl = loadDSL();
      setDSL(dsl);
    }
  } else {
    // Use traditional DSL configuration
    const dsl = loadDSL();
    setDSL(dsl);
    console.log('Game initialized with DSL and seed:', seed);
  }
  
  setSeed(seed);
}

// Initialize before creating game
await initializeGame();

const createConfig = (): Types.Core.GameConfig => {
  const currentDsl = getDSL();
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-root',
    backgroundColor: '#2c3e50',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: currentDsl.gravityY },
        debug: false
      }
    },
    scene: [PreloadScene, GameScene, UIScene]
  };
};

const config = createConfig();

export const game = new Game(config);

// Register game instance for runtime DSL updates
setGameInstance(game);
console.log('Game instance registered for DSL updates');

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
  setGameInstance(null);
  game.destroy(true);
});