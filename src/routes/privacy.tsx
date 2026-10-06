import { createFileRoute } from "@tanstack/react-router";
import { ContactLink, LegalPage, legalHead, type LegalSection } from "@/components/legal";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => legalHead("Privacy Policy — Morning Tape", "How Morning Tape handles data: no account needed, no ad or analytics tracking, and only what you choose to send in issue reports."),
  component: () => <LegalPage title="Privacy Policy" sections={SECTIONS} />,
});

const SECTIONS: LegalSection[] = [
  { title: "Who is responsible", body: [<>Morning Tape is run by an independent creator. You can reach us through the Report an issue form on the <ContactLink /> page.</>] },
  { title: "What we don't collect by default", body: [
    "You can read everything on Morning Tape without an account and without giving any personal information.",
    "We don't sell personal information and we don't do behavioural advertising.",
  ] },
  { title: "What data is involved", body: [
    "Issue reports you choose to send: issue type, description, page context, optional email, your browser's user agent, and a hashed IP address used only for rate limiting.",
    "Admin sign-in data, for the site owner only.",
    "Hosting infrastructure logs kept by our providers for security.",
    "Error diagnostics that help us find and fix problems with the site.",
  ] },
  { title: "Cookies and local storage", body: [
    "We use no advertising or analytics cookies.",
    "Local storage only remembers your theme choice. Admin sign-in uses strictly necessary storage.",
  ] },
  { title: "Purposes and lawful bases (EEA/UK)", body: [
    "Our legitimate interests in running, securing and fixing the site.",
    "Responding to reports you send us.",
  ] },
  { title: "How long data is kept", body: [
    "Issue reports are kept until resolved and then deleted within 12 months.",
    "Optional emails are deleted together with their report.",
    "Provider logs are kept according to each provider's own policies.",
  ] },
  { title: "Service providers", body: [
    "Lovable — hosting and error monitoring.",
    "Supabase — database and authentication.",
    "Resend — sending issue-report notification emails, if enabled.",
    "Market and economic data comes from Yahoo Finance, FRED, the Federal Reserve Bank of New York, the U.S. Treasury, EIA, USDA AMS Dairy Market News and USDA AgTransport. We don't send them any information about you.",
  ] },
  { title: "International processing", body: ["Our providers may process data outside your country under their own terms."] },
  { title: "Your privacy rights", body: [<>Depending on where you live, you can request access, correction, deletion, restriction, objection or portability under applicable law. Ask via the <ContactLink /> page.</>] },
  { title: "Analytics", body: ["Morning Tape does not currently use any analytics or tracking service."] },
  { title: "Children's privacy", body: ["Morning Tape is not directed at children under 13, and we don't knowingly collect their data."] },
  { title: "Changes to this policy", body: ["Changes are reflected by updating the \"Last updated\" date above."] },
  { title: "Contact", body: [<>Use the <ContactLink /> page.</>] },
];
