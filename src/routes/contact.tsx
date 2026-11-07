import { createFileRoute } from "@tanstack/react-router";
import { Group, PageHeader } from "@/components/tape";
import { EmailLink, SupportEmailLink, legalHead } from "@/components/legal";
import { useReportIssue } from "@/components/report-issue";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => legalHead(
    "Contact — Close & Open",
    "Contact Close & Open: report a wrong number, a broken link or a typo, ask a question about the site or its data, or make a privacy or accessibility request.",
    "/contact",
  ),
  component: Contact,
});

function Contact() {
  const open = useReportIssue();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Contact" subtitle="Corrections, questions, privacy and accessibility requests." />
      <p className="mb-6 text-[0.9375rem] leading-[1.45] text-muted-foreground">
        Close &amp; Open is a free daily market report. Tell us if a number looks wrong, a link is broken,
        a page is hard to read or use, or you have a question about the site or where its data comes from.
      </p>
      <button className="btn-primary" onClick={() => open({ field: "Contact" })}>Report an issue</button>
      <Group label="Or email us" className="mt-8" footer="Add your email in the form if you'd like a reply — it's optional.">
        <div className="row !block text-[0.9375rem]">
          <span className="block text-[13px] text-muted-foreground">General questions and corrections</span>
          <span className="mt-0.5 block"><EmailLink /></span>
        </div>
        <div className="row !block text-[0.9375rem]">
          <span className="block text-[13px] text-muted-foreground">Privacy rights requests and accessibility problems</span>
          <span className="mt-0.5 block"><SupportEmailLink /></span>
        </div>
      </Group>
    </div>
  );
}
