import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export const ISSUE_TYPES = {
  wrong_number: "Wrong number",
  broken_link: "Broken link",
  typo: "Typo",
  outdated_data: "Outdated data",
  other: "Other",
} as const;

const schema = z.object({
  issue_type: z.enum(["wrong_number", "broken_link", "typo", "outdated_data", "other"]),
  page_url: z.string().trim().min(1).max(500),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  field: z.string().trim().max(200).nullable().optional(),
  displayed_value: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().min(10).max(1000),
  reporter_email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
  website: z.string().max(200).optional(), // honeypot
});

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const submitIssue = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    // Honeypot: pretend success for bots.
    if (data.website) return { ok: true as const };

    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`morning-tape:${ip}`);
    const userAgent = (getRequestHeader("user-agent") ?? "").slice(0, 500);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabaseAdmin
      .from("issue_reports")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return { ok: false as const, error: "Too many reports from your connection. Please try again in an hour." };
    }

    const row = {
      issue_type: data.issue_type,
      page_url: data.page_url,
      report_date: data.report_date || null,
      field: data.field || null,
      displayed_value: data.displayed_value || null,
      description: data.description,
      reporter_email: data.reporter_email || null,
      user_agent: userAgent,
      ip_hash: ipHash,
    };
    const { data: inserted, error } = await supabaseAdmin.from("issue_reports").insert(row).select("id").single();
    if (error || !inserted) {
      console.error("issue insert failed", error);
      return { ok: false as const, error: "We couldn't save your report. Please try again." };
    }

    // Email notification — failure never loses the saved issue.
    let emailStatus = "skipped_not_configured";
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    const to = process.env["ISSUE_NOTIFY_EMAIL"] ?? "bvc2002@icloud.com";
    if (lovableKey && resendKey) {
      const label = ISSUE_TYPES[data.issue_type];
      const subject = `Close & Open issue: ${label} — ${row.field ?? row.page_url}`;
      const lines: [string, string | null][] = [
        ["Type", label],
        ["Page", row.page_url],
        ["Report date", row.report_date],
        ["Field", row.field],
        ["Displayed value", row.displayed_value],
        ["Description", row.description],
        ["Reporter email", row.reporter_email],
        ["User agent", row.user_agent],
        ["Issue ID", inserted.id],
      ];
      try {
        const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "Close & Open <onboarding@resend.dev>",
            to: [to],
            reply_to: row.reporter_email ?? undefined,
            subject,
            text: lines.map(([k, v]) => `${k}: ${v ?? "—"}`).join("\n"),
            html: `<table>${lines.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v ?? "—")}</td></tr>`).join("")}</table>`,
          }),
        });
        emailStatus = res.ok ? "sent" : `failed_${res.status}`;
        if (!res.ok) console.error("issue email failed", res.status, await res.text());
      } catch (e) {
        emailStatus = "failed_network";
        console.error("issue email error", e);
      }
    }
    await supabaseAdmin.from("issue_reports").update({ email_status: emailStatus }).eq("id", inserted.id);

    return { ok: true as const };
  });
