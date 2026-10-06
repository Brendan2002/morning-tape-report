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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Morning Tape — Daily market report" },
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
  return (
    <header className="nav-glass sticky top-0 z-40 border-b border-separator">
      <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 pt-1 md:px-8">
        <Link to="/" className="font-display text-[20px] font-bold tracking-tight text-foreground no-underline">
          Morning Tape
        </Link>
        <div className="ml-auto"><ThemeToggle /></div>
      </div>
      <nav aria-label="Sections" className="mx-auto max-w-[1080px] overflow-x-auto px-4 pb-2 md:px-8">
        <div className="segmented">
          {NAV.map((n) => (
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
  return (
    <QueryClientProvider client={queryClient}>
      <ReportIssueProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-elevated focus:px-3 focus:py-2">Skip to content</a>
        <Nav />
        <main id="main" className="mx-auto max-w-[1080px] px-4 py-8 md:px-8 md:py-12">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-[1080px] px-4 pb-12 text-[13px] text-muted-foreground md:px-8">
          Quotes from Yahoo Finance may be delayed and are unofficial. Economic data from FRED. Not investment advice.{" "}
          <Link to="/sources">Sources & methodology</Link>
        </footer>
      </ReportIssueProvider>
    </QueryClientProvider>
  );
}
