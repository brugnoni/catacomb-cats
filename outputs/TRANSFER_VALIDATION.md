# Transfer validation: 2026-11-23

Historical record of one packaging run.

`npm exec --yes --package=pnpm@11.25.0 -- pnpm check` was run again while preparing the package:

- Prettier format: passed.
- ESLint: passed.
- TypeScript: passed.
- Engine, progression and simulation tests: 71 passed.
- Production build: passed, with local assets, fonts and license notices.
- Chromium tests of the built application: 21 passed.

Environment: macOS, Node v26.0.0 and npm 11.12.1. The project and CI target Node 24 LTS. This check does not replace running the checks on the target operating system.

## Contents and independence

Every asset the application uses is inside the project; the first atlas draft was kept in assets/source. The two skills are local files under .agents/skills. Font, React, React DOM and Scheduler licenses are included. No services or keys are needed to run the game.

The package includes the dist build, hidden files, code and documentation. node_modules, caches, temporary test results and Git metadata are not transferred; dependencies are reinstalled from the lockfile. The original repository had no commits or remotes when packaged.

The packager writes a SHA-256 manifest and a ZIP checksum. Transfer verification checks the files of that snapshot and was repeated on an extraction in another location. The manifest excludes its own hash and package files that would be generated recursively.

Your real browser progress is not included. The transfer guide, docs/TRANSFER.md, explains how to copy it.
