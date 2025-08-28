import { Scene } from 'phaser';

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // No assets to load since we're using Graphics for all visuals
  }

  create(): void {
    // Start the GameScene and UIScene
    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }
}