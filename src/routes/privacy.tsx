import { createFileRoute } from "@tanstack/react-router";
import { Group, PageHeader } from "@/components/tape";

const T = "Privacy — Morning Tape";
const D = "What Morning Tape collects: only what you submit in an issue report.";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: T }, { name: "description", content: D },
      { property: "og:title", content: T }, { property: "og:description", content: D },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Privacy" />
      <Group label="What we collect">
        <div className="row text-[15px]">Only what's submitted in an issue report: your optional email, your description, the page context (page address, report date, field and value shown), your browser's user agent, and a hashed IP address used solely for rate limiting.</div>
      </Group>
      <Group label="How it's used" className="mt-6">
        <div className="row text-[15px]">Only to fix reported problems.</div>
        <div className="row text-[15px]">It is never sold or shared.</div>
      </Group>
      <Group label="Contact" className="mt-6">
        <div className="row text-[15px]">Use "Report an issue" on any page.</div>
      </Group>
    </div>
  );
}
