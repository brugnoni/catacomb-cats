# Catacomb Cats

Personal browser roguelite. React + TypeScript + Vite. No company data or integrations.

## Development

Use Node 24 LTS and pnpm. Run `pnpm install`, `pnpm exec playwright install chromium`, then `pnpm dev`.
`pnpm check` runs formatting, lint, types, unit/integration tests, production build and browser E2E. Git pre-commit runs the same command. Never bypass failing checks.

If dependencies are already installed, you can also start the game with `npm run dev`; this does not require pnpm on your terminal PATH. Open the local URL printed by Vite and keep the terminal running. Stop it with Ctrl+C.

Installing dependencies and running the full quality gate still require the pinned pnpm version from package.json. Do not run npm install or create a second lockfile.

Progress is stored only in this browser. Closing a dungeon loses that run. Permanent upgrades remain after defeat. No cloud backup.

## First expedition

Select three of five cats. Equipment has one slot per cat; assigning an owned item moves it from its previous owner. Choose Empty slot to remove it. Iron bell grants 6 HP, Silk ribbon grants 3 initiative, and Lucky fang grants 1 attack power.

Individual training follows each class’s role instead of adding all stats every rank. The first three ranks cost 20, 30 and 50 gold (100 total), with a signature third skill unlocked at rank 3. Later ranks cost 70, 90, 110, 130 and 150 gold, and training stops at rank 8. The lobby previews the exact next benefit. The Hearth is a global blessing with eight ranks that helps every cat: HP, initiative, attack and support power, Second Wind (the first cat to fall each expedition rises at 40% HP, 60% from rank 7) and +1 AP in the first round of each room at rank 8. Shared mastery requires 150 XP per level, grants +2 HP per level and +1 numeric skill power every third level, and stops at mastery level 10. That power improves attacks, healing, Guard and Inspired blessings; AP generation, taunt and percentage-based revival remain fixed. Only banked XP counts.

Each round uses a global initiative queue and 6 shared party AP. Each 1 AP skill is limited to three uses per cat turn; each 2 AP skill to two. Signature skills can impose tighter per-turn or per-room limits. End turn leaves AP for later cats. Guard and Inspired cannot be stacked. Full-duration effects reject duplicate player casts without spending AP or uses; after the start of an affected-unit turn reduces duration they can be refreshed. Guard refresh restores both duration and the shield’s full current power; Inspired refresh changes duration only. Inspired boosts damage, healing and Guard, but not AP, taunt or another blessing. Status values and remaining turns are visible in combat.

Mei’s rank-three special has two choices: heal all living allies, or select a fallen ally and revive them at 60% maximum HP (rounded up). Only revival has a cooldown: after casting it, revival is unavailable for her next two own turns and returns on her third. Party healing and her regular single-target heal remain available subject to AP and per-turn use limits. Revived allies act from the next round. Ember's Cinder jab has no cooldown; Flame paw has a two-turn cooldown (ready again on his third own turn after use) and Sweeping embers a one-turn cooldown. Cooldowns reset between rooms.

Training uses an explicit eight-rank track for each cat. Rank 3 unlocks their signature skill; rank 5 unlocks a class passive and rank 8 improves it. Miso and Ember begin each room with Guard, Luna gets a limited-hit Ice Ward, Mei recovers HP from a limited number of damaging attacks, and Pip gains an opening-attack bonus. The lobby shows only the next rank’s benefit; the FAQ lists all eight ranks. Values and descriptions share `src/progression.ts` as their source.

Clearing either of the first two rooms revives fallen cats at ceil(25% maximum HP), minimum 1. Boss victory fully heals and revives the entire party, clears combat effects and leaves the next expedition ready at full HP. A full-party defeat never revives anyone. In the first two rooms, cats that survived recover up to 8 HP and the team gains +1 run damage; revived cats do not also receive the 8 HP. Gold, XP and discovered items remain carried Expedition Loot until the final boss is defeated AND Return to lobby is selected. Defeat, retreat or reloading loses unbanked loot; permanent upgrades remain.

After the first boss victory, future runs use a frozen Ascension snapshot based on recorded victories, lifetime gold spent and shared mastery. Enemy HP, skill power, initiative, armor and eventual reinforcements grow within bounded limits. The entry screen explains the next run’s tier and modifiers. Unspent gold does not increase difficulty. See outputs/balance-report.md for formulas and measured scenarios.

## Architecture and workflow

`src/game.ts` is the immutable rules engine and validated save boundary. `src/App.tsx` renders state and handles browser storage. Unit tests exercise the engine; Playwright drives the built application through complete runs, so browser coverage also checks integration. Fix bugs by adding a reproducible failing test before the repair. Browser failure traces are retained under test-results; open them with `pnpm exec playwright show-trace <trace.zip>`.

Use `.agents/skills/catacomb-feature` for feature work and `.agents/skills/catacomb-review` for quality review. Assign separate file ownership to parallel agents; the main agent reviews and integrates. Git hooks install during pnpm install; verify `git config core.hooksPath` returns `.githooks`. CI additionally audits dependencies and scans secrets; CodeQL and Dependabot configuration are included. GitHub availability, licensing, branch protections and hosted workflow execution must be confirmed when a remote is connected. No remote is configured.

This is a desktop vertical slice with raster pixel artwork and initial balance. CI targets Node 24 LTS; local verification may use compatible Node 26. Dependency versions are captured in pnpm-lock.yaml. See SECURITY.md for browser storage and future hosting boundaries.

## Visual assets

Scene backgrounds and a transparent 5×2 character atlas live in `public/art/`. See `public/art/ART-DIRECTION.md` for direction, generation provenance and prompt specifications. UI uses locally bundled pixel fonts. `outputs/lobby.png` and `outputs/combat.png` are review captures.

## Rules and feedback

The top navigation FAQ opens the Field Guide without discarding the current expedition. It explains skills, costs, limits, Inspired, enemy blessings/curses, room recovery, carried rewards and permanent XP mastery. Field Notes records actual numeric outcomes. Selected-enemy previews distinguish modified power, armor, Guard and actual HP damage. Attacks retain a living enemy target within the same cat turn; support actions, End turn, automatic turn changes, defeated targets and room results clear selection. Timed effects tick only at the affected unit’s turn starts. At zero AP the engine automatically skips cats, resolves enemy turns and refills AP for the new round. Status icons above each unit show game-styled tooltips on hover or keyboard focus. Full-health healing and redundant full-duration buffs are blocked. Room rewards remain carried until boss victory and Return to lobby; they are displayed separately from banked progress.

The healer is displayed as Mei. Her internal `clover` ID remains stable to preserve existing training and equipment saves.

## Portable project and continuation

Start with [docs/TRANSFERENCIA.md](docs/TRANSFERENCIA.md) to move the project to another computer, install without global pnpm and transfer browser progress. [docs/HANDOFF.md](docs/HANDOFF.md) records the design, final decisions and next requested iterations. The portable ZIP and SHA-256 manifest are under `outputs/transfer/`.

The project-owned skills, hidden workflow/hook configuration, final assets, initial character draft, font licenses, tests and documentation are included. No global Codex configuration or company data is required. Tool availability in a new Codex installation is separate from project files.

## Play online

The game is deployed to GitHub Pages on every push to `main`: https://brugnoni.github.io/catacomb-cats/. Progress is stored in each visitor's own browser (`localStorage`) and is not shared between devices.
