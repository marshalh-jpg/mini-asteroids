# Running mini-asteroids

Current state: the base game is implemented. The server controls the ship,
the asteroids, the bullets, the score, and the lives count. The client only
draws the state that the server sends.

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

## Health check

`GET /health` returns `{"status":"ok"}` once the server is up.
