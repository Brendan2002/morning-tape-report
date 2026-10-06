import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDairyPrices, getEiaDiesel, getFreight, getOfficialDairy, type DairyPrice, type OfficialMonthly } from "@/lib/ag.functions";
import { ErrorRow, Group, LineChart, SkeletonRows, SourceTag, UNAVAILABLE, fmt, shortDate, signed } from "./tape";
import { FlagButton } from "./report-issue";

export function useEiaDiesel() {
  const fn = useServerFn(getEiaDiesel);
  return useQuery({ queryKey: ["eia-diesel"], queryFn: () => fn(), staleTime: 10 * 60_000, retry: 1 });
}

const monthLabel = (ym: string) => new Date(ym + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export function EiaDieselGroup({ data }: { data: NonNullable<ReturnType<typeof useEiaDiesel>["data"]> }) {
  const spark = data.usHistory.map((p) => ({ label: shortDate(p.date), v: p.v }));
  return (
    <Group label="Retail diesel" footer="Weekly retail on-highway No. 2 diesel, all types. Change vs prior week. Source: EIA.">
      {data.rows.map((r) => (
        <div className="row !pr-2" key={r.area}>
          <div className="min-w-0 flex-1">
            <div className="font-medium leading-snug">{r.label}</div>
            <SourceTag>EIA · week of {shortDate(data.week!)}</SourceTag>
          </div>
          {r.area === "NUS" && spark.length > 1 && (
            <div className="hidden w-[96px] shrink-0 sm:block"><LineChart points={spark} width={96} height={28} label="US diesel, 13 weeks" format={(v) => `$${fmt(v, 3)}`} /></div>
          )}
          <div className="shrink-0 text-right">
            <div>${fmt(r.price, 3)}/gal</div>
            <div className="text-[13px] text-muted-foreground">{r.prior != null ? `${signed(r.price - r.prior, 3)} vs prior week` : "\u00a0"}</div>
          </div>
          <FlagButton ctx={{ field: `Diesel — ${r.label} (EIA)`, displayedValue: `$${fmt(r.price, 3)}/gal` }} />
        </div>
      ))}
    </Group>
  );
}

export function FreightGroup() {
  const fn = useServerFn(getFreight);
  const q = useQuery({ queryKey: ["agt-freight"], queryFn: () => fn(), staleTime: 30 * 60_000, retry: 1 });
  const d = q.data;
  return (
    <Group label="Freight" footer="Source: USDA AgTransport. Regional diesel is weekly (change vs prior week); grain truck rates are quarterly national averages per truckload-mile (change vs prior quarter).">
      {q.isLoading ? <SkeletonRows rows={4} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : (
        <>
          {!d?.diesel.available ? (
            <div className="row"><span className="flex-1">Regional diesel</span><span className="text-muted-foreground">{UNAVAILABLE}</span></div>
          ) : d.diesel.rows.map((r) => (
            <div className="row !pr-2" key={r.region}>
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">Diesel — {r.region}</div>
                <SourceTag>USDA AgTransport · week of {shortDate(d.diesel.week!)}</SourceTag>
              </div>
              <div className="shrink-0 text-right">
                <div>${fmt(r.price, 3)}/gal</div>
                <div className="text-[13px] text-muted-foreground">{r.prior != null ? `${signed(r.price - r.prior, 3)} vs prior week` : "\u00a0"}</div>
              </div>
              <FlagButton ctx={{ field: `Diesel — ${r.region} (AgTransport)`, displayedValue: `$${fmt(r.price, 3)}/gal` }} />
            </div>
          ))}
          {!d?.truck.available ? (
            <div className="row"><span className="flex-1">Grain truck rates</span><span className="text-muted-foreground">{UNAVAILABLE}</span></div>
          ) : d.truck.rows.map((r) => (
            <div className="row !pr-2" key={r.distance}>
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">Grain truck rate — {r.distance}</div>
                <SourceTag>USDA AgTransport · {d.truck.quarter}</SourceTag>
              </div>
              <div className="shrink-0 text-right">
                <div>${fmt(r.rate)}/mile</div>
                <div className="text-[13px] text-muted-foreground">{r.prior != null ? `${signed(r.rate - r.prior)} vs prior qtr` : "\u00a0"}</div>
              </div>
              <FlagButton ctx={{ field: `Grain truck rate ${r.distance}`, displayedValue: `$${fmt(r.rate)}/mile` }} />
            </div>
          ))}
        </>
      )}
    </Group>
  );
}

function PriceRow({ r, source, monthly }: { r: DairyPrice; source: string; monthly?: boolean }) {
  const d = (x: string) => (monthly ? monthLabel(x) : shortDate(x));
  const digits = r.unit === "$/lb" ? 4 : 2;
  const val = r.value != null ? `$${fmt(r.value, digits)}${r.unit.replace("$", "")}` : UNAVAILABLE;
  return (
    <div className="row !pr-2">
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-snug">{r.label}</div>
        <SourceTag>{source}{r.date ? ` · ${d(r.date)}` : ""}</SourceTag>
      </div>
      <div className="shrink-0 text-right">
        <div className={r.value != null ? "" : "text-muted-foreground"}>{val}</div>
        <div className="text-[13px] text-muted-foreground">{r.value != null && r.prior != null && r.priorDate ? `${signed(r.value - r.prior, digits)} vs ${d(r.priorDate)}` : "\u00a0"}</div>
      </div>
      <FlagButton ctx={{ field: r.label, displayedValue: val }} />
    </div>
  );
}

export function DairyPricesGroups() {
  const fn = useServerFn(getDairyPrices);
  const q = useQuery({ queryKey: ["ams-dairy"], queryFn: () => fn(), staleTime: 30 * 60_000, retry: 1 });
  const d = q.data;
  const SRC = "USDA AMS Dairy Market News";
  return (
    <>
      <Group label="Monthly product price averages" footer="Federal milk order product price averages for the month; change vs prior month. Source: USDA AMS (Announcement of Class and Component Prices).">
        {q.isLoading ? <SkeletonRows rows={4} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : !d?.classes.available ? (
          <div className="row"><span className="flex-1">Class prices</span><span className="text-muted-foreground">{UNAVAILABLE}</span></div>
        ) : d.classes.rows.filter((r) => !r.label.startsWith("Class")).map((r) => <PriceRow key={r.label} r={r} source="USDA AMS" monthly />)}
      </Group>
      <Group label="CME cash dairy prices" footer={`Daily CME spot (cash) trading; change vs prior session. Source: ${SRC}.`}>
        {q.isLoading ? <SkeletonRows rows={4} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : !d?.cme.configured ? (
          <div className="row"><span className="flex-1">Cheese, butter, nonfat dry milk, dry whey</span><span className="text-muted-foreground">{UNAVAILABLE}</span></div>
        ) : d.cme.rows.map((r) => <PriceRow key={r.label} r={r} source={SRC} />)}
      </Group>
    </>
  );
}

function MonthlyRow({ r, note }: { r: OfficialMonthly; note: string }) {
  const val = r.value != null ? `$${fmt(r.value)}/cwt` : UNAVAILABLE;
  return (
    <div className="row !pr-2">
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-snug">{r.label} <span className="text-muted-foreground font-normal">({note})</span></div>
        <SourceTag>USDA AMS (FMMOS){r.month ? ` · ${monthLabel(r.month)}` : ""}</SourceTag>
      </div>
      <div className="shrink-0 text-right">
        <div className={r.value != null ? "" : "text-muted-foreground"}>{val}</div>
        <div className="text-[13px] text-muted-foreground">{r.value != null && r.prior != null && r.priorMonth ? `${signed(r.value - r.prior)} vs ${monthLabel(r.priorMonth)}` : "\u00a0"}</div>
      </div>
      <FlagButton ctx={{ field: `${r.label} (${note}, USDA AMS)`, displayedValue: val }} />
    </div>
  );
}

export function OfficialDairyGroup() {
  const fn = useServerFn(getOfficialDairy);
  const q = useQuery({ queryKey: ["ams-official-dairy"], queryFn: () => fn(), staleTime: 60 * 60_000, retry: 1 });
  const d = q.data;
  const na = (label: string) => <div className="row"><span className="flex-1">{label}</span><span className="text-muted-foreground">{UNAVAILABLE}</span></div>;
  return (
    <Group label="Official dairy prices (USDA)" footer="Weekly national product prices from USDA's Dairy Product Mandatory Reporting Program, change vs prior week. Federal milk order class prices are all-market averages in $/cwt, change vs prior month; advanced Class I is for the coming month. Source: USDA AMS DataMart.">
      {q.isLoading ? <SkeletonRows rows={8} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : (
        <>
          {!d?.products.available ? na("Weekly dairy product prices") : d.products.rows.map((r) => {
            const val = r.value != null ? `$${fmt(r.value, 4)}/lb` : UNAVAILABLE;
            const spark = r.history.map((p) => ({ label: shortDate(p.date), v: p.v }));
            return (
              <div className="row !pr-2" key={r.label}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{r.label}</div>
                  <SourceTag>USDA AMS (DPMRP){r.date ? ` · week ending ${shortDate(r.date)}` : ""}</SourceTag>
                </div>
                {spark.length > 1 && <div className="hidden w-[96px] shrink-0 sm:block"><LineChart points={spark} width={96} height={28} label={`${r.label}, 12 weeks`} format={(v) => `$${fmt(v, 4)}`} /></div>}
                <div className="shrink-0 text-right">
                  <div className={r.value != null ? "" : "text-muted-foreground"}>{val}</div>
                  <div className="text-[13px] text-muted-foreground">{r.value != null && r.prior != null ? `${signed(r.value - r.prior, 4)} vs prior week` : "\u00a0"}</div>
                </div>
                <FlagButton ctx={{ field: `${r.label} (USDA DPMRP)`, displayedValue: val }} />
              </div>
            );
          })}
          {!d?.classes.available ? na("Federal order class prices") : d.classes.rows.map((r) => <MonthlyRow key={r.label} r={r} note="final" />)}
          {!d?.advanced.available ? na("Advanced Class I price") : d.advanced.rows.map((r) => <MonthlyRow key={r.label} r={r} note="announced" />)}
        </>
      )}
    </Group>
  );
}
