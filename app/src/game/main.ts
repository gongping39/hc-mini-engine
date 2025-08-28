import { Game, type Types } from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { loadDSL } from '../dsl/loader';
import { setDSL } from './dslRuntime';

export function setSeededRandom(seed: number): void {
  Math.random = (() => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();
}

// DSL設定を読み込み
const dsl = loadDSL();
setDSL(dsl);

const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-root',
  backgroundColor: '#2c3e50',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: dsl.gravityY },
      debug: false
    }
  },
  scene: [PreloadScene, GameScene, UIScene]
};

export const game = new Game(config);