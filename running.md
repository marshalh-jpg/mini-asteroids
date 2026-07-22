# Running mini-asteroids

Current state: the base game and the extension step are implemented. The
server controls the ship, the asteroids, the bullets, the score, the lives
count, the level, the saucer, the saucer bullets, and the power-ups. The
client only draws the state that the server sends.

## Option A: Docker (recommended)

Use this procedure to build and run the game in Docker.

1. Build the image:

   ```
   docker build -t mini-asteroids .
   ```

2. Run the container:

   ```
   docker run --rm -p 3000:3000 mini-asteroids
   ```

3. Open http://localhost:3000 in a browser.

No other setup step is necessary. The container needs no environment
variables and no external database.

## Option B: Node directly

This option requires Node.js 18 or later.

1. Install the dependencies:

   ```
   npm install
   ```

2. Start the server:

   ```
   npm start
   ```

3. Open http://localhost:3000 in a browser.

## Playtest checklist

Use this checklist to confirm the game works after a build.

1. Open the game page. Confirm the ship, the asteroids, the score, and the
   lives count appear on the canvas.
2. Press the left and right arrow keys. Confirm the ship rotates.
3. Press the up arrow key. Confirm the ship thrusts and drifts with light
   drag.
4. Press the space key. Confirm the ship fires a bullet.
5. Destroy an asteroid with a bullet. Confirm the score increases.
6. Let an asteroid hit the ship. Confirm the lives count decreases by one
   and the ship respawns at the center of the screen.
7. Lose all lives. Confirm the game-over state shows.

## Extension playtest checklist

Use this checklist to confirm the level, saucer, and power-up features work
after a build.

1. Start a game. Destroy every asteroid in level 1. Confirm the level
   number rises to 2. Confirm the HUD shows the new level number.
2. Stay in level 2 or higher. Confirm a saucer appears, moves in a
   straight line, and fires bullets at the ship.
3. Destroy the saucer with a bullet. Confirm the score rises.
4. Let a saucer or a saucer bullet hit the ship. Confirm the lives count
   decreases by one, the same as an asteroid hit.
5. Collect a shield power-up. Confirm the ship stays invulnerable for the
   fixed duration.
6. Collect a rapid-fire power-up. Confirm the fire cooldown is shorter for
   the fixed duration.
7. Collect an extra-life power-up. Confirm the lives count rises by 1
   right away.

## Health check

`GET /health` returns `{"status":"ok"}` once the server is up.
