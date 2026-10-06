import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ISSUE_TYPES, submitIssue } from "@/lib/issues.functions";
import { ResponsiveSheet } from "./sheet";

export type IssueContext = { field?: string | undefined; displayedValue?: string | undefined; reportDate?: string | undefined };
const Ctx = createContext<(c: IssueContext) => void>(() => {});
export const useReportIssue = () => useContext(Ctx);

type IssueType = keyof typeof ISSUE_TYPES;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ReportIssueProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<IssueContext | null>(null);
  const open = useCallback((c: IssueContext) => setCtx(c), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      <ResponsiveSheet
        open={!!ctx}
        onOpenChange={(o) => !o && setCtx(null)}
        title="Report an issue"
        description="Spotted something wrong? Tell us and we'll check it."
      >
        {ctx && <IssueForm ctx={ctx} onDone={() => setCtx(null)} />}
      </ResponsiveSheet>
    </Ctx.Provider>
  );
}

function IssueForm({ ctx, onDone }: { ctx: IssueContext; onDone: () => void }) {
  const send = useServerFn(submitIssue);
  const [type, setType] = useState<IssueType>(ctx.displayedValue ? "wrong_number" : "other");
  const [desc, setDesc] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const d = desc.trim();
  const descErr = d.length > 0 && d.length < 10 ? "Please write at least 10 characters." : null;
  const emailErr = email.trim() && !EMAIL_RE.test(email.trim()) ? "Enter a valid email or leave it blank." : null;
  const valid = d.length >= 10 && d.length <= 1000 && !emailErr;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || state === "sending") return;
    setState("sending");
    setErr(null);
    try {
      const r = await send({
        data: {
          issue_type: type,
          page_url: pageUrl.slice(0, 500),
          report_date: ctx.reportDate ?? null,
          field: ctx.field ?? null,
          displayed_value: ctx.displayedValue ?? null,
          description: d,
          reporter_email: email.trim() || null,
          website: hp,
        },
      });
      if (r.ok) setState("done");
      else { setState("error"); setErr(r.error); }
    } catch {
      setState("error");
      setErr("Something went wrong sending your report. Please try again.");
    }
  };

  if (state === "done")
    return (
      <div className="space-y-4 py-2" role="status">
        <p className="text-[17px]">Thanks — your report was received. We'll review it shortly.</p>
        <button className="btn-primary" onClick={onDone}>Done</button>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <fieldset>
        <legend className="group-label px-0">Issue type</legend>
        <div className="segmented flex w-full flex-wrap" role="radiogroup">
          {(Object.keys(ISSUE_TYPES) as IssueType[]).map((k) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={type === k}
              data-active={type === k}
              onClick={() => setType(k)}
              className="!min-h-[40px] flex-1"
            >
              {ISSUE_TYPES[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="group-label px-0">Context</p>
        <dl className="group bg-fill text-[15px]">
          {[
            ["Page", pageUrl.replace(/^https?:\/\//, "")],
            ["Report date", ctx.reportDate],
            ["Field", ctx.field],
            ["Displayed value", ctx.displayedValue],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div className="row" key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="ml-auto min-w-0 truncate text-right">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div>
        <label htmlFor="issue-desc" className="group-label block px-0">What's wrong? (required)</label>
        <textarea
          id="issue-desc"
          className="field min-h-[110px]"
          maxLength={1000}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          aria-invalid={!!descErr}
          aria-describedby="issue-desc-help"
          required
        />
        <div id="issue-desc-help" className="mt-1 flex justify-between text-[13px] text-muted-foreground">
          <span className={descErr ? "text-down" : ""}>{descErr ?? "10–1000 characters"}</span>
          <span>{d.length}/1000</span>
        </div>
      </div>

      <div>
        <label htmlFor="issue-email" className="group-label block px-0">Email (optional, for follow-up) · <Link to="/privacy" className="normal-case">Privacy</Link></label>
        <input id="issue-email" type="email" className="field" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailErr} autoComplete="email" />
        {emailErr && <p className="mt-1 text-[13px] text-down">{emailErr}</p>}
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>

      {state === "error" && err && <p className="text-[15px] text-down" role="alert">{err}</p>}

      <button type="submit" className="btn-primary w-full" disabled={!valid || state === "sending"}>
        {state === "sending" ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}

export function FlagButton({ ctx, label }: { ctx: IssueContext; label?: string }) {
  const open = useReportIssue();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(ctx); }}
      className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-fill hover:text-foreground"
      aria-label={label ?? `Report an issue with ${ctx.field ?? "this value"}`}
    >
      <Flag className="h-4 w-4" aria-hidden />
    </button>
  );
}
