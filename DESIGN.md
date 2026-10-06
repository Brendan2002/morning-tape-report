# Close & Open — Design System

Apple-style UI patterns (iOS/macOS Settings, Stocks, apple.com) with Close & Open colors. Learn from Apple's patterns; never copy Apple branding, logos or imagery.

## Data rules (non-negotiable)
- Every number shows: as-of time, comparison period (e.g. "vs prior close") and source.
- If data can't be fetched or confirmed, show "Unavailable" — never invent, estimate, or present stale values as current.
- "As of" timestamps on every live panel.
- No LIBOR (ceased Sep 30, 2024). Use SOFR and EFFR.
- Never show personal financial information.

## Typography
- Stack: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif. Display sizes use "SF Pro Display" first.
- Scale: 48 page large title (700, -0.02em) / 34 section title (700) / 22 group header (600) / 17 body / 15 secondary / 13 captions and uppercase group labels (+0.02em).
- All numbers use `font-variant-numeric: tabular-nums`. No monospace for numbers.

## Color (light / dark)
| Token | Light | Dark |
|---|---|---|
| Background | #FBFAF7 | #000000 |
| Grouped surface | #FFFFFF | #1C1C1E |
| Elevated | #FFFFFF | #2C2C2E |
| Text primary | #141414 | #F5F5F7 |
| Text secondary | #6E6E73 | #98989D |
| Separator | rgba(60,60,67,0.18) | rgba(84,84,88,0.5) |
| Accent (only accent) | #1F3A5F | #6E9BD1 |
| Up | #1F8A4C | #30D158 |
| Down | #C2362B | #FF453A |
Neutral / unavailable = secondary text. Dark mode follows prefers-color-scheme with a manual toggle.

## Spacing & shape
- 4-pt scale: 4, 8, 12, 16, 24, 32, 48, 64. Content max-width ~1080px; 16px gutter mobile, 24–32px desktop.
- Radius: 12px grouped lists/sheets, 8px controls, 980px pill primary buttons.
- Hairline separators (0.5px retina, 1px fallback), inset from the left like iOS lists.

## Components
- Grouped inset lists are the primary container — not card grids. Rows: label left, value right, chevron for drill-in.
- Change badges like Stocks: rounded pill, green/red fill, white text, tabular figures.
- Sticky translucent top nav (`backdrop-filter: saturate(180%) blur(20px)`), left-aligned wordmark "Close & Open", segmented control for sections.
- Large left-aligned page titles with date beneath in secondary text. No centered heroes, gradients, decorative elements, or three-column feature grids.
- Primary button: filled navy pill. Secondary: plain accent text button.
- Sheets slide up from the bottom on mobile; centered dialog on desktop.
- Charts: thin lines, no gridline clutter, accent or up/down color; hover/tap shows value + date.
- Motion: 150–250ms ease-out; respect prefers-reduced-motion.

## Accessibility & responsive
- WCAG AA contrast, visible accent focus rings, full keyboard navigation, 44px tap targets.
- Works at 320px and 375px with no horizontal page scroll; tables collapse into grouped lists on mobile.

## Mobile (below 768px)

Mobile is a distinct, native-feeling layout, not the desktop page squeezed down. Desktop is unchanged.

- **Navigation:** fixed bottom tab bar on a translucent material, padded by the safe-area inset, with 5 tabs (line icon + short label): Today, Markets, Rates, Dairy, More. The active tab uses the navy accent. "More" is a grouped-list page with Calendar, Archive, Sources, Privacy, Terms, Accessibility, Contact, Appearance (Auto/Light/Dark) and admin Watchlist / sign-in. No horizontally scrolling top nav on mobile.
- **Top bar:** slim (44px) bar. The large "Close & Open" wordmark scrolls away and a small centered title fades in, like iOS large titles. The bar is borderless and solid until scrolled.
- **Today:** compact header (date + "as of" in secondary text, headline at ~28px, summary at body size in primary text) → "Key numbers" TradingView ticker tape (labelled "Live quotes by TradingView (may be delayed)") → sticky segmented control (Brief · Snapshot · Why · Calendar · Business) that scrolls to sections and tracks the scroll position → "What mattered yesterday" as compact numbered rows that expand in place with their source link → market snapshot as grouped lists by region (US, Asia, Europe & futures, Rates, FX, Commodities), never a wide table. The live-markets sidebar is hidden on mobile; the strip replaces it.
- **Other pages:** grouped lists only; labelled groups collapse with a disclosure chevron; large charts are full-width at 160px tall; tapping a row opens a bottom sheet.
- **Touch:** tap targets ≥44px; pressed states on pointer-down; horizontal strips use scroll-snap with native momentum; no horizontal page scroll at 320px.
- **Accessibility:** reduced motion → instant section jumps and no slides; reduced transparency → solid tab bar, top bar and section control; keyboard focus order stays logical (skip link → wordmark → content → tab bar).

## Third-party quote widgets

- Live/delayed quotes and charts use TradingView's official embed widgets inside a grouped-list container, transparent background, theme-synced, width 100%, lazy-loaded. Keep TradingView's attribution link visible. Label them "Live quotes by TradingView (may be delayed)"; mark broker CFD symbols "(CFD)" with the CFD note. Official data (USDA, EIA, NY Fed, Treasury, FRED) stays in our own grouped-list design.
