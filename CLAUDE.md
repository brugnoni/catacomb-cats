# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal browser roguelite (React 19 + TypeScript + Vite, Node 24). `AGENTS.md` holds the binding project rules and `docs/HANDOFF.md` (Spanish) the accepted decisions and current behavior; read both before changing gameplay. Where a note disagrees with the code, `src/game.ts` and `src/progression.ts` win.

## Commands

`pnpm` is often not on PATH; use the pinned version through npm (this is also what the pre-commit hook does):

```
npm exec --yes --package=pnpm@11.25.0 -- pnpm <script>
```

- `pnpm dev` / `npm run dev`: Vite on http://127.0.0.1:5173
- `pnpm check`: format check, eslint (`--max-warnings 0`), `tsc --noEmit`, vitest, build, Playwright. **Required before every commit**; `.githooks/pre-commit` runs it again. Never bypass it.
- `pnpm format`: Prettier write (run before `check` or the format check fails)
- `pnpm test`: unit tests (`src/**/*.test.ts`); one file: `pnpm exec vitest run src/game.test.ts`; one test: `-t "name"`
- `pnpm test:e2e`: Playwright against `vite preview` on :4173 (builds first via `check`); one test: `pnpm exec playwright test -g "name"`. Chromium needs `pnpm exec playwright install chromium` once.

## Repository rules that are easy to miss

- Local only, one public remote (`origin`, github.com/brugnoni/catacomb-cats). **Never push without the user's approval in chat**; never force-push. Pushing to `main` auto-deploys to GitHub Pages (`.github/workflows/pages.yml`). Never commit secrets or private data.
- Commit messages: a brief subject line, then a short, concise description. **No `Co-Authored-By` or other attribution lines.**
- Never write to `localStorage` of `http://localhost:5173` in the shared browser pane (it is the user's real save). Use another origin such as `127.0.0.1` or Playwright for seeded saves.
- Keep rules independent of React. Fix bugs with a regression test first; gameplay changes need meaningful tests.
- Do not generate more images unless asked. No telemetry, remote services or secrets.

## Architecture

- `src/game.ts` is only a facade re-exporting the public API of `src/engine/`: the pure, immutable rules engine, layered `model` (types) → `data` (cats, abilities, items) → `units` (builders) → `state` (turn order, marks, RNG, effects) → `abilities` (availability, power) → `damage` → `enemyAI` → `actions` (`createRun`, `act`, `endTurn`, `nextRoom`), plus `save` (`parseProgress`, upgrades). Imports only go down that list; add new public names to the facade. Public actions (`createRun`, `act`, `endTurn`, `nextRoom`) clone state and return a new `Run`; invalid actions return the _same_ object (tests rely on `toBe(r)`).
- `src/progression.ts`: shared balance data (training tracks, Hearth blessing track, mastery, difficulty, crit constants). The engine, UI and FAQ all read from here; keep descriptions and values in agreement with it.
- Determinism: enemy marks use a seeded generator (`Run.rng`) and crits a separate one (`Run.critRng`) so they never disturb each other. `createRun(progress, party, seed = 1, { crit })` defaults to **no crits** and seed 1; the real game passes a random seed and `crit: "on"`. Browser tests fix both via `window.__CATACOMB_SEED__` and `window.__CATACOMB_CRIT__`.
- Enemy turns: `planEnemyAction` is the single source of what an enemy does; `resolveEnemies` executes it and `enemyIntent` previews it for the UI. Taunt forces every enemy's mark; curses and support ignore it.
- Combat feedback: each transition resets `Run.events` (hit/heal, optional `crit`) and bumps `Run.eventId`; the UI replays them as card flashes (alternating `-0/-1` CSS classes restart animations). Threads under the cards are drawn by `IntentArrows.tsx`, measured with `getBoundingClientRect` and corrected for the `zoom: 0.9` on `.app`.
- `src/App.tsx`: lobby, combat and browser persistence (`localStorage` key `catacomb-cats.progress.v1`; active runs are never saved). `Faq.tsx` is the field guide; `UnitEffects.tsx` the status badges.
- Compatibility: Mei's internal id is `clover`; internal effect names (`fury` = the visible "Inspired") and ability ids (`strike`, `guard`, `slam`...) must not change. Saves are versioned; keep migrations.

## Internationalization (English and Spanish)

- The **English text is the key**: `t("English text", { params })` from `src/i18n.ts`; Spanish lives in `src/es/` (`ui.ts`, `game.ts`, `faq.ts`). Engine log lines and refusal reasons stay English in the engine and are translated in the UI by regex rules in `src/engineText.ts`.
- Any new visible text needs `t()` plus a Spanish entry; any new engine message needs a rule and a translation. `src/i18n.test.ts` fails on missing keys, mismatched `{placeholders}`, untranslated names and unmatched engine messages (it plays simulated runs). Keep `t("...")` arguments as single-line string literals so the scanner finds them.
- Browser tests set the language to English via `localStorage` in `tests/game.spec.ts` `beforeEach`.

## Tests

Balance lives in `DIFFICULTY_TUNING`, `ROOM_REWARD`, `ROOM_HEAL` and the enemy stats in `src/engine/units.ts`; measure changes with the simulator in `src/sim.ts` (`BALANCE_REPORT=1 SIM_OUT=file pnpm exec vitest run src/sim.test.ts`, it writes results to the file because vitest hides console output) and keep `outputs/balance-report.md` current. Engine tests are in `src/game.test.ts` (rules), `src/progression.test.ts`, `src/balance.test.ts` (seeded simulations; they use seeds because enemy marks are random) and `src/abilityText.test.ts`. `tests/game.spec.ts` drives the built app; it picks targets by clicking `[data-unit="id"] .unit-target` and shows threads on hover.

## Agent skills

### Issue tracker

Local markdown under `.scratch/` (git-ignored). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
