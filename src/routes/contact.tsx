import { createFileRoute } from "@tanstack/react-router";
import { Group, PageHeader } from "@/components/tape";
import { legalHead } from "@/components/legal";
import { useReportIssue } from "@/components/report-issue";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => legalHead("Contact — Morning Tape", "How to reach Morning Tape: send a message through the Report an issue form."),
  component: Contact,
});

function Contact() {
  const open = useReportIssue();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Contact" />
      <Group>
        <div className="row !block text-[0.9375rem]">The best way to reach us is the Report an issue form. Use it for questions, corrections, privacy requests or accessibility problems.</div>
        <div className="row !block text-[0.9375rem]">Add your email if you'd like a reply. It's optional.</div>
      </Group>
      <button className="btn-primary mt-6" onClick={() => open({ field: "Contact" })}>Send a message</button>
    </div>
  );
}
