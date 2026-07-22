// Thin client scaffold: this file is intentionally "dumb". It connects to
// the server-authoritative game over WebSocket and will render whatever
// state the server sends. It must never compute physics or game rules
// itself — see docs/base-spec.md for the client/server split. Rendering
// and input handling are filled in per docs/base-plan.md.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#0f0';
ctx.font = '16px monospace';
ctx.fillText('mini-asteroids scaffold — connecting to server...', 20, 300);

const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${location.host}`);

ws.addEventListener('message', (event) => {
  console.log('server message:', event.data);
});
