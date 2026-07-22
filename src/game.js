// Authoritative game state for a single-player mini-asteroids match.
// The server is the only owner of this data; see docs/base-spec.md.

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const STARTING_LIVES = 3;

const SHIP_ROTATION_SPEED = 0.11; // radians per tick
const SHIP_THRUST_ACCEL = 0.15; // velocity units per tick, applied along facing angle
const SHIP_DRAG = 0.99; // per-tick velocity multiplier, applied whether or not thrusting
const SHIP_RADIUS = 12; // collision radius
const SHIP_INVULNERABLE_TICKS = 90; // 3s at 30Hz, applied after respawn

const ASTEROID_BASE_COUNT = 5; // count at level 1, before the per-level formula
const ASTEROID_MAX_COUNT = 10; // cap applied by the per-level count formula
const ASTEROID_SPEED_MULTIPLIER_STEP = 0.15; // per-level speed increase
const ASTEROID_MAX_SPEED_MULTIPLIER = 2.0; // cap applied by the per-level speed formula
const ASTEROID_LARGE_RADIUS = 40;
const ASTEROID_SMALL_RADIUS = 16;
const ASTEROID_LARGE_SPEED = 0.6; // units per tick
const ASTEROID_SMALL_SPEED = 1.2;
const ASTEROID_SPAWN_MIN_DIST_FROM_CENTER = 150; // keeps spawns away from the ship
const ASTEROID_SCORE = { large: 20, small: 50 };

const BULLET_SPEED = 6; // units per tick
const BULLET_RADIUS = 2;
const BULLET_LIFETIME_TICKS = 40; // ~1.3s at 30Hz
const SHIP_FIRE_COOLDOWN_TICKS = 10; // default minimum ticks between shots
const SHIP_RAPID_FIRE_COOLDOWN_TICKS = 3; // minimum ticks between shots while rapid fire is active

const SAUCER_MIN_LEVEL = 2; // saucers start appearing at this level
const SAUCER_SPAWN_INTERVAL_TICKS = 300; // ~10s at 30Hz, fixed timer between saucers
const SAUCER_FIRE_INTERVAL_TICKS = 90; // ~3s at 30Hz, fixed timer between saucer shots
const SAUCER_SPEED = 1.5; // units per tick
const SAUCER_RADIUS = 18;
const SAUCER_SCORE = 150;

const POWERUP_DROP_CHANCE = 0.15; // rolled once per asteroid destroyed
const POWERUP_LIFETIME_TICKS = 300; // ~10s at 30Hz, removed if not collected in time
const POWERUP_RADIUS = 10; // collision radius for ship pickup
const POWERUP_TYPES = ['shield', 'rapidFire', 'extraLife'];
const POWERUP_SHIELD_DURATION_TICKS = 150; // ~5s at 30Hz invulnerability window
const POWERUP_RAPID_FIRE_DURATION_TICKS = 150; // ~5s at 30Hz shorter-cooldown window

// Wraps a coordinate into [0, max) so objects re-enter the opposite edge.
function wrap(value, max) {
  return ((value % max) + max) % max;
}

function randomAngle() {
  return Math.random() * Math.PI * 2;
}

// Picks a power-up type with equal chance for each of the 3 types.
function randomPowerupType() {
  return POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
}

// Picks a random point on a screen edge and a straight-line velocity aimed
// roughly across the screen, so the saucer travels through play space
// instead of skimming along the border.
function randomEdgeSpawn(width, height) {
  const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
  let x;
  let y;
  if (edge === 0) {
    x = Math.random() * width;
    y = 0;
  } else if (edge === 1) {
    x = width;
    y = Math.random() * height;
  } else if (edge === 2) {
    x = Math.random() * width;
    y = height;
  } else {
    x = 0;
    y = Math.random() * height;
  }
  const centerAngle = Math.atan2(height / 2 - y, width / 2 - x);
  const angle = centerAngle + (Math.random() - 0.5) * (Math.PI / 2);
  return {
    x,
    y,
    vx: Math.cos(angle) * SAUCER_SPEED,
    vy: Math.sin(angle) * SAUCER_SPEED,
  };
}

// Builds one asteroid of the given size, moving in a random straight-line
// direction from (x, y). speedMultiplier scales the base speed for size,
// applied by the current level's difficulty formula.
function createAsteroid(size, x, y, speedMultiplier = 1) {
  const baseSpeed = size === 'large' ? ASTEROID_LARGE_SPEED : ASTEROID_SMALL_SPEED;
  const speed = baseSpeed * speedMultiplier;
  const angle = randomAngle();
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    radius: size === 'large' ? ASTEROID_LARGE_RADIUS : ASTEROID_SMALL_RADIUS,
  };
}

// Picks a random position at least ASTEROID_SPAWN_MIN_DIST_FROM_CENTER away
// from the screen center, so new asteroids do not spawn on top of the ship.
function randomSpawnPosition(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  let x;
  let y;
  do {
    x = Math.random() * width;
    y = Math.random() * height;
  } while (Math.hypot(x - centerX, y - centerY) < ASTEROID_SPAWN_MIN_DIST_FROM_CENTER);
  return { x, y };
}

class Game {
  constructor() {
    this.width = SCREEN_WIDTH;
    this.height = SCREEN_HEIGHT;

    this.ship = {
      x: SCREEN_WIDTH / 2,
      y: SCREEN_HEIGHT / 2,
      angle: 0,
      vx: 0,
      vy: 0,
      alive: true,
      invulnerableUntil: 0,
      timedPowerup: null, // { type: 'shield' | 'rapidFire', until: tickCount }
    };
    this._fireCooldownRemaining = 0;

    this.asteroids = [];
    this.bullets = [];
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.gameOver = false;
    this.level = 1;

    this.saucer = null;
    this.saucerBullets = [];
    this.ticksUntilSaucerSpawn = SAUCER_SPAWN_INTERVAL_TICKS;

    this.powerups = [];

    this.spawnAsteroidWave();

    // Latest input state from the client. Held keys apply every tick;
    // `fire` is edge-detected below so one key press fires once.
    this.input = { left: false, right: false, thrust: false, fire: false };
    this._firePrev = false;

    this.tickCount = 0;
  }

  // Replaces the stored input state with the client's latest report.
  setInput(input) {
    if (!input || typeof input !== 'object') return;
    this.input.left = !!input.left;
    this.input.right = !!input.right;
    this.input.thrust = !!input.thrust;
    this.input.fire = !!input.fire;
  }

  // Returns true exactly once per fire key press (rising edge), so the
  // client cannot control fire rate by holding the key down.
  _consumeFirePressed() {
    const pressed = this.input.fire && !this._firePrev;
    this._firePrev = this.input.fire;
    return pressed;
  }

  // The current level's asteroid speed multiplier, from the difficulty
  // formula in docs/extension-spec.md, applied to every spawned asteroid.
  getAsteroidSpeedMultiplier() {
    return Math.min(
      1 + (this.level - 1) * ASTEROID_SPEED_MULTIPLIER_STEP,
      ASTEROID_MAX_SPEED_MULTIPLIER,
    );
  }

  // Replaces the asteroid field with a fresh set of large asteroids, used
  // at game start and whenever the field is cleared. Count and speed scale
  // with the current level, per docs/extension-spec.md.
  spawnAsteroidWave() {
    const count = Math.min(ASTEROID_BASE_COUNT + (this.level - 1), ASTEROID_MAX_COUNT);
    const speedMultiplier = this.getAsteroidSpeedMultiplier();
    this.asteroids = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomSpawnPosition(this.width, this.height);
      this.asteroids.push(createAsteroid('large', x, y, speedMultiplier));
    }
  }

  // Applies a bullet hit to an asteroid: a large asteroid splits into 2
  // small asteroids at its location, a small asteroid is destroyed
  // outright. Returns the score value earned for destroying it.
  splitAsteroid(asteroid) {
    const index = this.asteroids.indexOf(asteroid);
    if (index === -1) return 0;
    this.asteroids.splice(index, 1);
    if (asteroid.size === 'large') {
      const speedMultiplier = this.getAsteroidSpeedMultiplier();
      this.asteroids.push(createAsteroid('small', asteroid.x, asteroid.y, speedMultiplier));
      this.asteroids.push(createAsteroid('small', asteroid.x, asteroid.y, speedMultiplier));
    }
    if (Math.random() < POWERUP_DROP_CHANCE) {
      this.spawnPowerup(asteroid.x, asteroid.y);
    }
    return ASTEROID_SCORE[asteroid.size];
  }

  // Spawns one power-up at (x, y) with a fixed lifetime and a type chosen
  // at random with equal chance, per docs/extension-spec.md.
  spawnPowerup(x, y) {
    this.powerups.push({
      x,
      y,
      type: randomPowerupType(),
      ticksLeft: POWERUP_LIFETIME_TICKS,
    });
  }

  // Applies a collected power-up's effect to the ship. Shield and rapid
  // fire are timed effects that replace each other (no stacking); a repeat
  // pickup of the currently active timed type resets its timer instead of
  // adding to it. Extra life applies immediately and has no duration.
  applyPowerup(powerup) {
    if (powerup.type === 'extraLife') {
      this.lives += 1;
      return;
    }
    if (powerup.type === 'shield') {
      this.ship.timedPowerup = { type: 'shield', until: this.tickCount + POWERUP_SHIELD_DURATION_TICKS };
      this.ship.invulnerableUntil = this.ship.timedPowerup.until;
      return;
    }
    if (powerup.type === 'rapidFire') {
      // Picking up rapid fire while shielded ends the shield early, since
      // only one timed effect may be active at a time.
      if (this.ship.timedPowerup && this.ship.timedPowerup.type === 'shield') {
        this.ship.invulnerableUntil = this.tickCount;
      }
      this.ship.timedPowerup = { type: 'rapidFire', until: this.tickCount + POWERUP_RAPID_FIRE_DURATION_TICKS };
    }
  }

  // Spawns a bullet at the ship's nose, travelling along the ship's facing
  // angle at a fixed speed, with a fixed lifetime.
  fireBullet() {
    const { angle } = this.ship;
    this.bullets.push({
      x: this.ship.x + Math.cos(angle) * SHIP_RADIUS,
      y: this.ship.y + Math.sin(angle) * SHIP_RADIUS,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      ticksLeft: BULLET_LIFETIME_TICKS,
    });
  }

  // Spawns one saucer entering from a random screen edge, moving in a
  // straight line, with its own fire timer.
  spawnSaucer() {
    const { x, y, vx, vy } = randomEdgeSpawn(this.width, this.height);
    this.saucer = {
      x,
      y,
      vx,
      vy,
      radius: SAUCER_RADIUS,
      ticksUntilFire: SAUCER_FIRE_INTERVAL_TICKS,
    };
  }

  // Fires a saucer bullet aimed at the ship's current position, using the
  // same movement and lifetime rule as ship bullets.
  fireSaucerBullet() {
    const dx = this.ship.x - this.saucer.x;
    const dy = this.ship.y - this.saucer.y;
    const angle = Math.atan2(dy, dx);
    this.saucerBullets.push({
      x: this.saucer.x,
      y: this.saucer.y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      ticksLeft: BULLET_LIFETIME_TICKS,
    });
  }

  // Moves one life from the ship to the grave: decrements lives, ends the
  // game if none remain, otherwise respawns the ship at the center with a
  // fixed invulnerability window.
  handleShipHit() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.ship.alive = false;
      this.gameOver = true;
      return;
    }
    this.ship.x = this.width / 2;
    this.ship.y = this.height / 2;
    this.ship.vx = 0;
    this.ship.vy = 0;
    this.ship.angle = 0;
    this.ship.invulnerableUntil = this.tickCount + SHIP_INVULNERABLE_TICKS;
  }

  // Advances the game by one tick: ship movement, bullet movement and
  // lifetime, asteroid movement, bullet-asteroid and ship-asteroid
  // collisions, scoring, lives, respawn, and game-over.
  tick() {
    const firePressed = this._consumeFirePressed();

    if (this.gameOver) {
      this.tickCount += 1;
      return;
    }

    if (this.ship.alive) {
      if (this.input.left) this.ship.angle -= SHIP_ROTATION_SPEED;
      if (this.input.right) this.ship.angle += SHIP_ROTATION_SPEED;

      if (this.input.thrust) {
        this.ship.vx += Math.cos(this.ship.angle) * SHIP_THRUST_ACCEL;
        this.ship.vy += Math.sin(this.ship.angle) * SHIP_THRUST_ACCEL;
      }

      this.ship.vx *= SHIP_DRAG;
      this.ship.vy *= SHIP_DRAG;

      this.ship.x = wrap(this.ship.x + this.ship.vx, this.width);
      this.ship.y = wrap(this.ship.y + this.ship.vy, this.height);

      if (this._fireCooldownRemaining > 0) this._fireCooldownRemaining -= 1;
      if (firePressed && this._fireCooldownRemaining <= 0) {
        this.fireBullet();
        const rapidFireActive = this.ship.timedPowerup && this.ship.timedPowerup.type === 'rapidFire';
        this._fireCooldownRemaining = rapidFireActive
          ? SHIP_RAPID_FIRE_COOLDOWN_TICKS
          : SHIP_FIRE_COOLDOWN_TICKS;
      }
    }

    this.bullets.forEach((bullet) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.ticksLeft -= 1;
    });
    this.bullets = this.bullets.filter((bullet) => bullet.ticksLeft > 0);

    this.asteroids.forEach((asteroid) => {
      asteroid.x = wrap(asteroid.x + asteroid.vx, this.width);
      asteroid.y = wrap(asteroid.y + asteroid.vy, this.height);
    });

    if (this.saucer) {
      this.saucer.x = wrap(this.saucer.x + this.saucer.vx, this.width);
      this.saucer.y = wrap(this.saucer.y + this.saucer.vy, this.height);

      this.saucer.ticksUntilFire -= 1;
      if (this.saucer.ticksUntilFire <= 0) {
        this.fireSaucerBullet();
        this.saucer.ticksUntilFire = SAUCER_FIRE_INTERVAL_TICKS;
      }
    } else if (this.level >= SAUCER_MIN_LEVEL) {
      this.ticksUntilSaucerSpawn -= 1;
      if (this.ticksUntilSaucerSpawn <= 0) {
        this.spawnSaucer();
        this.ticksUntilSaucerSpawn = SAUCER_SPAWN_INTERVAL_TICKS;
      }
    }

    this.saucerBullets.forEach((bullet) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.ticksLeft -= 1;
    });
    this.saucerBullets = this.saucerBullets.filter((bullet) => bullet.ticksLeft > 0);

    this.powerups.forEach((powerup) => {
      powerup.ticksLeft -= 1;
    });
    this.powerups = this.powerups.filter((powerup) => powerup.ticksLeft > 0);

    if (this.ship.timedPowerup && this.tickCount >= this.ship.timedPowerup.until) {
      this.ship.timedPowerup = null;
    }

    // Bullet-to-asteroid collisions: each bullet can hit at most one
    // asteroid per tick.
    const spentBullets = new Set();
    this.bullets.forEach((bullet) => {
      const hitAsteroid = this.asteroids.find((asteroid) => {
        const hitDist = BULLET_RADIUS + asteroid.radius;
        return Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) < hitDist;
      });
      if (hitAsteroid) {
        spentBullets.add(bullet);
        this.score += this.splitAsteroid(hitAsteroid);
      }
    });
    if (spentBullets.size > 0) {
      this.bullets = this.bullets.filter((bullet) => !spentBullets.has(bullet));
    }

    // Bullet-to-saucer collision: a hit destroys the saucer and scores.
    if (this.saucer) {
      const hitDist = BULLET_RADIUS + this.saucer.radius;
      const hitBullet = this.bullets.find(
        (bullet) => Math.hypot(bullet.x - this.saucer.x, bullet.y - this.saucer.y) < hitDist,
      );
      if (hitBullet) {
        this.bullets = this.bullets.filter((bullet) => bullet !== hitBullet);
        this.score += SAUCER_SCORE;
        this.saucer = null;
      }
    }

    // Ship collisions with asteroids, the saucer, and saucer bullets, all
    // skipped while invulnerable, using the same rule as an asteroid hit.
    if (this.ship.alive && this.tickCount >= this.ship.invulnerableUntil) {
      const hitAsteroid = this.asteroids.find((asteroid) => {
        const hitDist = SHIP_RADIUS + asteroid.radius;
        return Math.hypot(this.ship.x - asteroid.x, this.ship.y - asteroid.y) < hitDist;
      });
      const hitSaucer =
        !!this.saucer &&
        Math.hypot(this.ship.x - this.saucer.x, this.ship.y - this.saucer.y) <
          SHIP_RADIUS + this.saucer.radius;
      const hitSaucerBullet = this.saucerBullets.some(
        (bullet) =>
          Math.hypot(this.ship.x - bullet.x, this.ship.y - bullet.y) < SHIP_RADIUS + BULLET_RADIUS,
      );
      if (hitAsteroid || hitSaucer || hitSaucerBullet) this.handleShipHit();
    }

    // Ship-to-power-up pickups apply regardless of invulnerability, since
    // collecting a power-up is not damage.
    if (this.ship.alive) {
      const hitPowerup = this.powerups.find(
        (powerup) =>
          Math.hypot(this.ship.x - powerup.x, this.ship.y - powerup.y) <
          SHIP_RADIUS + POWERUP_RADIUS,
      );
      if (hitPowerup) {
        this.powerups = this.powerups.filter((powerup) => powerup !== hitPowerup);
        this.applyPowerup(hitPowerup);
      }
    }

    if (this.asteroids.length === 0) {
      this.level += 1;
      this.spawnAsteroidWave();
    }

    this.tickCount += 1;
  }

  // Serializable snapshot sent to the client every tick.
  getState() {
    return {
      type: 'state',
      tick: this.tickCount,
      width: this.width,
      height: this.height,
      ship: { ...this.ship },
      asteroids: this.asteroids.map((a) => ({ ...a })),
      bullets: this.bullets.map((b) => ({ ...b })),
      saucer: this.saucer ? { ...this.saucer } : null,
      saucerBullets: this.saucerBullets.map((b) => ({ ...b })),
      powerups: this.powerups.map((p) => ({ ...p })),
      activePowerup: this.ship.timedPowerup
        ? { type: this.ship.timedPowerup.type, ticksLeft: this.ship.timedPowerup.until - this.tickCount }
        : null,
      score: this.score,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
    };
  }
}

module.exports = { Game, SCREEN_WIDTH, SCREEN_HEIGHT };
