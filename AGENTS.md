<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Close & Open architecture
- Live market data (Yahoo, cached in memory) and FRED data (never cached or stored, per FRED API terms) are fetched only in server functions (`src/lib/*.functions.ts`) — keeps keys server-side and avoids CORS.
- Issue reports are inserted by the `submitIssue` server function using the admin client after an IP-hash rate limit — anonymous users have insert-only access and no read access.
- Issue notification email goes through the Resend connector when linked; the issue is saved first so email failures never lose reports.
- Watchlist reads and writes require the `admin` role in `user_roles` (checked via `has_role`) — roles never live on profile rows.
- UI follows DESIGN.md: grouped inset lists and semantic tokens in `src/styles.css`; no hardcoded colors in components.
- The MCP server (`src/lib/mcp/`, mounted at `/mcp` by `mcpPlugin`) requires OAuth (Cloud auth as the authorization server, consent page at `/.lovable/oauth/consent`) and tools still read only public data via the anon client — keeps the endpoint from being an open proxy.

- FRED fetches are restricted to the `ALLOWED_FRED_SERIES` allowlist in `src/lib/macro.functions.ts` — stops the server's API key being used for arbitrary series.
- Official non-FRED sources (NY Fed, U.S. Treasury, EIA, USDA AMS, USDA AgTransport) are fetched in `src/lib/{nyfed,treasury,ag}.functions.ts`, caching only successful responses in memory — a failed call after expiry shows "Unavailable", never a carried-forward value.
- Mobile (<768px) uses one DOM with responsive classes plus mobile-only chrome in `src/components/mobile.tsx` (tab bar, key strip, section control, More page at `/more`) — avoids separate mobile routes and keeps SSR content identical for crawlers.
- Page-level horizontal overflow is suppressed with `overflow-x: clip` (not `hidden`) on html/body — `hidden` creates a scroll container that breaks sticky headers and window scroll listeners.
