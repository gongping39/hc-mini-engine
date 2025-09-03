import { Game, type Types } from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { loadDSL } from '../dsl/loader';
import { setDSL, setGameInstance, setSeed, getDSL } from './dslRuntime';
import { applySpec } from '../runtime/applySpec';
import { getSpec, type SpecLoadResult } from '../runtime/specLoader';
import { applyAB } from "../runtime/ab";
import { recorder, player, dispatchToGame, fromBase64, type Replay } from '../replay';
// Telemetry is now handled within scenes

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

// Global variable to store spec load result for UI
let specLoadResult: SpecLoadResult | null = null;

export function getSpecLoadResult(): SpecLoadResult | null {
  return specLoadResult;
}

async function bootFromQuery() {
  const params = new URLSearchParams(location.search);
  const name = params.get("spec");
  if (!name) return;
  
  try {
    const result = await getSpec(name);
    specLoadResult = result;
    
    let spec = result.spec;
    const abInfo = applyAB(spec);
    spec = abInfo.spec;
    applySpec(spec);
    
    console.log("[spec] loaded:", name, "source:", result.source, "ab:", abInfo.ab ?? "-");
    
    if (!result.validation.success) {
      console.warn("[spec] validation warnings:", result.validation.error);
    }
  } catch (e) {
    console.warn("[spec] load failed:", name, e);
    specLoadResult = {
      spec: {} as any, // This should be handled by validator
      source: 'fallback',
      validation: { success: false, error: String(e), fallback: {} as any }
    };
  }
}

// Initialize game configuration
async function initializeGame() {
  // Load spec if specified in URL
  await bootFromQuery();
  
  // If no spec was loaded, use traditional DSL configuration
  if (!specParam) {
    const dsl = loadDSL();
    setDSL(dsl);
    console.log('Game initialized with DSL and seed:', seed);
  } else {
    console.log(`Game initialized with '${specParam}' spec and seed:`, seed);
  }
  
  setSeed(seed);
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
        await player.play(replay, dispatchToGame);
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
  record: (seed:number, meta?:any) => recorder.start(seed, meta),
  stop:   () => recorder.stop(),
  play:   (b64:string) => player.play(fromBase64(b64), dispatchToGame),
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