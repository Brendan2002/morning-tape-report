import { createFileRoute } from "@tanstack/react-router";
import { ContactLink, EmailLink, FRED_TERMS_URL, FredNotice, LegalPage, legalHead, type LegalSection } from "@/components/legal";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => legalHead("Terms of Use — Close & Open", "Close & Open is a free, non-commercial market summary for general information. Not investment advice."),
  component: () => <LegalPage title="Terms of Use" sections={SECTIONS} />,
});

const SECTIONS: LegalSection[] = [
  { title: "What Close & Open is", body: ["A free, non-commercial daily market and economic summary for general information."] },
  { title: "Not investment advice", body: [
    "Nothing here is investment, financial, tax, legal or trading advice, or a recommendation to buy or sell anything. \"Our read\" sections are commentary.",
    "Do your own research or consult a licensed professional.",
  ] },
  { title: "Data accuracy", body: [
    "Data comes from third parties. It may be delayed, incomplete, revised or unavailable, and is not guaranteed.",
    "Prices from Yahoo Finance are unofficial and may be delayed.",
  ] },
  { title: "Third-party data terms", body: [
    <>By using this site you agree to be bound by the <a href={FRED_TERMS_URL} target="_blank" rel="noopener noreferrer">FRED® API Terms of Use</a>.</>,
    <FredNotice />,
  ] },
  { title: "Acceptable use", body: ["Don't disrupt the site, scrape it abusively, submit spam or abusive issue reports, or break the law."] },
  { title: "Intellectual property", body: [
    "The Close & Open name, design and written reports belong to the creator. Underlying data belongs to its owners.",
    "No commercial redistribution without permission.",
  ] },
  { title: "Disclaimer of warranties", body: ["The site is provided \"as is\", without warranties of any kind."] },
  { title: "Limitation of liability", body: ["We are not liable for losses from use of, or reliance on, the site, including trading or business decisions."] },
  { title: "Your consumer rights", body: ["Consumer protections that can't be waived under the law that applies to you are not affected."] },
  { title: "Governing law", body: ["These terms are governed by the laws of the State of Connecticut, USA."] },
  { title: "Changes to these terms", body: ["Continued use of the site means you accept the current terms. When they change, the \"Last updated\" date changes."] },
  { title: "Contact", body: [<>Email <EmailLink />, or use the <ContactLink /> page.</>] },
];
