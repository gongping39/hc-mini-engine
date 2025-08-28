import { Scene } from 'phaser';

export class UIScene extends Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Score display
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff'
    });

    // Game over display (initially hidden)
    this.gameOverText = this.add.text(400, 250, 'GAME OVER', {
      fontSize: '48px',
      color: '#e74c3c',
      align: 'center'
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setVisible(false);

    // Restart instruction (initially hidden)
    this.restartText = this.add.text(400, 320, 'Click to restart', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    });
    this.restartText.setOrigin(0.5);
    this.restartText.setVisible(false);

    // Click to restart
    this.input.on('pointerdown', () => {
      if (this.registry.get('gameOver')) {
        this.registry.events.emit('restart-game');
        this.gameOverText.setVisible(false);
        this.restartText.setVisible(false);
      }
    });
  }

  update(): void {
    // Update score
    const score = this.registry.get('score') || 0;
    this.scoreText.setText(`Score: ${score}s`);

    // Show game over screen
    const gameOver = this.registry.get('gameOver');
    if (gameOver && !this.gameOverText.visible) {
      this.gameOverText.setVisible(true);
      this.restartText.setVisible(true);
    }
  }
}