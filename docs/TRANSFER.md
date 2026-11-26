# Moving Catacomb Cats to another computer

The simplest way is to clone the public repository, https://github.com/brugnoni/catacomb-cats. Without GitHub access, use the portable ZIP.

## Portable ZIP

Build it on the source computer (needs Python 3):

```sh
npm exec --yes --package=pnpm@11.25.0 -- pnpm build
python3 scripts/package-project.py
node scripts/verify-transfer.mjs
```

It writes `outputs/transfer/catacomb-cats-portable.zip`, its `.sha256` checksum and a manifest. The ZIP holds source, hidden configuration, project skills, assets, documentation and the `dist` build; it omits `.git`, `node_modules`, caches, test results and secrets. Dependencies include native programs, so reinstall them on the target computer. Keep the checksum next to the ZIP.

If you copy the folder by hand instead, include `.agents`, `.github`, `.githooks`, `.nvmrc` and the configuration files, and leave out `node_modules` and caches.

## Setup

Install Node.js 24 LTS (it includes npm) and Git. Inside the project folder:

```sh
node --version
npm --version
npm exec --yes --package=pnpm@11.25.0 -- pnpm install --frozen-lockfile
npm run dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173/`. `Ctrl+C` stops it. Do not use `npm install`: the project keeps a single pnpm lockfile. Installing needs internet; playing afterwards needs no API keys or services.

Start by reading `CLAUDE.md`, `README.md` and `docs/HANDOFF.md`.

## Quality checks

```sh
npm exec --yes --package=pnpm@11.25.0 -- pnpm exec playwright install chromium
npm exec --yes --package=pnpm@11.25.0 -- pnpm check
```

On Linux, Playwright may need system libraries: `playwright install --with-deps chromium`.

## Git and the hook (ZIP only)

```sh
git init -b main
node scripts/install-hooks.mjs
git config core.hooksPath
```

The last command must print `.githooks`. On macOS or Linux, if unzipping lost the executable bit, run `chmod +x .githooks/pre-commit`. Git may ask for your author identity before the first commit; none is included.

## Run the included build

With dependencies installed, `npm run preview` serves `dist`. Serve it over HTTP (any static server works, in any folder); do not open `dist/index.html` by double-clicking.

## Your saved progress

Progress lives in the browser's `localStorage`; neither the ZIP nor `dist` contains your game. In the camp, use **Export progress** to download `catacomb-cats-save.json`, copy that file, and use **Import progress** on the new computer. Import replaces the current progress after a confirmation.

`localhost`, `127.0.0.1`, different ports, browsers and profiles each have separate storage. The active Run is not saved: finish or abandon it before exporting.

## Verifying a copy

`node scripts/verify-transfer.mjs` compares the files with the SHA-256 manifest of the package. The manifest is a snapshot: files edited later will be reported, as expected.
