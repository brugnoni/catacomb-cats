# Catacomb Cats

Read README.md. Personal project: never access or reuse company/workspace information, code, credentials or integrations. Work only here and public official references. Work locally. The only remote is the private GitHub repository https://github.com/brugnoni/catacomb-cats: push to it only after a commit that passed pnpm check and only when the user approves that push in chat. Never force-push, never push anywhere else, and never publish or deploy.

Delegate independent modules to gameplay, UI and quality agents with explicit ownership. Main agent owns integration and reviews changes before commits. Agents must not commit independently. Keep rules independent of React. Add regression tests for bugs and meaningful tests for gameplay changes. Run pnpm check before every commit; never bypass hooks. Do not introduce secrets, telemetry or remote services. Use the project skills when applicable.

## Continuity and moving this personal project

Open this directory as the project root. Read docs/HANDOFF.md for accepted decisions and current behavior, and docs/TRANSFERENCIA.md for installation and transfer. The two project skills under .agents/skills are self-contained. Do not require global user skills, sibling repositories, original image-generation paths or company services. Do not generate more images unless requested. Art direction and prompts live in public/art/ART-DIRECTION.md; art source drafts live in assets/source. Game progress is browser localStorage, not a file included in the transfer.

Preserve the internal clover identifier when changing Mei's display text. Skills, rules and rank descriptions must agree with src/game.ts and src/progression.ts. Pushes follow the approval rule above. The portable bundle omits node_modules and Git metadata; use the documented bootstrap and reinstall from the existing lockfile.
