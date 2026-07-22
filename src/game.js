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

const ASTEROID_COUNT = 5; // fixed count spawned at game start and after each clear
const ASTEROID_LARGE_RADIUS = 40;
const ASTEROID_SMALL_RADIUS = 16;
const ASTEROID_LARGE_SPEED = 0.6; // units per tick
const ASTEROID_SMALL_SPEED = 1.2;
const ASTEROID_SPAWN_MIN_DIST_FROM_CENTER = 150; // keeps spawns away from the ship
const ASTEROID_SCORE = { large: 20, small: 50 };

const BULLET_SPEED = 6; // units per tick
const BULLET_RADIUS = 2;
const BULLET_LIFETIME_TICKS = 40; // ~1.3s at 30Hz

// Wraps a coordinate into [0, max) so objects re-enter the opposite edge.
function wrap(value, max) {
  return ((value % max) + max) % max;
}

function randomAngle() {
  return Math.random() * Math.PI * 2;
}

// Builds one asteroid of the given size, moving in a random straight-line
// direction from (x, y).
function createAsteroid(size, x, y) {
  const speed = size === 'large' ? ASTEROID_LARGE_SPEED : ASTEROID_SMALL_SPEED;
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
    };

    this.asteroids = [];
    this.bullets = [];
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.gameOver = false;

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

  // Replaces the asteroid field with a fresh fixed-count set of large
  // asteroids, used at game start and whenever the field is cleared.
  spawnAsteroidWave() {
    this.asteroids = [];
    for (let i = 0; i < ASTEROID_COUNT; i += 1) {
      const { x, y } = randomSpawnPosition(this.width, this.height);
      this.asteroids.push(createAsteroid('large', x, y));
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
      this.asteroids.push(createAsteroid('small', asteroid.x, asteroid.y));
      this.asteroids.push(createAsteroid('small', asteroid.x, asteroid.y));
    }
    return ASTEROID_SCORE[asteroid.size];
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

      if (firePressed) this.fireBullet();
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

    // Ship-to-asteroid collision, skipped while invulnerable.
    if (this.ship.alive && this.tickCount >= this.ship.invulnerableUntil) {
      const hitAsteroid = this.asteroids.find((asteroid) => {
        const hitDist = SHIP_RADIUS + asteroid.radius;
        return Math.hypot(this.ship.x - asteroid.x, this.ship.y - asteroid.y) < hitDist;
      });
      if (hitAsteroid) this.handleShipHit();
    }

    if (this.asteroids.length === 0) this.spawnAsteroidWave();

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
      score: this.score,
      lives: this.lives,
      gameOver: this.gameOver,
    };
  }
}

module.exports = { Game, SCREEN_WIDTH, SCREEN_HEIGHT };
