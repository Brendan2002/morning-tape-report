import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorRow, Group, PageHeader, QuoteList, SkeletonRows } from "@/components/tape";
import { useIsAdmin, useSession } from "@/components/auth";

export const Route = createFileRoute("/watchlist")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Watchlist — Morning Tape" },
      { name: "description", content: "A curated watchlist of stocks and ETFs with live quotes." },
      { property: "og:title", content: "Watchlist — Morning Tape" },
      { property: "og:description", content: "A curated watchlist of stocks and ETFs with live quotes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Watchlist,
});

function Watchlist() {
  const qc = useQueryClient();
  const { session } = useSession();
  const admin = useIsAdmin(session?.user.id);
  const isAdmin = !!admin.data;
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["watchlist"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("watchlist").select("*").order("added_at");
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async (symbol: string) => {
      const { error } = await supabase.from("watchlist").insert({ symbol });
      if (error) throw new Error(error.code === "23505" ? `${symbol} is already on the watchlist.` : error.message);
    },
    onSuccess: () => { setVal(""); qc.invalidateQueries({ queryKey: ["watchlist"] }); },
    onError: (e: Error) => setErr(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = val.trim().toUpperCase();
    if (!s) return setErr("Enter a symbol.");
    if (s.length > 15) return setErr("Symbols are at most 15 characters.");
    if (!/^[A-Z0-9.^=\-]+$/.test(s)) return setErr("Use letters, numbers and . ^ = - only.");
    if (q.data?.some((w) => w.symbol === s)) return setErr(`${s} is already on the watchlist.`);
    setErr(null);
    add.mutate(s);
  };
  if (!isAdmin)
    return (
      <>
        <PageHeader title="Watchlist" subtitle="The watchlist is private to admins." />
        <Group>
          <div className="row text-[15px]">
            {admin.isLoading ? "Checking access…" : session ? "Your account isn't an admin." : <span>Sign in as an admin to view and edit the watchlist. <Link to="/login">Admin sign in</Link></span>}
          </div>
        </Group>
      </>
    );
  const idBySym = new Map((q.data ?? []).map((w) => [w.symbol, w.id]));

  return (
    <>
      <PageHeader title="Watchlist" subtitle="Quotes via Yahoo Finance, may be delayed. Change vs prior close." />
      <div className="max-w-[760px] space-y-8">
        {isAdmin && (
          <form onSubmit={submit} noValidate>
            <label htmlFor="sym" className="group-label block">Add a symbol</label>
            <div className="flex gap-2">
              <input
                id="sym" value={val} maxLength={15}
                onChange={(e) => { setVal(e.target.value.toUpperCase()); setErr(null); }}
                placeholder="e.g. TSLA" className="field flex-1"
                aria-invalid={!!err} aria-describedby={err ? "sym-err" : undefined}
              />
              <button type="submit" className="btn-primary" disabled={add.isPending}>{add.isPending ? "Adding…" : "Add"}</button>
            </div>
            {err && <p id="sym-err" className="mt-1 px-4 text-[13px] text-down" role="alert">{err}</p>}
          </form>
        )}
        {q.isLoading ? <div className="group"><SkeletonRows rows={5} /></div> : q.isError ? <div className="group"><ErrorRow onRetry={() => q.refetch()} /></div> : q.data!.length === 0 ? (
          <Group><div className="row text-muted-foreground">The watchlist is empty.</div></Group>
        ) : (
          <QuoteList
            label="Symbols"
            rows={q.data!.map((w) => ({ symbol: w.symbol }))}
            extra={isAdmin ? (r) => (
              <button onClick={() => remove.mutate(idBySym.get(r.symbol)!)} className="btn-text shrink-0 !text-[15px] !text-down" aria-label={`Remove ${r.symbol}`}>Remove</button>
            ) : undefined}
          />
        )}
        {!isAdmin && (
          <p className="px-4 text-[13px] text-muted-foreground">
            Editing the watchlist is limited to admins. {session ? "Your account isn't an admin." : <Link to="/login">Admin sign in</Link>}
          </p>
        )}
      </div>
    </>
  );
}
