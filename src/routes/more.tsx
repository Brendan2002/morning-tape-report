import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Group, PageHeader } from "@/components/tape";
import { ThemeRow } from "@/components/mobile";
import { useIsAdmin, useSession } from "@/components/auth";

export const Route = createFileRoute("/more")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "More — Close & Open" },
      { name: "description", content: "Calendar, archive, sources, legal pages, contact and appearance settings for Close & Open." },
      { property: "og:title", content: "More — Close & Open" },
      { property: "og:description", content: "Calendar, archive, sources, legal pages, contact and appearance settings for Close & Open." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: More,
});

type To = "/calendar" | "/archive" | "/sources" | "/privacy" | "/terms" | "/accessibility" | "/contact" | "/watchlist" | "/login";
function NavRow({ to, label, detail }: { to: To; label: string; detail?: string }) {
  return (
    <Link to={to} className="row row-action text-foreground no-underline">
      <span className="flex-1">{label}</span>
      {detail && <span className="text-[15px] text-muted-foreground">{detail}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function More() {
  const { session, ready } = useSession();
  const admin = useIsAdmin(session?.user.id);
  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-8">
        <Group label="Browse">
          <NavRow to="/calendar" label="Calendar" detail="Next 7 days" />
          <NavRow to="/archive" label="Archive" />
          <NavRow to="/sources" label="Sources" />
        </Group>
        <Group label="Settings">
          <ThemeRow />
        </Group>
        <Group label="About">
          <NavRow to="/privacy" label="Privacy" />
          <NavRow to="/terms" label="Terms" />
          <NavRow to="/accessibility" label="Accessibility" />
          <NavRow to="/contact" label="Contact" />
        </Group>
        {ready && (
          <Group label="Admin">
            {admin.data ? <NavRow to="/watchlist" label="Watchlist" /> : !session ? <NavRow to="/login" label="Admin sign-in" /> : <div className="row text-muted-foreground">Signed in (no admin access)</div>}
          </Group>
        )}
      </div>
    </>
  );
}
