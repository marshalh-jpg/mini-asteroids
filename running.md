# Running mini-asteroids

Current state: project scaffold only (server boots, serves the client, and
accepts WebSocket connections, but the game itself isn't implemented yet).
This file will be updated as the base game and extension are built.

## Option A: Docker (recommended — this is how the game is meant to run)

```
docker build -t mini-asteroids .
docker run --rm -p 3000:3000 mini-asteroids
```

Then open http://localhost:3000 in a browser.

## Option B: Node directly

Requires Node.js 18+.

```
npm install
npm start
```

Then open http://localhost:3000 in a browser.

## Health check

`GET /health` returns `{"status":"ok"}` once the server is up.
