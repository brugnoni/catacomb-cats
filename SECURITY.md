# Security and data

The game has no accounts, secrets, analytics or server. Browser saves are untrusted input, validated at load. Local saves can be edited by the player; anti-cheat is not a goal. Saves are not encrypted or backed up. Do not store personal information in saves.

React renders game text without HTML injection. The HTML content policy limits resources to this origin. GitHub Pages serves HTTPS but cannot send custom headers, so `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` and a Permissions-Policy are not set; a host that allows headers must set them. Do not add a backend or payment flow without a new threat review.

CI runs a dependency audit, secret scanning and CodeQL, with Actions pinned to commit SHAs. GitHub secret scanning, push protection and Dependabot alerts and security updates are enabled. Investigate findings; never suppress them to pass checks. Keep lockfile changes reviewed.

Git hooks are local safeguards and can be bypassed by Git options; `main` is protected on GitHub: changes enter by squash-merged PR with CI green, with no force-push or deletion, administrators included. No tool can guarantee zero defects.
