---
name: catacomb-feature
description: Implement or change Catacomb Cats gameplay and interface features with regression coverage.
---

Read CLAUDE.md and docs/ARCHITECTURE.md. Keep game rules in the pure engine, with balance values in data. Test observable outcomes using deterministic state; include invalid actions and persistence compatibility when relevant. Preserve initiative and shared AP semantics. Run pnpm check before a commit and report actual results. Push and publish only as CLAUDE.md allows.
