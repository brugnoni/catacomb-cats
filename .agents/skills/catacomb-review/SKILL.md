---
name: catacomb-review
description: Review Catacomb Cats changes for gameplay correctness, browser safety, persistence and test gaps.
---

Read the diff and relevant engine/UI callers. Check illegal actions cannot mutate state, shared AP cannot go negative, defeated units cannot act, rewards cannot be claimed twice, and stored progress is validated before use. Inspect dependencies, browser content policy and workflow permissions for changes. Report actionable findings with reproduction and file locations. Check regression tests cover fixes and run pnpm check before accepting a commit. Never bypass hooks or use company data.
