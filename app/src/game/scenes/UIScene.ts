import { Scene } from 'phaser';
import { getSeed } from '../dslRuntime';

export class UIScene extends Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private newBestText!: Phaser.GameObjects.Text;
  private shareButton!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Score display
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff'
    });

    // Seed display (top right)
    const seed = getSeed();
    this.seedText = this.add.text(W - 20, 20, `seed: ${seed}`, {
      fontSize: '14px',
      color: '#888888'
    });
    this.seedText.setOrigin(1, 0);

    // Game over display (initially hidden)
    this.gameOverText = this.add.text(W / 2, 200, 'GAME OVER', {
      fontSize: '48px',
      color: '#e74c3c',
      align: 'center'
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setVisible(false);

    // High score display (initially hidden)
    this.highScoreText = this.add.text(W / 2, 250, '', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    });
    this.highScoreText.setOrigin(0.5);
    this.highScoreText.setVisible(false);

    // New best display (initially hidden)
    this.newBestText = this.add.text(W / 2, 280, 'New Best!', {
      fontSize: '20px',
      color: '#f1c40f',
      align: 'center'
    });
    this.newBestText.setOrigin(0.5);
    this.newBestText.setVisible(false);

    // Share button (initially hidden)
    this.shareButton = this.add.text(W / 2, 320, 'Share', {
      fontSize: '18px',
      color: '#3498db',
      align: 'center',
      backgroundColor: '#2c3e50',
      padding: { x: 16, y: 8 }
    });
    this.shareButton.setOrigin(0.5);
    this.shareButton.setVisible(false);
    this.shareButton.setInteractive({ useHandCursor: true });
    this.shareButton.on('pointerdown', () => this.shareScore());

    // Restart instruction (initially hidden)
    this.restartText = this.add.text(W / 2, 360, 'Click to restart', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    });
    this.restartText.setOrigin(0.5);
    this.restartText.setVisible(false);

    // Toast message (initially hidden)
    this.toastText = this.add.text(W / 2, H - 100, 'Copied!', {
      fontSize: '18px',
      color: '#27ae60',
      align: 'center',
      backgroundColor: '#2c3e50',
      padding: { x: 12, y: 6 }
    });
    this.toastText.setOrigin(0.5);
    this.toastText.setVisible(false);

    // Click to restart
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.registry.get('gameOver') && !currentlyOver.includes(this.shareButton)) {
        this.registry.events.emit('restart-game');
        this.hideGameOverScreen();
      }
    });
  }

  private shareScore(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'normal';
    const seed = getSeed();
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?level=${level}&seed=${seed}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showToast();
    }).catch((err) => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  private showToast(): void {
    this.toastText.setVisible(true);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.toastText.setVisible(false);
        this.toastText.setAlpha(1);
      }
    });
  }

  private hideGameOverScreen(): void {
    this.gameOverText.setVisible(false);
    this.highScoreText.setVisible(false);
    this.newBestText.setVisible(false);
    this.shareButton.setVisible(false);
    this.restartText.setVisible(false);
  }

  update(): void {
    // Update score
    const score = this.registry.get('score') || 0;
    this.scoreText.setText(`Score: ${score}s`);

    // Show game over screen
    const gameOver = this.registry.get('gameOver');
    if (gameOver && !this.gameOverText.visible) {
      const finalScore = this.registry.get('finalScore') || 0;
      const highScore = this.registry.get('highScore') || 0;
      const isNewBest = this.registry.get('isNewBest') || false;

      this.gameOverText.setVisible(true);
      this.highScoreText.setText(`High Score: ${highScore}s`);
      this.highScoreText.setVisible(true);
      
      if (isNewBest) {
        this.newBestText.setVisible(true);
      }
      
      this.shareButton.setVisible(true);
      this.restartText.setVisible(true);
    }
  }
}