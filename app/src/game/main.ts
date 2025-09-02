import { Game, type Types } from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { loadDSL } from '../dsl/loader';
import { setDSL, setGameInstance, setSeed, getDSL } from './dslRuntime';
import { applySpec } from '../runtime/applySpec';
import { getSpec } from '../runtime/specLoader';
import { recorder, player, type Replay } from '../replay';
import { setTelemetrySeed, setTelemetryLevel } from '../telemetry/client';

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
const replayParam = urlParams.get('replay');
const seed = seedParam ? parseInt(seedParam, 10) : Date.now();

// Initialize game configuration
async function initializeGame() {
  if (specParam) {
    try {
      // Load spec using specLoader (supports both /specs/ and bundled)
      const spec = await getSpec(specParam);
      applySpec(spec);
      console.log(`Game initialized with '${specParam}' spec and seed:`, seed);
    } catch (error) {
      console.error(`Failed to load '${specParam}' spec, falling back to DSL:`, error);
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
  
  // Set telemetry context
  setTelemetrySeed(seed);
  if (specParam) {
    setTelemetryLevel(specParam);
  }
}

// Initialize before creating game
await initializeGame();

// Handle replay functionality
async function handleReplay() {
  if (replayParam) {
    try {
      // Decode base64 replay data
      const replayData = atob(replayParam);
      const replay: Replay = JSON.parse(replayData);
      
      console.log('Starting replay mode with seed:', replay.seed);
      setSeed(replay.seed);
      
      // Wait for game to start, then play replay
      setTimeout(async () => {
        await player.play(replay, (type, code) => {
          console.log('Replay event:', type, code);
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to load replay:', error);
    }
  } else {
    // Normal mode - start recording
    recorder.start(seed);
  }
}

await handleReplay();

// Expose replay functions for development
(window as any).hcReplay = {
  record: () => recorder.start(seed),
  stop: () => recorder.stop(),
  play: (replayData: string) => {
    try {
      const replay: Replay = JSON.parse(atob(replayData));
      return player.play(replay, (type, code) => {
        console.log('Manual replay event:', type, code);
      });
    } catch (error) {
      console.error('Failed to play manual replay:', error);
    }
  }
};

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