import { createFileRoute } from "@tanstack/react-router";
import { ContactLink, SupportEmailLink, LegalPage, legalHead, type LegalSection } from "@/components/legal";

export const Route = createFileRoute("/accessibility")({
  staticData: { sitemap: true },
  head: () => legalHead("Accessibility — Close & Open", "Close & Open aims to meet WCAG 2.2 level AA. How we test, and how to report a problem.", "/accessibility"),
  component: () => <LegalPage title="Accessibility" sections={SECTIONS} />,
});

const SECTIONS: LegalSection[] = [
  { title: "Our goal", body: ["Close & Open aims to conform to WCAG 2.2 level AA. It is not formally certified."] },
  { title: "How we test", body: [
    "The site is maintained by one person and tested with keyboard navigation, automated checks, and the reduced-motion, reduced-transparency and increased-contrast settings.",
    "We can't cover every assistive-technology combination.",
  ] },
  { title: "Report a problem", body: [<>If something doesn't work for you, tell us via the <ContactLink /> page. Include the page and what went wrong.</>] },
  { title: "Contact", body: [<>Email <SupportEmailLink />, or use the <ContactLink /> page.</>] },
];
