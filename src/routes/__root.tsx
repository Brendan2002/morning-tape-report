import { SiteDisclaimer, NYFED_TERMS } from "@/components/legal";
import { useSession, useIsAdmin } from "@/components/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ReportIssueProvider } from "@/components/report-issue";

function NotFoundComponent() {
  return (
    <div className="py-16">
      <h1 className="large-title">Page not found</h1>
      <Link to="/" className="btn-text mt-4">Back to today's report</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="py-16">
      <h1 className="large-title">This page didn't load</h1>
      <button className="btn-text mt-4" onClick={() => { router.invalidate(); reset(); }}>Try again</button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Close & Open" },
      { property: "og:site_name", content: "Close & Open" },
      { name: "application-name", content: "Close & Open" },
      { name: "apple-mobile-web-app-title", content: "Close & Open" },
      { name: "description", content: "A daily morning market report with markets, rates, calendar and sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_SCRIPT = `try{var t=localStorage.getItem('mt-theme');if(t==='dark'||t==='light')document.documentElement.classList.add(t)}catch(e){}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Today" },
  { to: "/markets", label: "Markets" },
  { to: "/macro", label: "Macro & Rates" },
  { to: "/dairy", label: "Dairy & Feed" },
  { to: "/calendar", label: "Calendar" },
  { to: "/archive", label: "Archive" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/sources", label: "Sources" },
] as const;

type Theme = "system" | "light" | "dark";
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const t = localStorage.getItem("mt-theme");
    if (t === "light" || t === "dark") setTheme(t);
  }, []);
  const next = () => {
    const n: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(n);
    const el = document.documentElement;
    el.classList.remove("light", "dark");
    if (n === "system") localStorage.removeItem("mt-theme");
    else { el.classList.add(n); localStorage.setItem("mt-theme", n); }
  };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      onClick={next}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-fill"
      aria-label={`Appearance: ${theme}. Switch appearance`}
      title={`Appearance: ${theme}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

function Nav() {
  const { session } = useSession();
  const admin = useIsAdmin(session?.user.id);
  const items = NAV.filter((n) => n.to !== "/watchlist" || admin.data === true);
  return (
    <header className="nav-glass sticky top-0 z-40 border-b border-separator">
      <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 pt-1 md:px-8">
        <Link to="/" className="font-display text-[20px] font-bold tracking-tight text-foreground no-underline">
          Close & Open
        </Link>
        <div className="ml-auto"><ThemeToggle /></div>
      </div>
      <nav aria-label="Sections" className="mx-auto max-w-[1080px] overflow-x-auto px-4 pb-2 md:px-8">
        <div className="segmented">
          {items.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} activeProps={{ className: "active", "aria-current": "page" }}>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // iOS Safari only applies :active on touch when a touch listener exists — gives pressed states on pointer-down.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ReportIssueProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-elevated focus:px-3 focus:py-2">Skip to content</a>
        <Nav />
        <main id="main" className="mx-auto max-w-[1080px] px-4 py-8 md:px-8 md:py-12">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-[1080px] px-4 pb-12 text-[13px] text-muted-foreground md:px-8">
          <SiteDisclaimer />
          <p className="mt-2"><a href={NYFED_TERMS} target="_blank" rel="noopener noreferrer">SOFR and EFFR: Federal Reserve Bank of New York, subject to its Terms of Use</a></p>
          <p className="mt-2">Sources also include EIA, U.S. Treasury and USDA AMS.</p>
          <p className="mt-2 flex flex-wrap gap-x-4"><Link to="/sources">Sources</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/accessibility">Accessibility</Link><Link to="/contact">Contact</Link></p>
        </footer>
      </ReportIssueProvider>
    </QueryClientProvider>
  );
}
