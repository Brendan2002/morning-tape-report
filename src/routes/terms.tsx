import { createFileRoute } from "@tanstack/react-router";
import { Group, PageHeader } from "@/components/tape";
import { FRED_TERMS_URL, FredNotice } from "@/components/legal";

const T = "Terms of Use — Morning Tape";
const D = "Morning Tape is a free, non-commercial, informational market report. Not investment advice.";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: T }, { name: "description", content: D },
      { property: "og:title", content: T }, { property: "og:description", content: D },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Terms of Use" />
      <Group>
        <div className="row text-[15px]">Morning Tape is free and non-commercial. It is provided for information only.</div>
        <div className="row text-[15px]">Nothing on this site is investment, financial, tax or legal advice. Data may be delayed, incomplete or unavailable.</div>
        <div className="row !block text-[15px]">
          By using this site you agree to be bound by the{" "}
          <a href={FRED_TERMS_URL} target="_blank" rel="noopener noreferrer">FRED® API Terms of Use</a>.
        </div>
        <div className="row text-[15px]"><FredNotice /></div>
      </Group>
    </div>
  );
}
