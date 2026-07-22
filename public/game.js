// Thin client: this file only renders state sent by the server and sends
// keyboard input to the server. It must never compute physics, detect
// collisions, or calculate score — see docs/base-spec.md for the
// client/server split. All game state comes from the latest 'state'
// message received over the WebSocket.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const SHIP_DRAW_RADIUS = 12; // cosmetic only, matches server SHIP_RADIUS
const POWERUP_DRAW_RADIUS = 10; // cosmetic only, matches server POWERUP_RADIUS
const TICK_RATE = 30; // cosmetic only, matches server tick rate, used to show seconds left

const POWERUP_LABELS = {
  shield: 'S',
  rapidFire: 'R',
  extraLife: '+',
};

const POWERUP_COLORS = {
  shield: '#08f',
  rapidFire: '#fa0',
  extraLife: '#f0f',
};

const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${location.host}`);

let latestState = null;

// Tracks which of the 4 input keys are currently held. Sent to the server
// whenever it changes; the server decides what held/pressed keys do.
const input = { left: false, right: false, thrust: false, fire: false };

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  Space: 'fire',
};

function sendInput() {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'input',
    left: input.left,
    right: input.right,
    thrust: input.thrust,
    fire: input.fire,
  }));
}

function handleKey(event, isDown) {
  const action = KEY_MAP[event.code];
  if (!action) return;
  event.preventDefault();

  const field = action === 'up' ? 'thrust' : action;
  if (input[field] === isDown) return;
  input[field] = isDown;
  sendInput();
}

window.addEventListener('keydown', (event) => handleKey(event, true));
window.addEventListener('keyup', (event) => handleKey(event, false));

ws.addEventListener('message', (event) => {
  let message;
  try {
    message = JSON.parse(event.data);
  } catch (err) {
    return;
  }
  if (message && message.type === 'state') {
    latestState = message;
    render(latestState);
  }
});

function drawShip(state) {
  const { ship } = state;
  if (!ship.alive) return;

  const invulnerable = state.tick < ship.invulnerableUntil;
  // Blink the ship while invulnerable so the player can see the window.
  if (invulnerable && state.tick % 6 < 3) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SHIP_DRAW_RADIUS, 0);
  ctx.lineTo(-SHIP_DRAW_RADIUS * 0.7, SHIP_DRAW_RADIUS * 0.7);
  ctx.lineTo(-SHIP_DRAW_RADIUS * 0.4, 0);
  ctx.lineTo(-SHIP_DRAW_RADIUS * 0.7, -SHIP_DRAW_RADIUS * 0.7);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawAsteroids(state) {
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  state.asteroids.forEach((asteroid) => {
    ctx.beginPath();
    ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawBullets(state) {
  ctx.fillStyle = '#ff0';
  state.bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSaucer(state) {
  if (!state.saucer) return;
  ctx.strokeStyle = '#f0f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(state.saucer.x, state.saucer.y, state.saucer.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSaucerBullets(state) {
  ctx.fillStyle = '#f80';
  state.saucerBullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPowerups(state) {
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  state.powerups.forEach((powerup) => {
    const color = POWERUP_COLORS[powerup.type] || '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y, POWERUP_DRAW_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(POWERUP_LABELS[powerup.type] || '?', powerup.x, powerup.y);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawHud(state) {
  ctx.fillStyle = '#0f0';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 12, 20);
  ctx.fillText(`Level: ${state.level}`, 12, 40);
  ctx.textAlign = 'right';
  ctx.fillText(`Lives: ${state.lives}`, state.width - 12, 20);

  if (state.activePowerup) {
    const secondsLeft = Math.ceil(state.activePowerup.ticksLeft / TICK_RATE);
    const label = POWERUP_LABELS[state.activePowerup.type] || state.activePowerup.type;
    ctx.fillStyle = POWERUP_COLORS[state.activePowerup.type] || '#0f0';
    ctx.fillText(`${label} ${secondsLeft}s`, state.width - 12, 40);
  }
  ctx.textAlign = 'left';

  if (state.gameOver) {
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', state.width / 2, state.height / 2);
    ctx.textAlign = 'left';
  }
}

function render(state) {
  ctx.clearRect(0, 0, state.width, state.height);
  drawAsteroids(state);
  drawBullets(state);
  drawSaucer(state);
  drawSaucerBullets(state);
  drawPowerups(state);
  drawShip(state);
  drawHud(state);
}
