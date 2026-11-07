# Close & Open — live verification (read-only, no changes)

No edits or republish proposed. Evidence gathered from https://closeandopen.com on Nov 7 2026:

- Home `/`: 200, latest title "Close & Open — Daily Market Report: Stocks, Rates & Agriculture" (newest patch), bundle `/assets/index-DbB46-IY.js`.
- Headers on `/`, `/sitemap.xml`, `/login`, `/watchlist`, 404 report: CSP (base as specified), X-Frame-Options SAMEORIGIN, Permissions-Policy (all 9 denied), Referrer-Policy strict-origin-when-cross-origin, nosniff.
- `/report/2099-01-01`: real 404 with full headers + noindex (fallback-header patch is live).
- Sitemap: 200, application/xml, 36 URLs, no login/watchlist/more.
- robots.txt: 200, allows crawlers, points to sitemap.
- Private noindex: `/login`, `/watchlist` carry `robots: noindex`.

## Blockers / unverifiable
- Commit a3d56ecc cannot be matched to the live bundle hash from here (no deployment-commit metadata exposed; building locally is out of scope). Live behaviour matches all patched features.
- robots.txt is a static file: no CSP / X-Frame-Options / Permissions-Policy (known, low risk).
