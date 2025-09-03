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
  
  // Ensure parent element exists
  const gameRoot = document.getElementById('game-root');
  console.log('Creating Phaser config. Parent element:', gameRoot);
  
  // Try multiple methods to find the canvas
  let existingCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  
  if (!existingCanvas) {
    console.log('getElementById failed, trying querySelector...');
    existingCanvas = document.querySelector('#game-canvas') as HTMLCanvasElement;
  }
  
  if (!existingCanvas) {
    console.log('querySelector failed, trying canvas tag selector...');
    existingCanvas = document.querySelector('canvas[id="game-canvas"]') as HTMLCanvasElement;
  }
  
  console.log('Using existing canvas:', !!existingCanvas);
  if (existingCanvas) {
    console.log('Found canvas with dimensions:', existingCanvas.width, 'x', existingCanvas.height);
  }
  
  return {
    type: Phaser.CANVAS,
    width: 800,
    height: 600,
    parent: existingCanvas ? undefined : 'game-root',
    canvas: existingCanvas || undefined,
    backgroundColor: '#2c3e50',
    render: {
      antialias: false,
      pixelArt: true, 
      transparent: false,
      clearBeforeRender: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      batchSize: 4096
    },
    fps: {
      target: 60,
      forceSetTimeOut: false
    },
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

// Wait for DOM to be ready before creating game
function createGameInstance() {
  console.log('Creating game instance...');
  
  // Ensure canvas exists and is ready
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found! Creating game with parent instead.');
  } else {
    console.log('Canvas element found, clearing it for Phaser...');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 800, 600);
    }
  }
  
  const config = createConfig();
  const game = new Game(config);
  
  // Additional debug
  setTimeout(() => {
    console.log('Game object:', game);
    console.log('Game canvas:', game.canvas);
    console.log('Game context:', game.context);
    console.log('Game renderer:', game.renderer);
    console.log('Game scale:', game.scale);
    console.log('Active scenes:', game.scene.scenes);
    
    // Check all scenes and their status
    console.log('All scenes:', game.scene.scenes.length);
    game.scene.scenes.forEach((scene, index) => {
      console.log(`Scene ${index}:`, scene.scene.key, 'isActive:', scene.scene.isActive(), 'isVisible:', scene.scene.isVisible());
    });
    
    // Check what's currently running
    const activeScenes = game.scene.getScenes(true);
    console.log('Active scenes count:', activeScenes.length);
    
    // Force a manual scene transition if needed
    if (game.scene.scenes.length > 0) {
      const preloadScene = game.scene.getScene('PreloadScene');
      const gameScene = game.scene.getScene('GameScene');
      console.log('PreloadScene:', preloadScene?.scene.isActive());
      console.log('GameScene:', gameScene?.scene.isActive());
      
      if (preloadScene && !gameScene?.scene.isActive()) {
        console.log('Manually starting GameScene...');
        preloadScene.scene.start('GameScene');
        preloadScene.scene.start('UIScene');
      }
    }
  }, 500);
  
  return game;
}

export const game = createGameInstance();

// Debug canvas creation
setTimeout(() => {
  const gameRoot = document.getElementById('game-root');
  const canvas = gameRoot?.querySelector('canvas') as HTMLCanvasElement;
  console.log('Game root element:', gameRoot);
  console.log('Canvas element:', canvas);
  console.log('Canvas dimensions:', canvas?.width, 'x', canvas?.height);
  console.log('Canvas style:', canvas?.style.cssText);
  
  // Force Phaser to render by clearing and triggering manual render
  if (canvas) {
    console.log('Canvas found! Dimensions:', canvas.width, 'x', canvas.height);
    console.log('Canvas context available:', !!canvas.getContext('2d'));
    
    // Force game rendering
    setTimeout(() => {
      console.log('Forcing Phaser render...');
      if (game.renderer) {
        console.log('Renderer type:', game.renderer.type);
        console.log('Renderer width:', game.renderer.width);  
        console.log('Renderer height:', game.renderer.height);
        
        // Force a step update to trigger Phaser rendering
        console.log('Game loop running:', game.loop.running);
        
        // Try to force render
        try {
          game.step(performance.now(), 16);
          console.log('Forced game step completed');
        } catch (error) {
          console.log('Game step error:', error);
        }
        
        // Give Phaser time to render, then check if it worked
        setTimeout(() => {
          console.log('Checking if Phaser rendered anything...');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Check if Phaser drew anything by sampling pixel data
            const imageData = ctx.getImageData(400, 560, 1, 1); // Sample ground area
            const [r, g, b, a] = imageData.data;
            console.log('Ground area pixel:', r, g, b, a);
            
            if (r === 0 && g === 0 && b === 0 && a === 0) {
              console.log('Phaser did not draw anything, canvas is empty');
              
              // Try to manually trigger rendering
              setTimeout(() => {
                console.log('Attempting manual canvas draw to test...');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  // Clear and draw background
                  ctx.fillStyle = '#2c3e50';
                  ctx.fillRect(0, 0, 800, 600);
                  
                  // Draw ground manually at the same position as Phaser
                  ctx.fillStyle = '#2b2f45';  
                  ctx.fillRect(0, 560, 800, 80);
                  
                  // Draw player manually
                  ctx.fillStyle = '#4bc0ff';
                  ctx.fillRect(90, 504, 32, 32);
                  
                  console.log('Manual drawing completed - this proves canvas works');
                }
              }, 1000);
              
            } else {
              console.log('Phaser successfully rendered to canvas!');
            }
          }
        }, 2000);
      }
    }, 1500);
  }
}, 1000);

// Register game instance for runtime DSL updates
setGameInstance(game);
console.log('Game instance registered for DSL updates');

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
  setGameInstance(null);
  game.destroy(true);
});