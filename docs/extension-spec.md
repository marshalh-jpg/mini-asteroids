# Extension step — specification

## Goal

Add 3 features to the base game: levels, one new enemy type, and
power-ups. The server must control all new state and all new rules, the
same way it controls the base game. See `docs/base-spec.md` for the
server-authoritative rules that still apply.

## Feature 1: Levels

- The `Game` object gets a `level` field. The level starts at 1.
- When the player destroys all asteroids, the server must raise the level
  by 1 before it spawns the next wave.
- Each level must increase difficulty in 2 ways:
  1. Asteroid count: `min(5 + (level - 1), 10)`.
  2. Asteroid speed multiplier: `min(1 + (level - 1) * 0.15, 2.0)`. The
     server must apply this multiplier to the base speed of each spawned
     asteroid.
- The client must show the current level number in the HUD.

## Feature 2: Enemy — the saucer

- The saucer is a new object type. The saucer is not an asteroid.
- The server must spawn one saucer at a time, on a fixed timer, only when
  `level >= 2` and no saucer is currently active.
- The saucer enters from a random screen edge and moves in a straight
  line. The saucer wraps at screen edges like an asteroid.
- The saucer must fire a bullet at the ship on a fixed timer, aimed at the
  ship's position at the moment of firing. A saucer bullet moves in a
  straight line and expires after a fixed lifetime, the same rule the
  ship's bullets use.
- A player bullet that hits the saucer must destroy it and add points to
  the score.
- The saucer, and a saucer bullet, must each cost the ship one life on
  collision, the same rule an asteroid collision uses (respect ship
  invulnerability).
- Player bullets do not interact with saucer bullets.

## Feature 3: Power-ups

- When the server destroys an asteroid, there is a fixed chance
  (`POWERUP_DROP_CHANCE = 0.15`) that the server spawns one power-up at
  the asteroid's last position.
- A power-up has a fixed lifetime. If the ship does not collect it before
  the lifetime ends, the server must remove it.
- There are 3 power-up types:
  1. **Shield** — starts a fixed-duration invulnerability window, the same
     mechanism the respawn invulnerability uses.
  2. **Rapid fire** — starts a fixed-duration window in which the fire
     cooldown is shorter than the default.
  3. **Extra life** — adds 1 life immediately. This type has no duration.
- The server picks the power-up type at random, with equal chance for
  each type.
- A collision between the ship and a power-up applies its effect and
  removes the power-up. A new pickup of the same timed type must reset
  that type's timer, not stack extra time.
- The client must show the HUD an indicator for the active timed power-up
  and the time left, when one is active.

## Client updates

- `public/game.js` must draw the saucer, saucer bullets, and power-ups
  from the state the server sends.
- `public/game.js` must show the level number and the active power-up
  indicator in the HUD.
- The client must not add physics, collision, timers, or drop-chance logic
  for any of these features. All 3 features follow the same
  server-authoritative rule as the base game.

## Non-goals for this step

- No enemy type other than the saucer.
- No power-up stacking of 2 different timed effects at once. A new
  timed-effect pickup replaces the current timed effect.
- No score or level data saved between server restarts. State stays in
  memory only, the same rule the base game uses.
- No maximum level. The level number keeps rising; only asteroid count
  and speed are capped, as stated above.

## Definition of done

The extension step is complete when this procedure works, on top of the
base step's definition of done:

1. Start a game and destroy every asteroid in level 1. Confirm the level
   number rises to 2 and the HUD shows it.
2. Reach level 2 or higher and confirm a saucer appears, moves, and fires
   at the ship.
3. Destroy a saucer with a bullet. Confirm the score rises.
4. Let a saucer or a saucer bullet hit the ship. Confirm this removes one
   life, the same as an asteroid hit.
5. Collect a shield power-up. Confirm the ship is invulnerable for the
   fixed duration.
6. Collect a rapid-fire power-up. Confirm the fire cooldown is shorter for
   the fixed duration.
7. Collect an extra-life power-up. Confirm the lives count rises by 1
   right away.
