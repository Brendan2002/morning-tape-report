import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight } from "lucide-react";
import { getFedOps, getRefRates, type RefRate, type RefRateId, type SeriesPt } from "@/lib/nyfed.functions";
import { ErrorRow, Group, LineChart, SkeletonRows, SourceTag, UNAVAILABLE, fmt, shortDate, signed } from "./tape";
import { FlagButton } from "./report-issue";
import { ResponsiveSheet, type Origin } from "./sheet";
import { SiteDisclaimer } from "./legal";

export const NYFED_TERMS_URL = "https://www.newyorkfed.org/privacy/termsofuse";
export function NyFedNotice() {
  return (
    <a href={NYFED_TERMS_URL} target="_blank" rel="noopener noreferrer">
      Reference rates and data from the Federal Reserve Bank of New York, subject to its Terms of Use
    </a>
  );
}

const LABEL: Record<RefRateId, string> = {
  SOFR: "SOFR",
  EFFR: "Effective fed funds rate (EFFR)",
  OBFR: "Overnight bank funding rate (OBFR)",
  TGCR: "Tri-party general collateral rate (TGCR)",
  BGCR: "Broad general collateral rate (BGCR)",
  SOFR30: "SOFR 30-day average",
  SOFR90: "SOFR 90-day average",
  SOFR180: "SOFR 180-day average",
  SOFRINDEX: "SOFR Index",
};

const valText = (r: RefRate) => (!r.available || r.value == null ? UNAVAILABLE : r.isIndex ? fmt(r.value, 8) : `${fmt(r.value, r.id.startsWith("SOFR") && r.id !== "SOFR" ? 5 : 2)}%`);
const spark = (h: SeriesPt[]) => h.map((p) => ({ label: shortDate(p.date), v: p.v }));

function RateRow({ r }: { r: RefRate }) {
  const sub =
    r.id === "EFFR" && r.targetFrom != null && r.targetTo != null ? ` · Fed target ${fmt(r.targetFrom)}–${fmt(r.targetTo)}%` : "";
  return (
    <div className="row !pr-2">
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-snug">{LABEL[r.id]}</div>
        <SourceTag>NY Fed{r.effectiveDate ? ` · ${shortDate(r.effectiveDate)}` : ""}{sub}</SourceTag>
      </div>
      <div className="shrink-0 text-right">
        <div className={r.available ? "" : "text-muted-foreground"}>{valText(r)}</div>
        <div className="text-[13px] text-muted-foreground">
          {r.available && r.change != null && r.priorDate
            ? `${signed(Math.round(r.change * 100), 0)} bp vs ${shortDate(r.priorDate)} (our calc.)`
            : r.available && (r.id === "SOFR" || r.id === "EFFR") ? "prior day unavailable" : "\u00a0"}
        </div>
      </div>
      <FlagButton ctx={{ field: LABEL[r.id], displayedValue: valText(r) }} />
    </div>
  );
}

type Detail = { origin: Origin; title: string; source: string; series: { name: string; pts: SeriesPt[]; fmtV: (v: number) => string }[] };

export function NyFedSection() {
  const rFn = useServerFn(getRefRates);
  const oFn = useServerFn(getFedOps);
  const rates = useQuery({ queryKey: ["nyfed-rates"], queryFn: () => rFn(), staleTime: 5 * 60_000, retry: 1 });
  const ops = useQuery({ queryKey: ["nyfed-ops"], queryFn: () => oFn(), staleTime: 5 * 60_000, retry: 1 });
  const [detail, setDetail] = useState<Detail | null>(null);
  const rrp = ops.data?.rrp, soma = ops.data?.soma;
  const bn = (v: number) => `$${fmt(v, 1)}bn`;
  const tn = (v: number) => `$${fmt(v, 3)}tn`;

  return (
    <section className="space-y-8">
      <Group
        label="Reference rates"
        footer={<>Date = the NY Fed's effective date. Day-over-day change vs the prior business day is our calculation (SOFR and EFFR). LIBOR ceased on Sep 30, 2024.</>}
      >
        {rates.isLoading ? <SkeletonRows rows={5} /> : rates.isError ? <ErrorRow message="couldn't reach the NY Fed" onRetry={() => rates.refetch()} /> : (rates.data ?? []).map((r) => <RateRow key={r.id} r={r} />)}
      </Group>

      <Group label="Fed operations & balance sheet" footer="ON RRP: change vs prior operation day. SOMA: weekly, change vs prior week and vs one year earlier. Tap a row for a larger chart.">
        {ops.isLoading ? <SkeletonRows rows={2} /> : ops.isError ? <ErrorRow message="couldn't reach the NY Fed" onRetry={() => ops.refetch()} /> : (
          <>
            <div className="row !pr-2">
              <button
                className="-my-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-left"
                disabled={!rrp?.available}
                onClick={(e) => rrp && setDetail({ origin: { x: e.clientX, y: e.clientY }, title: "Overnight reverse repo (ON RRP)", source: "NY Fed · total accepted, last 30 operations", series: [{ name: "Total accepted", pts: rrp.history, fmtV: bn }] })}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">Overnight reverse repo (ON RRP)</div>
                  <SourceTag>NY Fed{rrp?.date ? ` · ${shortDate(rrp.date)}` : ""}{rrp?.counterparties != null ? ` · ${rrp.counterparties} counterparties` : ""}</SourceTag>
                </div>
                <div className="hidden w-[96px] shrink-0 sm:block">{rrp?.available && <LineChart points={spark(rrp.history)} width={96} height={28} format={bn} label="ON RRP, 30 operations" />}</div>
                <div className="shrink-0 text-right">
                  <div className={rrp?.available ? "" : "text-muted-foreground"}>{rrp?.available && rrp.totalBn != null ? bn(rrp.totalBn) : UNAVAILABLE}</div>
                  <div className="text-[13px] text-muted-foreground">{rrp?.totalBn != null && rrp.priorBn != null && rrp.priorDate ? `${signed(rrp.totalBn - rrp.priorBn, 1)}bn vs ${shortDate(rrp.priorDate)}` : "\u00a0"}</div>
                </div>
                {rrp?.available && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
              </button>
              <FlagButton ctx={{ field: "ON RRP total accepted", displayedValue: rrp?.totalBn != null ? bn(rrp.totalBn) : UNAVAILABLE }} />
            </div>
            <div className="row !pr-2">
              <button
                className="-my-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-left"
                disabled={!soma?.available}
                onClick={(e) => soma && setDetail({ origin: { x: e.clientX, y: e.clientY }, title: "Fed balance sheet (SOMA holdings)", source: "NY Fed · weekly, 1 year", series: [
                  { name: "Treasuries (notes & bonds, bills, FRNs, TIPS)", pts: soma.treasuriesTn, fmtV: tn },
                  { name: "MBS (agency MBS + CMBS)", pts: soma.mbsTn, fmtV: tn },
                ] })}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">Fed balance sheet (SOMA holdings)</div>
                  <SourceTag>NY Fed{soma?.date ? ` · week of ${shortDate(soma.date)}` : ""}</SourceTag>
                </div>
                <div className="hidden w-[96px] shrink-0 sm:block">{soma?.available && <LineChart points={spark(soma.history)} width={96} height={28} format={tn} label="SOMA holdings, 1 year" />}</div>
                <div className="shrink-0 text-right">
                  <div className={soma?.available ? "" : "text-muted-foreground"}>{soma?.available && soma.totalTn != null ? tn(soma.totalTn) : UNAVAILABLE}</div>
                  <div className="text-[13px] text-muted-foreground">
                    {soma?.totalTn != null && soma.priorWeekTn != null ? `${signed((soma.totalTn - soma.priorWeekTn) * 1000, 1)}bn w/w` : ""}
                    {soma?.totalTn != null && soma.yearAgoTn != null ? ` · ${signed(soma.totalTn - soma.yearAgoTn, 3)}tn y/y` : ""}
                  </div>
                </div>
                {soma?.available && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
              </button>
              <FlagButton ctx={{ field: "SOMA holdings", displayedValue: soma?.totalTn != null ? tn(soma.totalTn) : UNAVAILABLE }} />
            </div>
          </>
        )}
      </Group>

      {!!ops.data?.mbsOps.length && (
        <Group label="Fed MBS operations" footer="Latest agency MBS operations; accepted amount at par. Source: NY Fed.">
          {ops.data.mbsOps.map((o, i) => (
            <div className="row" key={i}>
              <div className="min-w-0 flex-1">
                <div className="text-[0.9375rem]">{o.type}</div>
                <SourceTag>NY Fed · {shortDate(o.date)}</SourceTag>
              </div>
              <div className="shrink-0 text-right">{o.acceptedBn != null ? `$${fmt(o.acceptedBn, 3)}bn` : UNAVAILABLE}</div>
            </div>
          ))}
        </Group>
      )}

      <div className="group-footer space-y-2">
        <p><NyFedNotice /></p>
        <SiteDisclaimer fred={false} />
      </div>

      <ResponsiveSheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail?.title ?? ""} description={detail?.source} origin={detail?.origin}>
        {detail && (
          <div className="space-y-6 pt-4">
            {detail.series.map((s) => (
              <div key={s.name}>
                <p className="group-label px-0">{s.name}</p>
                <LineChart points={spark(s.pts)} width={560} height={180} format={s.fmtV} showValue label={`${s.name}`} />
                {s.pts.length > 0 && (
                  <div className="mt-2 flex justify-between text-[13px] text-muted-foreground">
                    <span>{shortDate(s.pts[0]!.date)}</span>
                    <span>Latest {s.fmtV(s.pts.at(-1)!.v)} · {shortDate(s.pts.at(-1)!.date)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ResponsiveSheet>
    </section>
  );
}
