# Base step — implementation plan

This file is a task checklist for the base build loop
(`scripts/ralph-loop.sh docs/base-plan.md docs/base-progress.md`). Each
task must match one requirement group in `docs/base-spec.md`. The loop
does one task per iteration, in order, top to bottom.

## Tasks

- [x] **Server skeleton and protocol.** Add `src/game.js` with a `Game`
  class that holds ship, asteroid, bullet, score, and lives data. Wire a
  30 Hz tick loop into `server.js`. Define the WebSocket message format:
  client-to-server input messages, server-to-client state messages. Send
  one state message per tick.
- [x] **Ship physics and input.** Add rotate-left, rotate-right, thrust,
  and fire handling. Thrust must add velocity in the facing direction.
  The ship must have light drag and must wrap at the screen edges. Fire
  must trigger once per key press, not once per tick held.
- [x] **Asteroids.** Add asteroid spawn at game start (fixed count),
  straight-line movement, and screen wrap. A bullet hit on a large
  asteroid must create 2 smaller asteroids. A bullet hit on a small
  asteroid must destroy it.
- [x] **Bullets, collisions, scoring, lives.** Add bullet movement and a
  fixed bullet lifetime. Add bullet-to-asteroid collision and
  ship-to-asteroid collision. A destroyed asteroid must add points to the
  score. A ship-to-asteroid collision must remove one life and respawn the
  ship at the center with a fixed invulnerability window. The game must
  end when lives reach 0. Clearing all asteroids must spawn a fresh set.
- [x] **Client rendering and input capture.** Update `public/game.js` to
  read the keyboard state, send input messages on change, and draw the
  ship, asteroids, bullets, score, and lives from the latest state
  message. The client must not run any physics or collision code.
- [x] **Docker verification and running instructions.** Confirm
  `docker build` and `docker run -p 3000:3000 <image>` produce a
  playable game with no extra setup step. Update `running.md` with the
  exact commands and with a short playtest checklist (start, destroy an
  asteroid, lose all lives, see game over).
