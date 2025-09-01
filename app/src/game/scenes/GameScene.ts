import { Scene } from 'phaser';
import { getDSL, getSeed } from '../dslRuntime';
import { makeRng, type RNG } from '../random';
import { sfx } from '../../audio/sfx';

type RectGO = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

export class GameScene extends Scene {
  private player!: RectGO;
  private ground!: RectGO;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private spawnEvent?: Phaser.Time.TimerEvent;
  private isGameOver = false;
  private score = 0;
  private rng!: RNG;

  constructor() { 
    super({ key: 'GameScene' }); 
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const dsl = getDSL();
    const seed = getSeed();
    
    // Initialize RNG with seed
    this.rng = makeRng(seed);
    
    console.log('GameScene create - DSL gravity:', dsl.gravityY);
    console.log('GameScene create - Seed:', seed);
    console.log('GameScene create - Physics world gravity (before):', this.physics.world.gravity.y);
    
    // DSL値で物理エンジンの重力を強制的に更新
    this.physics.world.gravity.y = dsl.gravityY;
    console.log('GameScene create - Physics world gravity (after):', this.physics.world.gravity.y);

    // ground（画面下端）
    const groundH = 80;
    const groundY = H - groundH / 2;
    const ground = this.add.rectangle(W / 2, groundY, W, groundH, 0x2b2f45) as RectGO;
    this.physics.add.existing(ground, true);
    this.ground = ground;

    // player（重力あり）
    const playerSize = 32;
    const playerY = groundY - groundH / 2 - playerSize / 2; // 地面の上面に配置
    const player = this.add.rectangle(90, playerY, playerSize, playerSize, 0x4bc0ff) as RectGO;
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    this.player = player;

    // 障害物グループ：重力なし・押されない
    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    // 衝突と入力
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver());
    this.input.keyboard?.on('keydown-SPACE', () => this.tryJump());
    this.input.on('pointerdown', () => this.tryJump());

    // スポーン
    this.spawnEvent = this.time.addEvent({
      delay: dsl.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnObstacle(),
    });

    this.isGameOver = false;
    this.score = 0;

    // UISceneにスコアを初期化
    this.registry.set('score', 0);
    this.registry.set('gameOver', false);
  }

  private tryJump(): void {
    if (this.isGameOver) return;
    const dsl = getDSL();
    const body = this.player.body;
    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(dsl.playerJump);
      sfx.playJump();
    }
  }

  private spawnObstacle(): void {
    if (this.isGameOver) return;
    
    const W = this.scale.width;
    const H = this.scale.height;
    const groundH = 80;
    const groundY = H - groundH / 2;
    const dsl = getDSL();

    const size = this.rng.nextInt(24, 56);
    const y = groundY - groundH / 2 - size / 2; // 地面の上面に配置

    const spawnX = W + 20; // 画面右端から少し外に
    const obs = this.add.rectangle(spawnX, y, size, size, 0xff6b6b) as RectGO;
    this.physics.add.existing(obs);

    const b = obs.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(false);
    b.setImmovable(true);
    b.setVelocity(-dsl.obstacleSpeed, 0);       // DSLから障害物速度を取得
    b.setGravity(0, 0);
    b.setAcceleration(0, 0);
    b.setDrag(0, 0);
    b.setBounce(0, 0);

    this.obstacles.add(obs);
  }

  update(_: number, delta: number): void {
    if (this.isGameOver) return;

    const dsl = getDSL();

    // スコア（生存時間）
    this.score += delta / 1000;
    this.registry.set('score', Math.floor(this.score));

    // 障害物のY速度を常に0に固定 & 画面外掃除
    this.obstacles.children.iterate((child) => {
      const c = child as RectGO;
      
      // オブジェクトまたはbodyが無効なら処理をスキップ
      if (!c || !c.body || !c.active) {
        return true;
      }
      
      const body = c.body as Phaser.Physics.Arcade.Body;
      
      if (body.velocity.y !== 0) body.setVelocityY(0);
      // X速度が0になっていたら再設定
      if (body.velocity.x === 0) {
        body.setVelocityX(-dsl.obstacleSpeed);
      }
      
      // 画面外に出たら削除
      if (c.x < -50) {
        c.destroy();
        return true;
      }
      
      return true;
    });

    // 画面外落下
    if (this.player.y > this.scale.height + 100 || this.player.y < dsl.loseBelowY) {
      console.log(`Game Over! Player Y: ${this.player.y}, Lose Below Y: ${dsl.loseBelowY}`);
      this.gameOver();
    }
    
    // デバッグ：プレイヤーの位置を表示
    if (Math.floor(this.score * 10) % 10 === 0) { // 0.1秒ごと
      console.log(`Player position - Y: ${Math.floor(this.player.y)}, Lose limit: ${dsl.loseBelowY}`);
    }
  }

  private gameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    sfx.playCrash();
    
    this.spawnEvent?.remove(false);
    this.obstacles.setVelocityX(0);
    this.player.body.setVelocity(0, 0);
    
    const finalScore = Math.floor(this.score);
    
    // High score management
    const storageKey = 'hc-mini:highScore';
    const currentBest = parseInt(localStorage.getItem(storageKey) || '0', 10);
    let isNewBest = false;
    
    if (finalScore > currentBest) {
      localStorage.setItem(storageKey, finalScore.toString());
      isNewBest = true;
    }
    
    this.registry.set('gameOver', true);
    this.registry.set('finalScore', finalScore);
    this.registry.set('highScore', Math.max(finalScore, currentBest));
    this.registry.set('isNewBest', isNewBest);
    
    // リスタート処理をUISceneに任せる
    this.registry.events.once('restart-game', () => {
      this.scene.restart();
    });
  }
}