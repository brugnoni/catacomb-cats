# Security and data

The game has no accounts, secrets, analytics or server. Browser saves are untrusted input, validated at load. Local saves can be edited by the player; anti-cheat is not a goal. Saves are not encrypted or backed up. Do not store personal information in saves.

React renders game text without HTML injection. The HTML content policy limits resources to this origin. A future public host must supply HTTPS and CSP headers including `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` and a restrictive Permissions-Policy. Do not add a backend or payment flow without a new threat review.

CI runs dependency audit and secret scanning. Investigate findings; never suppress them simply to pass checks. Keep lockfile changes reviewed. CI is prepared locally and has not run on GitHub yet.

Git hooks are local safeguards and can be bypassed by Git options; remote branch protection will be required once hosting is enabled. No tool can guarantee zero defects.
