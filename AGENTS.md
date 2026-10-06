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

## Morning Tape architecture
- Live market data (Yahoo) and FRED data are fetched only in server functions (`src/lib/*.functions.ts`) with in-memory caching — keeps keys server-side and avoids CORS.
- Issue reports are inserted by the `submitIssue` server function using the admin client after an IP-hash rate limit — anonymous users have insert-only access and no read access.
- Issue notification email goes through the Resend connector when linked; the issue is saved first so email failures never lose reports.
- Watchlist reads and writes require the `admin` role in `user_roles` (checked via `has_role`) — roles never live on profile rows.
- UI follows DESIGN.md: grouped inset lists and semantic tokens in `src/styles.css`; no hardcoded colors in components.
