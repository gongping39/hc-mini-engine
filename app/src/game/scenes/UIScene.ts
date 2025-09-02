import { Scene } from 'phaser';
import { getSeed } from '../dslRuntime';
import { recorder, player, dispatchToGame, toBase64, type Replay } from '../../replay';

export class UIScene extends Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private newBestText!: Phaser.GameObjects.Text;
  private shareButton!: Phaser.GameObjects.Text;
  private replayExportButton!: Phaser.GameObjects.Text;
  private replayPlayButton!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private lastReplay: Replay | null = null;

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

    // Replay export button (initially hidden)
    this.replayExportButton = this.add.text(W / 2, 350, 'Export Replay', {
      fontSize: '18px',
      color: '#e67e22',
      align: 'center',
      backgroundColor: '#2c3e50',
      padding: { x: 16, y: 8 }
    });
    this.replayExportButton.setOrigin(0.5);
    this.replayExportButton.setVisible(false);
    this.replayExportButton.setInteractive({ useHandCursor: true });
    this.replayExportButton.on('pointerdown', () => this.exportReplay());

    // Replay play button (initially hidden)
    this.replayPlayButton = this.add.text(W / 2 + 120, 350, 'Play Last', {
      fontSize: '16px',
      color: '#9b59b6',
      align: 'center',
      backgroundColor: '#2c3e50',
      padding: { x: 12, y: 6 }
    });
    this.replayPlayButton.setOrigin(0.5);
    this.replayPlayButton.setVisible(false);
    this.replayPlayButton.setInteractive({ useHandCursor: true });
    this.replayPlayButton.on('pointerdown', () => this.playLastReplay());

    // Restart instruction (initially hidden)
    this.restartText = this.add.text(W / 2, 390, 'Click to restart', {
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
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.registry.get('gameOver') && 
          !currentlyOver.includes(this.shareButton) && 
          !currentlyOver.includes(this.replayExportButton) &&
          !currentlyOver.includes(this.replayPlayButton)) {
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


  private exportReplay(): void {
    try {
      if (recorder.isRecording()) {
        const replay = recorder.stop();
        this.lastReplay = replay;
        
        // Save to localStorage
        localStorage.setItem('hc-mini:lastReplay', JSON.stringify(replay));
        
        // Export to clipboard as base64
        const replayData = toBase64(replay);
        const replayUrl = `${window.location.origin}${window.location.pathname}?replay=${replayData}`;
        
        navigator.clipboard.writeText(replayUrl).then(() => {
          this.showToast('Replay URL copied!');
        }).catch((err) => {
          console.error('Failed to copy replay:', err);
          this.showToast('Failed to copy replay');
        });
        
        // Restart recording for next game
        const seed = getSeed();
        recorder.start(seed);
      }
    } catch (error) {
      console.error('Failed to export replay:', error);
      this.showToast('Failed to export replay');
    }
  }

  private playLastReplay(): void {
    let replayToPlay = this.lastReplay;
    
    // If no replay in memory, try localStorage
    if (!replayToPlay) {
      try {
        const saved = localStorage.getItem('hc-mini:lastReplay');
        if (saved) {
          replayToPlay = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Failed to load last replay:', error);
      }
    }
    
    if (replayToPlay) {
      // Hide game over screen and restart game
      this.hideGameOverScreen();
      this.registry.events.emit('restart-game');
      
      // Wait a bit then start replay
      setTimeout(async () => {
        try {
          await player.play(replayToPlay!, dispatchToGame);
        } catch (error) {
          console.error('Failed to play replay:', error);
        }
      }, 1000);
    } else {
      this.showToast('No replay available');
    }
  }

  private showToast(message: string = 'Copied!'): void {
    this.toastText.setText(message);
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
    this.replayExportButton.setVisible(false);
    this.replayPlayButton.setVisible(false);
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
      this.highScoreText.setText(`High Score: ${highScore}s (Last: ${finalScore}s)`);
      this.highScoreText.setVisible(true);
      
      if (isNewBest) {
        this.newBestText.setVisible(true);
      }
      
      this.shareButton.setVisible(true);
      this.replayExportButton.setVisible(true);
      
      // Only show Play Last button if there's a replay available
      const hasLastReplay = this.lastReplay || localStorage.getItem('hc-mini:lastReplay');
      if (hasLastReplay) {
        this.replayPlayButton.setVisible(true);
      }
      
      this.restartText.setVisible(true);
    }
  }
}