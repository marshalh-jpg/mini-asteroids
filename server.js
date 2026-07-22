const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = app.listen(PORT, () => {
  console.log(`mini-asteroids server listening on port ${PORT}`);
});

// The authoritative game state, tick loop, and WebSocket protocol are
// implemented on top of this scaffold. See docs/base-spec.md and
// docs/base-plan.md for the design and task breakdown.
const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'hello',
    message: 'mini-asteroids server scaffold — game loop not yet implemented',
  }));
});
