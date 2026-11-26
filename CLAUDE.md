# CLAUDE.md

Source of truth for how software is built in Catacomb Cats, for agents and people. A rule lives here once; other files link to it. If another document disagrees with this one about process, this one wins; about game behavior, the code (`src/game.ts`, `src/progression.ts`) wins. Fix the stale document when you notice it.

Personal browser roguelite: React 19, TypeScript, Vite, Node 24. Public repository, deployed to https://brugnoni.github.io/catacomb-cats/.

## Read when

| Before                                           | Read                                                |
| ------------------------------------------------ | --------------------------------------------------- |
| Changing code                                    | `docs/ARCHITECTURE.md`                              |
| Changing gameplay or balance                     | `docs/HANDOFF.md` (accepted decisions and behavior) |
| Naming anything in code, UI or replies           | `GLOSSARY.md`                                       |
| Reworking a past decision                        | `docs/adr/`                                         |
| Touching saves, CSP, dependencies, CI or hosting | `SECURITY.md`                                       |
| Writing specs or tickets                         | `docs/agents/`                                      |

## Workflow

1. **Understand.** Change nothing until you are 95% confident of what to build; ask until you are.
2. **Isolate.** Run the overlap check (see Parallel chats) and work on a branch. Never commit to `main`.
3. **Build.** Reuse the codebase, then the platform, then a dependency already installed. Fix a bug with a failing regression test first; gameplay changes need meaningful tests.
4. **Verify.** `pnpm check` passes; visible changes are also checked in the browser.
5. **Review** the branch diff.
6. **Push and open a PR**, after approval.
7. **Merge** by squash with CI green, after approval. The merge deploys.
8. **Confirm** the deploy succeeded and the site loads.

### Ask the user first

- Push, merge, or anything else that changes GitHub or the live site.
- Adding, removing or upgrading a dependency.
- Changing the save format, storage keys or internal ids.
- Changing balance or game rules beyond what was requested.
- Changing CI, hooks, permissions or repository settings.
- Deleting files, branches or worktrees.

Everything else inside the requested scope (local refactors, tests, texts) proceeds without asking. Approval covers the action asked about, once. The user chooses each phase of the work; agents never commit on their own initiative outside it.

### Done means

- Tests cover the change.
- `pnpm check` passes.
- Visible text exists in English and Spanish.
- Docs the change made wrong are updated.
- Visible changes were verified in the browser.
- The report says what was not checked.

### Pull requests

One PR does one thing. Aim for under about 400 changed lines (a guide, not a limit). The description says what, why and how it was tested.

### Commits

A brief subject line, then a short description. No `Co-Authored-By` or other attribution lines, in commits or PRs.

### If production breaks

Revert the PR first (with approval), then fix calmly. Before reverting a change that touched saves, check that the older version can read saves written by the newer one.

## Commands

`pnpm` is often not on PATH; use the pinned version through npm:

```
npm exec --yes --package=pnpm@11.25.0 -- pnpm <script>
```

- `pnpm install --frozen-lockfile`, then `pnpm exec playwright install chromium` once
- `pnpm dev`: Vite on http://127.0.0.1:5173
- `pnpm format`, then `pnpm check` (format, lint, types, unit tests, build, browser tests)
- One unit file: `pnpm exec vitest run src/game.test.ts` (one test: `-t "name"`)
- One browser test: `pnpm exec playwright test -g "name"` (run `pnpm build` first)

The pre-commit hook runs `pnpm check` (format check only for documentation-only commits). Never bypass it or suppress a finding to make it pass.

## Dependencies

- A new one is the last resort. First say what it is for, its license, how maintained it is and its size, then wait for approval.
- Only `pnpm`, one lockfile, committed with the change.
- One major version upgrade per PR.
- GitHub Actions are pinned to a commit SHA with the version in a comment.

## Security

- The repository is public: never commit secrets, personal data or anything private.
- Personal project: never access or reuse company information, code, credentials or integrations.
- No backend, telemetry or remote services; those need a new threat review.
- One remote (`origin`, github.com/brugnoni/catacomb-cats). Never force-push `main`. Deploy only to GitHub Pages through `.github/workflows/ci.yml`.
- Never write to `localStorage` of `http://localhost:5173` in a shared browser: it is the user's real save. Seed saves on `127.0.0.1` or in Playwright.

## Code rules

- Game rules stay in the pure engine, independent of React.
- Internal ids (`clover` is Mei, `pip` is Pursian, `ember` is Tuntun, ability and effect ids) never change. Saves are versioned; keep migrations.
- Every visible text goes through `t()` with a Spanish entry.
- Balance values and their descriptions agree.
- Code, identifiers, commits and all documentation are in English (game translations live in `src/es/`).
- Generate images only when asked.

## Decisions

Write an ADR in `docs/adr/` only when a decision is hard to reverse, surprising without context and the result of a real trade-off.

## Parallel chats

One chat = one branch = one worktree = one PR. `pnpm stack <cmd>` (`scripts/stack.mjs`) keeps the registry `.scratch/lanes.json` in the primary checkout (git-ignored): `status`, `new <branch> [--on parent] [--files a,b]`, `adopt <branch>`, `submit [tip]`, `land [tip]`.

- **Overlap check before the first edit**, even for a quick fix: run `status` and `gh pr list --state open`; compare the files you expect to change (`git diff --name-only origin/main...<lane>`). If another lane, open PR or chat touches one, stop and tell the user. Otherwise register your lane. Repeat if the plan grows. Never edit another chat's branch or worktree.
- Hot spots: `src/engine/units.ts`, `src/es/ui.ts`, `src/progression.ts`, `src/styles/*.css`.
- Branch from `main`; stack (`--on parent`) only when B needs A's code, at most 3 deep.
- A behavior-free move or rename of shared files is its own short lane: start it when no open lane touches them, land it first, then every lane merges `main`.
- Before every merge, copy the work's `.scratch/<feature>` folder and handoff notes into the primary checkout's `.scratch/` and add an entry to `.scratch/changelog.md` there (date, PRs, what changed). Landing removes the worktree and its ignored files.
- Leave `docs/HANDOFF.md` alone on a feature lane; write `.scratch/handoff-<branch>.md`. A docs pass folds them in after landing.
- `submit` and `land` push (`--force-with-lease`, lane branches only) and merge. Run them only after approval, then pass `--yes`. On a rebase conflict, resolve in that lane's worktree and rerun.

## Agent skills

- Issue tracker: local markdown under `.scratch/`, see `docs/agents/issue-tracker.md`.
- Triage labels: `docs/agents/triage-labels.md`.
- Domain docs: `GLOSSARY.md` and `docs/adr/`, see `docs/agents/domain.md`.
- Project skills: `.agents/skills/catacomb-feature` and `.agents/skills/catacomb-review`.
