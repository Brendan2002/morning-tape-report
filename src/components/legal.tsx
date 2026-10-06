import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Group, PageHeader } from "@/components/tape";
export const FRED_TERMS_URL = "https://fred.stlouisfed.org/docs/api/terms_of_use.html";

export function FredNotice() {
  return (
    <a href={FRED_TERMS_URL} target="_blank" rel="noopener noreferrer">
      This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.
    </a>
  );
}


export const LEGAL_UPDATED = "October 6, 2026";

export const ContactLink = () => <Link to="/contact">Contact</Link>;

export const CONTACT_EMAIL = "hello@closeandopen.com";
export const SUPPORT_EMAIL = "support@closeandopen.com";
export const EmailLink = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
export const SupportEmailLink = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export type LegalSection = { title: string; body: ReactNode[] };

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div className="max-w-2xl">
      <PageHeader title={title} subtitle={`Last updated: ${LEGAL_UPDATED}`} />
      <div className="space-y-6">
        {sections.map((s, i) => (
          <Group key={s.title} label={`${i + 1}. ${s.title}`}>
            {s.body.map((b, j) => <div key={j} className="row !block text-[0.9375rem]">{b}</div>)}
          </Group>
        ))}
      </div>
    </div>
  );
}

export function legalHead(title: string, description: string, path: string) {
  const url = `https://closeandopen.com${path}`;
  return {
    links: [{ rel: "canonical", href: url }],
    meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "website" }, { property: "og:url", content: url }, { name: "twitter:card", content: "summary" },
    ],
  };
}

/** Site-wide disclaimer, shown in the footer and next to the rates on Macro & Rates. */
export const NYFED_TERMS = "https://www.newyorkfed.org/privacy/termsofuse";
export function SiteDisclaimer({ fred = true }: { fred?: boolean }) {
  return (
    <>
      {fred && <p><FredNotice /></p>}
      <p className="mt-2">Live quotes by TradingView, may be delayed. Economic data from original agencies via FRED; SOFR and EFFR from the NY Fed. Not investment advice.</p>
    </>
  );
}
