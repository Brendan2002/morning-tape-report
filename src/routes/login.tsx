import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Group, PageHeader } from "@/components/tape";
import { useSession } from "@/components/auth";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Admin sign in — Close & Open" },
      { name: "description", content: "Sign in to manage the Close & Open watchlist." },
      { property: "og:title", content: "Admin sign in — Close & Open" },
      { property: "og:description", content: "Sign in to manage the Close & Open watchlist." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://closeandopen.com/login" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string | undefined } => {
    const n = s["next"];
    return { next: safeNext(n) };
  },
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const { session } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (next) window.location.assign(next);
      else nav({ to: "/watchlist" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${window.location.origin}${next ?? "/watchlist"}` } });
      setBusy(false);
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Check your email to confirm your account." });
    }
  };

  if (session && next && typeof window !== "undefined") window.location.assign(next);
  if (session)
    return (
      <>
        <PageHeader title="Signed in" subtitle={session.user.email} />
        <button className="btn-text" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </>
    );

  return (
    <div className="max-w-md">
      <PageHeader title={mode === "in" ? "Admin sign in" : "Create account"} subtitle="Only admins can edit the watchlist." />
      <form onSubmit={submit} className="space-y-4">
        <Group>
          <label className="row"><span className="w-24 shrink-0">Email</span><input type="email" required autoComplete="email" className="min-h-[44px] flex-1 bg-transparent outline-none" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="row"><span className="w-24 shrink-0">Password</span><input type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} className="min-h-[44px] flex-1 bg-transparent outline-none" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        </Group>
        {msg && <p className={`px-4 text-[15px] ${msg.ok ? "" : "text-down"}`} role="alert">{msg.text}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="btn-text" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Create an account" : "I already have an account"}
        </button>
      </form>
    </div>
  );
}

// Only allow same-origin relative paths; resolve against a fixed origin so backslashes/encodings can't escape.
function safeNext(n: unknown): string | undefined {
  if (typeof n !== "string" || !n.startsWith("/") || n.startsWith("//") || /[\\\u0000-\u001f]/.test(n)) return undefined;
  try {
    const base = "https://local.invalid";
    const u = new URL(n, base);
    if (u.origin !== base) return undefined;
    return u.pathname + u.search + u.hash;
  } catch {
    return undefined;
  }
}
