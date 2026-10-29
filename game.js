/* global Phaser, COIN_DASH */
class DifficultyMenu extends Phaser.Scene {
  constructor() { super('DifficultyMenu'); }

  create() {
    const c = COIN_DASH;
    const keys = Object.keys(c.difficulties);
    this.choice = Math.max(0, keys.indexOf(this.registry.get('difficulty') || c.defaultDifficulty));
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.add.text(c.width / 2, 70, 'Choose a difficulty', { font: '32px monospace', color: '#ffffff' })
      .setOrigin(0.5);
    this.rows = keys.map((key, i) => {
      const d = c.difficulties[key];
      const y = 150 + i * 80;
      const box = this.add.rectangle(c.width / 2, y, 560, 64, 0x0a1120, 0.9)
        .setStrokeStyle(2, 0x34445e).setInteractive({ useHandCursor: true });
      this.add.text(c.width / 2 - 260, y - 14, `${i + 1}  ${d.label}`,
        { font: '22px monospace', color: key === 'extreme' ? '#ff657a' : '#ffffff' });
      this.add.text(c.width / 2 - 228, y + 12, d.blurb, { font: '15px monospace', color: '#9fb0c8' });
      box.on('pointerover', () => this.select(i));
      box.on('pointerdown', () => this.start(key));
      return { key, box };
    });
    this.add.text(c.width / 2, c.height - 30, '1-4 or ↑/↓ + Enter', { font: '15px monospace', color: '#9fb0c8' })
      .setOrigin(0.5);
    ['ONE', 'TWO', 'THREE', 'FOUR'].slice(0, keys.length).forEach((name, i) =>
      this.input.keyboard.on(`keydown-${name}`, () => this.start(keys[i])));
    this.input.keyboard.on('keydown-UP', () => this.select((this.choice + keys.length - 1) % keys.length));
    this.input.keyboard.on('keydown-DOWN', () => this.select((this.choice + 1) % keys.length));
    this.input.keyboard.on('keydown-ENTER', () => this.start(keys[this.choice]));
    this.input.keyboard.on('keydown-SPACE', () => this.start(keys[this.choice]));
    this.select(this.choice);
  }

  select(i) {
    this.choice = i;
    this.rows.forEach((row, j) => row.box.setStrokeStyle(2, j === i ? COIN_DASH.colors.coin : 0x34445e));
  }

  start(key) {
    this.registry.set('difficulty', key);
    this.scene.start('CoinDash', { difficulty: key });
  }
}

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  init(data) {
    this.difficultyKey = data.difficulty || COIN_DASH.defaultDifficulty;
    this.level = COIN_DASH.difficulties[this.difficultyKey];
  }

  create() {
    const c = COIN_DASH;
    const level = this.level;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.scoreText = this.add.text(c.width / 2, 22, 'Score: 0',
      { font: 'bold 24px monospace', color: '#ffd166' }).setOrigin(0.5);
    this.aimLines = this.add.graphics();
    this.makeBirdTextures();
    this.player = this.add.image(c.width / 2, c.height / 2, 'bird-down').setScale(0.75);
    this.physics.add.existing(this.player);
    // Hitbox covers the round body only, not the beak or tail (texture pixels, before scaling).
    this.player.body.setCircle(14, 8, 8);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.makeSkullTexture();
    this.drones = this.physics.add.group();
    for (let i = 0; i < level.droneCount; i++) {
      const x = c.width * (i + 1) / (level.droneCount + 1);
      const drone = this.add.image(x, 100, 'skull').setScale(0.5);
      this.drones.add(drone);
      // Hitbox matches the round cranium (texture pixels, before scaling).
      drone.body.setCircle(24, 8, 3);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      this.tweens.add({ targets: drone, angle: { from: -8, to: 8 }, duration: 600 + i * 120,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * level.droneSpeed, Math.sin(angle) * level.droneSpeed);
      // Hunters take turns: each waits a little longer before its first rush.
      drone.ai = { state: 'roam', until: this.time.now + 1200 + i * 900, target: null };
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.scoreText.setText(`Score: ${this.score}`);
      // Quick pop so each pickup is noticeable.
      this.tweens.add({ targets: this.scoreText, scale: { from: 1.3, to: 1 }, duration: 150 });
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A skull caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,M');
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ difficulty: this.difficultyKey }));
    this.input.keyboard.on('keydown-M', () => this.scene.start('DifficultyMenu'));
  }

  // Draws a friendly cartoon skull once and stores it as the 64x64 'skull' texture.
  makeSkullTexture() {
    if (this.textures.exists('skull')) return;
    const c = COIN_DASH;
    const ink = 0x2b2140;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(ink).fillCircle(32, 27, 27).fillRoundedRect(16, 36, 32, 24, 8);
    g.fillStyle(c.colors.skull).fillCircle(32, 27, 24).fillRoundedRect(19, 38, 26, 19, 6);
    g.fillStyle(c.colors.drone, 0.7).fillCircle(14, 38, 4).fillCircle(50, 38, 4);
    g.fillStyle(ink).fillCircle(22, 29, 8).fillCircle(42, 29, 8).fillTriangle(29, 38, 35, 38, 32, 42);
    g.fillStyle(0xffffff).fillCircle(25, 26, 3).fillCircle(45, 26, 3);
    g.lineStyle(2, ink).lineBetween(23, 48, 41, 48);
    [27, 32, 37].forEach(x => g.lineBetween(x, 45, x, 52));
    g.generateTexture('skull', 64, 64);
    g.destroy();
  }

  // Draws a right-facing bird twice, wing up and wing down, as 48x40 'bird-up'/'bird-down' textures.
  makeBirdTextures() {
    if (this.textures.exists('bird-up')) return;
    const c = COIN_DASH;
    const ink = 0x2b2140;
    [['bird-up', [14, 21, 30, 21, 17, 3]], ['bird-down', [14, 23, 30, 23, 19, 37]]].forEach(([key, wing]) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(ink).fillTriangle(10, 22, 0, 12, 1, 30);
      g.fillStyle(c.colors.player).fillTriangle(10, 22, 3, 15, 3, 28);
      g.fillStyle(c.colors.coin).lineStyle(2, ink)
        .fillTriangle(34, 17, 47, 22, 34, 27).strokeTriangle(34, 17, 47, 22, 34, 27);
      g.fillStyle(ink).fillEllipse(22, 22, 32, 28);
      g.fillStyle(c.colors.player).fillEllipse(22, 22, 28, 24);
      g.fillStyle(c.colors.belly).fillEllipse(20, 27, 18, 10);
      g.fillStyle(0xffffff).fillCircle(29, 17, 5);
      g.fillStyle(ink).fillCircle(30, 17, 2.5);
      g.fillStyle(c.colors.wing).fillTriangle(...wing).lineStyle(2, ink).strokeTriangle(...wing);
      g.generateTexture(key, 48, 40);
      g.destroy();
    });
  }

  // Flaps quickly while flying, slowly while hovering; faces and tilts with the movement.
  animateBird(time, dx, dy) {
    const flapMs = dx || dy ? 90 : 260;
    this.player.setTexture(Math.floor(time / flapMs) % 2 ? 'bird-up' : 'bird-down');
    if (dx) this.player.setFlipX(dx < 0);
    this.player.setAngle(dy * 15 * (this.player.flipX ? -1 : 1));
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update(time, delta) {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    this.animateBird(time, dx, dy);
    this.updateDrones(time, delta / 1000);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    // Score has its own counter in the centre, so the left HUD keeps only difficulty and time.
    this.hud.setText(`${this.level.label}  ·  Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  updateDrones(time, dt) {
    const level = this.level;
    this.aimLines.clear();
    if (level.brain === 'bounce') return;
    this.drones.getChildren().forEach(drone => {
      const ai = drone.ai;
      if (level.brain === 'chase' || ai.state === 'roam') {
        this.steerToward(drone, this.player.x, this.player.y, level.droneSpeed, level.turnRate * dt);
        if (level.brain === 'hunter' && time >= ai.until) {
          ai.state = 'aim';
          ai.until = time + level.aimMs;
          drone.body.setVelocity(0, 0);
        }
      } else if (ai.state === 'aim') {
        // Keep recalculating while winding up, so the final shot uses the player's latest movement.
        ai.target = this.intercept(drone, level.rushSpeed);
        drone.setTint(Math.floor(time / 80) % 2 ? 0xff657a : 0xffffff);
        this.aimLines.lineStyle(2, 0xff657a, 0.6).lineBetween(drone.x, drone.y, ai.target.x, ai.target.y);
        this.aimLines.strokeCircle(ai.target.x, ai.target.y, 14);
        if (time >= ai.until) {
          const dist = Phaser.Math.Distance.Between(drone.x, drone.y, ai.target.x, ai.target.y);
          this.physics.velocityFromRotation(
            Phaser.Math.Angle.Between(drone.x, drone.y, ai.target.x, ai.target.y),
            level.rushSpeed, drone.body.velocity);
          ai.state = 'rush';
          // Rush a bit past the predicted spot in case the player stops short.
          ai.until = time + Math.min(level.maxRushMs, dist / level.rushSpeed * 1000 + 250);
          drone.setTint(0xff657a);
        }
      } else if (ai.state === 'rush' && time >= ai.until) {
        ai.state = 'roam';
        ai.until = time + level.cooldownMs + Phaser.Math.Between(0, 800);
        drone.body.velocity.setLength(level.droneSpeed);
        drone.clearTint();
      }
    });
  }

  // Turns a drone's heading toward (x, y) by at most `maxTurn` radians, keeping its speed.
  steerToward(drone, x, y, speed, maxTurn) {
    const v = drone.body.velocity;
    const heading = v.lengthSq() > 0 ? v.angle() : Phaser.Math.Angle.Between(drone.x, drone.y, x, y);
    const wanted = Phaser.Math.Angle.Between(drone.x, drone.y, x, y);
    const turned = Phaser.Math.Angle.RotateTo(heading, wanted, maxTurn);
    this.physics.velocityFromRotation(turned, speed, v);
  }

  // Where a drone flying at `speed` should aim to meet the player, assuming the player keeps
  // its current velocity: solve |playerPos + playerVel * t - dronePos| = speed * t for t.
  intercept(drone, speed) {
    const c = COIN_DASH;
    const v = this.player.body.velocity;
    const rx = this.player.x - drone.x, ry = this.player.y - drone.y;
    const a = v.x * v.x + v.y * v.y - speed * speed;
    const b = 2 * (rx * v.x + ry * v.y);
    const disc = b * b - 4 * a * (rx * rx + ry * ry);
    // The drone is faster than the player (a < 0), so exactly one root is positive.
    let t = disc >= 0 && a !== 0 ? Math.max((-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)) : 0;
    if (!Number.isFinite(t) || t < 0) t = 0;
    return {
      x: Phaser.Math.Clamp(this.player.x + v.x * t, 12, c.width - 12),
      y: Phaser.Math.Clamp(this.player.y + v.y * t, 56, c.height - 12)
    };
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 480, 180, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins on ${this.level.label}\nR: try again   M: difficulty`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: [DifficultyMenu, CoinDash]
});
