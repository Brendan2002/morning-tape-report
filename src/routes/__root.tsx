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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <Shell>
      <div className="py-16">
        <p className="label-caps">404</p>
        <h1 className="mt-2 font-serif text-[28px]">Page not found</h1>
        <Link to="/" className="mt-4 inline-block underline">Back to today's report</Link>
      </div>
    </Shell>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <Shell>
      <div className="py-16">
        <h1 className="font-serif text-[28px]">This page didn't load</h1>
        <button className="mt-4 text-link underline" onClick={() => { router.invalidate(); reset(); }}>Try again</button>
      </div>
    </Shell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Morning Tape — Daily market report" },
      { name: "description", content: "A daily morning market report, dashboard, rates and calendar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
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
  { to: "/calendar", label: "Calendar" },
  { to: "/archive", label: "Archive" },
  { to: "/watchlist", label: "Watchlist" },
] as const;

function Stamp() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="num text-xs text-muted-foreground">&nbsp;</span>;
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" });
  return (
    <span className="text-xs text-muted-foreground">
      {date} · <span className="num">as of {time} ET</span>
    </span>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-8">
      <header className="pt-6 md:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-2 pb-3">
          <Link to="/" className="font-serif text-[28px] font-semibold leading-none text-foreground no-underline md:text-[40px]">
            Morning Tape
          </Link>
          <Stamp />
        </div>
        <nav className="rule-double border-b border-rule">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm md:gap-x-6">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className="text-foreground no-underline hover:text-link"
                  activeProps={{ className: "text-link font-semibold underline underline-offset-4" }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="py-6 md:py-8">{children}</main>
      <footer className="border-t border-rule py-6 text-xs text-muted-foreground">
        Morning Tape · Market data may be delayed. Not investment advice.
      </footer>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        <Outlet />
      </Shell>
    </QueryClientProvider>
  );
}
