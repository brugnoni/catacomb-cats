# Architecture

How the code is built. Process rules are in `CLAUDE.md`.

## Engine

`src/game.ts` is only a facade re-exporting the public API of `src/engine/`, a pure, immutable rules engine layered `model` (types) → `data` (cats, abilities, items) → `units` (builders) → `state` (turn order, marks, RNG, effects) → `abilities` (availability, power) → `damage` → `enemyAI` → `actions` (`createRun`, `act`, `endTurn`, `nextRoom`, `pickRelic`), plus `relics` and `save` (`parseProgress`, upgrades).

- Imports only go down that list. Add new public names to the facade. ESLint stops the UI from importing `engine/` and the engine from importing anything above it except `progression` and `expeditions`.
- Public actions clone state and return a new `Run`; invalid actions return the _same_ object (tests rely on `toBe(r)`).
- `src/progression.ts` holds shared balance data (training tracks, Hearth, mastery, difficulty, crit constants). Engine, UI and FAQ read from it. `src/expeditions.ts` defines Expeditions, rooms, unlocks, caps and rewards.
- Enemy turns: `planEnemyAction` is the single source of what an enemy does; `resolveEnemies` executes it and `enemyIntent` previews it. Taunt forces every enemy's mark; curses and support ignore it.

## Determinism

Enemy marks use the seeded `Run.rng`, crits `Run.critRng` and Relic offers `Run.relicRng`, so they never disturb each other. `createRun(progress, party, seed = 1, options)` defaults to seed 1 with crits, misses, evasion and Relics off; the real game passes a random seed and turns them on.

## UI

- `src/App.tsx` only coordinates: language, progress, party, which screen, top bar. `Lobby.tsx` is the camp.
- `Battle.tsx` is one fight and **remounts for every run and room**, so selection, hover and previews live there and reset by key. It uses `Combatant.tsx`, `useThreatPreview.ts`, `useCombatFeedback.tsx`, `battleView.ts` (pure derivations), `AbilityButton.tsx`, `BattleParts.tsx` and `IntentArrows.tsx`.
- `useTutorial.ts` holds the tutorial (steps are data in `src/tutorialSteps.ts`), `storage.ts` the `localStorage` loaders (progress key `catacomb-cats.progress.v1`; active runs are never saved). `Faq.tsx` is the field guide, `UnitEffects.tsx` the status badges.
- Keep new state next to the component that needs it: props down, callbacks up, no global store.
- Combat feedback: each transition resets `Run.events` and bumps `Run.eventId`; the UI replays them as card flashes (alternating `-0/-1` classes restart animations). `IntentArrows.tsx` measures with `getBoundingClientRect` and corrects for the `zoom: 0.9` on `.app`.
- `styles.css` only imports `src/styles/NN-*.css` in order. New rules go in the file for their area; relative `url()` paths in CSS custom properties resolve from that file.

## Internationalization

- The **English text is the key**: `t("English text", { params })` from `src/i18n.ts`; Spanish lives in `src/es/`.
- Engine log lines and refusal reasons stay English and are translated by regex rules in `src/engineText.ts`. A new engine message needs a rule and a translation.
- Keep `t("...")` arguments as single-line string literals so the scanner finds them. `src/i18n.test.ts` fails on missing keys, mismatched `{placeholders}`, untranslated names and unmatched engine messages.

## Tests

- Unit tests are `src/**/*.test.ts` (rules, progression, seeded balance simulations, storage, texts).
- Browser tests in `tests/` drive the built app. The port derives from the checkout path (`E2E_PORT` overrides).
- Browser tests set English and mark the tutorial `skipped` through `localStorage`, and fix randomness with `window.__CATACOMB_SEED__`, `__CATACOMB_CRIT__` and `__CATACOMB_RELICS__`.
- Pick targets with `[data-unit="id"] .unit-target`; wait for `previewDone(page)` before hovering; press the turn button through `getByTestId("end-turn")`, because its label changes.

## Balance

Values live in `DIFFICULTY_TUNING`, `ROOM_REWARD`, `ROOM_HEAL` and the enemy stats in `src/engine/units.ts`. Measure changes with `src/sim.ts` (`BALANCE_REPORT=1 SIM_OUT=file pnpm exec vitest run src/sim.test.ts`; vitest hides console output, so it writes to the file) and keep `outputs/balance-report.md` current.
