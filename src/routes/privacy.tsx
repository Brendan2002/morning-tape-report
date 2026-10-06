import { createFileRoute } from "@tanstack/react-router";
import { ContactLink, EmailLink, LegalPage, legalHead, type LegalSection } from "@/components/legal";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => legalHead("Privacy Policy — Close & Open", "How Close & Open handles data: no account needed, no ad or analytics tracking of our own, and only what you choose to send in issue reports.", "/privacy"),
  component: () => <LegalPage title="Privacy Policy" sections={SECTIONS} />,
});

const SECTIONS: LegalSection[] = [
  { title: "Who is responsible", body: [<>Close & Open is run by an independent creator. You can reach us through the Report an issue form on the <ContactLink /> page.</>] },
  { title: "What we don't collect by default", body: [
    "You can read everything on Close & Open without an account and without giving any personal information.",
    "We don't sell personal information and we don't do behavioural advertising.",
  ] },
  { title: "What data is involved", body: [
    "Issue reports you choose to send: issue type, description, page context, optional email, your browser's user agent, and a hashed IP address used only for rate limiting.",
    "Admin sign-in data, for the site owner only.",
    "Hosting infrastructure logs kept by our providers for security.",
    "Error diagnostics that help us find and fix problems with the site.",
  ] },
  { title: "Cookies and local storage", body: [
    "We don't set advertising or analytics cookies ourselves.",
    "Local storage only remembers your theme choice. Admin sign-in uses strictly necessary storage.",
    <>Live quote and chart widgets are third-party embeds that load from TradingView's servers. TradingView may set its own cookies or collect usage data under its <a href="https://www.tradingview.com/privacy-policy/" target="_blank" rel="noopener noreferrer">privacy policy</a>.</>,
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
    <>TradingView — live quote and chart widgets, loaded directly from TradingView's servers in your browser; TradingView may set cookies or collect usage data under its <a href="https://www.tradingview.com/privacy-policy/" target="_blank" rel="noopener noreferrer">privacy policy</a>.</>,
    "Economic data comes from FRED, the Federal Reserve Bank of New York, the U.S. Treasury, EIA, USDA AMS (DataMart and Dairy Market News) and USDA AgTransport. Our servers don't send them any information about you.",
  ] },
  { title: "International processing", body: ["Our providers may process data outside your country under their own terms."] },
  { title: "Your privacy rights", body: [<>Depending on where you live, you can request access, correction, deletion, restriction, objection or portability under applicable law. Ask via the <ContactLink /> page.</>] },
  { title: "Analytics", body: ["Close & Open does not run its own analytics or tracking. Embedded TradingView widgets may collect usage data under TradingView's own policy (see above)."] },
  { title: "Children's privacy", body: ["Close & Open is not directed at children under 13, and we don't knowingly collect their data."] },
  { title: "Changes to this policy", body: ["Changes are reflected by updating the \"Last updated\" date above."] },
  { title: "Contact", body: [<>Email <EmailLink />, or use the <ContactLink /> page.</>] },
];
