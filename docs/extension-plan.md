# Extension step — implementation plan

This file is a task checklist for the extension build loop
(`scripts/ralph-loop.sh docs/extension-plan.md docs/extension-progress.md`).
Each task must match one requirement group in `docs/extension-spec.md`.
The loop does one task per iteration, in order, top to bottom.

## Tasks

- [x] **Levels.** Add a `level` field to `Game`, starting at 1. On asteroid
  wave clear, raise `level` by 1 before the next spawn. Apply the count
  formula `min(5 + (level - 1), 10)` and the speed multiplier formula
  `min(1 + (level - 1) * 0.15, 2.0)` from `docs/extension-spec.md` to each
  spawned asteroid. Add `level` to the state message.
- [x] **Saucer enemy.** Add a saucer object type, separate from asteroids.
  Spawn one saucer at a time on a fixed timer, only when `level >= 2` and
  no saucer is active. Move the saucer in a straight line from a random
  edge, with screen wrap. Fire a saucer bullet at the ship's current
  position on a fixed timer, using the same movement and lifetime rule as
  ship bullets. Add saucer and saucer-bullet data to the state message.
- [x] **Saucer collisions and scoring.** A player bullet that hits the
  saucer must destroy it and add points to the score. The saucer, and a
  saucer bullet, must each cost the ship one life on collision, using the
  same invulnerability check as an asteroid collision.
- [x] **Power-ups.** On each asteroid destroy event, roll
  `POWERUP_DROP_CHANCE = 0.15`. On success, spawn one power-up at the
  asteroid's last position, with a fixed lifetime and a type chosen at
  random from shield, rapid fire, and extra life (equal chance each). Add
  power-up data to the state message.
- [x] **Power-up effects and pickup.** A ship-to-power-up collision
  applies the effect and removes the power-up. Shield starts a
  fixed-duration invulnerability window. Rapid fire starts a
  fixed-duration window with a shorter fire cooldown. Extra life adds 1
  life immediately. A new pickup of the same timed type must reset that
  type's timer, not stack it. Add the active timed power-up and its time
  left to the state message.
- [x] **Client rendering and HUD.** Update `public/game.js` to draw the
  saucer, saucer bullets, and power-ups from the state message, and to
  show the level number and the active power-up indicator in the HUD. Add
  no physics, collision, timer, or drop-chance logic to the client.
- [x] **Docker verification and running instructions.** Confirm
  `docker build` and `docker run -p 3000:3000 <image>` still produce a
  playable game with no extra setup step. Update `running.md` with an
  extension playtest checklist: reach level 2, meet a saucer, destroy a
  saucer, get hit by a saucer or its bullet, and collect each of the 3
  power-up types.
