# mini-asteroids

A server-authoritative Asteroids game. The Node.js server (containerized
with Docker) owns all game state, physics, and rules; the browser client is
a thin canvas renderer that sends input and draws whatever state it's told.

Built in two steps, each carried out in three stages (specify → plan →
build), per a class assignment on AI-assisted software engineering. The
"build" stage of each step is done by a [ralph-wiggum-style](https://github.com/gwincr11/ralph-wiggum-tutorial)
loop: `scripts/ralph-loop.sh` repeatedly invokes headless `claude -p`
against a fixed prompt, one task per invocation, until the corresponding
plan file's checklist is fully checked off.

- **Base step** — classic single-player Asteroids: ship, asteroids,
  bullets, collisions, score/lives, server-authoritative over WebSocket,
  Dockerized.
- **Extension step** — levels, a new enemy type, and power-ups on top of
  the base.

See `docs/` for the specs and plans behind each step, `running.md` for how
to run it, `prompts.txt` for the prompts used at every stage, and
`reflection.md` for a reflection on the exercise.
