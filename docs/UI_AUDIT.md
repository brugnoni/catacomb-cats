# UI architecture audit

Date: 2026-11-25. Scope: architecture and boundaries. Historical record.

## State

- Clean layers: `App` coordinates; `Lobby`/`Battle`/`Combatant` and hooks per function; no component over 340 lines; no global store.
- No UI file imports `src/engine/*` (only the `game.ts` facade).

## Done in this round

1. **Boundaries enforced** (`eslint.config.js`, `no-restricted-imports`): the UI imports only from `./game`; the engine only from `../progression` and `../expeditions`, and not from React.
2. **`styles.css` split** into 10 files under `src/styles/`, imported in the original order. The compiled CSS is byte-identical. Note: `url()` paths in CSS variables are relative to the file (hence `../cursors/`).
3. **Playwright with `workers: 4`**: with the default 16, 22 tests failed on load timeouts; with 4 all 74 pass.

## Pending (untouched)

- CSS is still global and order-dependent: `.combatant` rules are spread over 12 places. Regrouping by component needs visual tests.
- Accessibility: only 4 uses of `aria-`/`role=` in `src/`; no keyboard, focus or role tests.
- Responsive: only desktop is tested.
- No component tests (only pure logic and a 3.6 min e2e suite).
