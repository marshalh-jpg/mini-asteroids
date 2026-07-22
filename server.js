const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const { Game } = require('./src/game');

const PORT = process.env.PORT || 3000;
const TICK_RATE_HZ = 30;
const TICK_INTERVAL_MS = 1000 / TICK_RATE_HZ;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = app.listen(PORT, () => {
  console.log(`mini-asteroids server listening on port ${PORT}`);
});

// The server keeps one authoritative Game instance. Every connected
// client input feeds this same instance (single-player), and every tick
// broadcasts the resulting state to all connected clients.
//
// WebSocket protocol:
//   client -> server: { type: 'input', left, right, thrust, fire } (booleans)
//   server -> client: { type: 'state', tick, width, height, ship, asteroids,
//                        bullets, score, lives, gameOver }
const game = new Game();
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      return;
    }
    if (message && message.type === 'input') {
      game.setInput(message);
    }
  });
});

function broadcastState() {
  const state = JSON.stringify(game.getState());
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(state);
    }
  });
}

setInterval(() => {
  game.tick();
  broadcastState();
}, TICK_INTERVAL_MS);
