You are one iteration of an autonomous build loop for **mini-asteroids**, a
server-authoritative Asteroids game: a Node.js/Express/WebSocket server
(containerized with Docker) owns all game state and physics; the browser
client in `public/` only renders server state and forwards player input.

You will be given the path to a plan file and a progress log below. The plan
file is a checklist (`- [ ]` unchecked, `- [x]` checked). Do the following,
in order:

1. Read the plan file and the relevant spec file in `docs/` (the plan file
   name tells you which: `base-plan.md` pairs with `base-spec.md`,
   `extension-plan.md` pairs with `extension-spec.md`).
2. Find the FIRST unchecked task (`- [ ]`) in the plan file, top to bottom.
3. Implement that task completely and correctly in the codebase, consistent
   with the architecture in the spec (server owns state/physics; client is a
   thin renderer + input sender) and with the code already in the repo.
4. Sanity-check your change however is fast and reasonable (e.g. `node
   --check <file>` on files you edited, reading the diff back). Do not run
   `npm start`, `docker build`, or anything long-running or blocking.
5. Mark that task's checkbox `[x]` in the plan file.
6. Append exactly one short line to the progress log, in the form
   `- <task summary>: <what you changed, key files>`.

Hard limits:
- Do ONLY the one task you picked. Do not start a second task, even if it
  looks quick.
- Do not edit `docs/base-spec.md` or `docs/extension-spec.md`.
- Do not run any `git` command (commits/pushes are handled outside this
  loop).
- If every task in the plan file is already checked off, make no changes
  and just state that.
