# Base step — specification

## Goal

Build a single-player Asteroids game. The server must control all game
state and all game rules. The client must not calculate physics. The
client must not detect collisions. The client must not decide when the
game ends. The client only sends input data to the server. The client
only draws the state data that the server sends.

## Architecture

### Transport

- Each browser tab opens one WebSocket connection to the server.
- An Express HTTP server sends the static files in the `public` directory
  to the browser.

### Server

The server code is in `server.js` and in the `src` directory.

- The server runs a tick loop at a fixed rate of 30 Hz. The tick loop
  does not depend on the client.
- The server keeps one `Game` object. The `Game` object holds the ship
  data, the asteroid data, the bullet data, the score, the lives count,
  and the game-over flag.
- At each tick, the server reads the most recent input data from the
  client. A held key (rotate left, rotate right, thrust) applies at every
  tick it is held. The fire command applies once per key press. This rule
  stops the client from setting the fire rate.
- The server calculates movement, rotation, and screen wrap for all
  objects.
- The server creates new asteroids.
- The server detects 2 types of collision: ship-to-asteroid and
  bullet-to-asteroid.
- The server updates the score and the lives count.
- The server controls ship respawn and game-over.
- The server sends a full state update to the client at every tick.

### Client

The client code is in `public/game.js`.

- The client reads the keyboard state for 4 keys: left, right, up
  (thrust), and space (fire).
- The client sends the current input state to the server when the input
  state changes.
- The client draws the most recent state update on a `<canvas>` element.
- The client must not calculate physics.
- The client must not detect collisions.
- The client must not calculate the score.

### Docker

- The server runs in one Docker container.
- The command `docker run -p 3000:3000 <image>` must start a playable
  game. No other setup step is necessary.

## Gameplay (base scope)

- The game has one ship.
- The player controls the ship with 4 keys: left (rotate left), right
  (rotate right), up (thrust), space (fire).
- Thrust adds velocity in the direction the ship faces. The ship has
  light drag.
- The ship wraps around the screen edges.
- At the start of the game, the server creates a fixed number of
  asteroids.
- Asteroids move in straight lines. Asteroids wrap around the screen
  edges.
- A bullet splits a large asteroid into 2 smaller asteroids.
- A bullet destroys a small asteroid.
- Each destroyed asteroid adds points to the score.
- A bullet travels in a straight line. A bullet stops after a fixed time,
  or when it hits an asteroid.
- A collision between the ship and an asteroid removes one life. After
  this collision, the ship respawns at the center of the screen. The ship
  is invulnerable for a fixed time after respawn.
- The game ends when the player loses the last life.
- When the player destroys all asteroids, the server creates a new set of
  asteroids. Difficulty does not increase in this step. See
  `extension-spec.md` for difficulty increase.
- The client shows the score and the lives count. The client reads this
  data from the server state.

## Non-goals for this step

These items are out of scope for the base step:

- Levels or difficulty increase.
- Enemies other than asteroids.
- Power-ups.
- Data storage. The server keeps the game state in memory only. The game
  state does not survive a server restart.
- Reconnect logic. A new connection starts a new game.

## Definition of done

The base step is complete when this procedure works:

1. Run `docker build` and then `docker run -p 3000:3000 <image>`. Or run
   `npm start`.
2. Open the game page in a browser.
3. Play the game with the keyboard. Destroy asteroids. Lose all lives.
   Confirm the game-over state shows.
4. Confirm that the server is the only source of game-state data during
   this test.
