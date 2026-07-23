# Running mini-asteroids

## Prerequisites

Install Docker. Any OS with Docker works: Windows, macOS, or Linux.

## Run the game

1. Open a terminal in the repository root.
2. Build the image:

   ```
   docker build -t mini-asteroids .
   ```

3. Run the container:

   ```
   docker run --rm -p 3000:3000 mini-asteroids
   ```

4. Open http://localhost:3000 in a browser.

To stop the game, press Ctrl+C in the terminal.

## Controls

| Key                  | Action |
| --------------------- | ------ |
| Left arrow / A         | Rotate left |
| Right arrow / D        | Rotate right |
| Up arrow / W            | Thrust |
| Space                  | Fire |


## How to confirm it works

Do these steps in order after a build. Each step must produce the result
stated.

1. Open the game page. The ship, the asteroids, the score, and the lives
   count appear on the canvas.
2. Rotate, thrust, and fire. The ship turns, drifts forward, and shoots a
   bullet.
3. Destroy an asteroid with a bullet. The score goes up.
4. Let an asteroid hit the ship. The lives count goes down by one, and the
   ship respawns at the center of the screen.
5. Destroy every asteroid on the screen. The level number goes up, and a
   new set of asteroids appears.
6. Stay in level 2 or higher for about 10 seconds. A saucer enters the
   screen, moves, and fires at the ship.
7. Destroy the saucer with a bullet. The score goes up again.
8. Let a saucer or a saucer bullet hit the ship. The lives count goes down
   by one, the same as an asteroid hit.
9. Fly over a power-up (a labeled ring). One of 3 effects happens: the
   ship becomes briefly invulnerable (shield), the fire rate goes up for a
   short time (rapid fire), or the lives count goes up by 1 right away
   (extra life).
10. Lose all lives. The screen shows "GAME OVER".
