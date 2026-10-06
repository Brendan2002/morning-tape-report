import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorLine, QuoteTable, SectionLabel, Skeleton } from "@/components/tape";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Morning Tape" },
      { name: "description", content: "Your personal watchlist with live quotes." },
      { property: "og:title", content: "Watchlist — Morning Tape" },
      { property: "og:description", content: "Your personal watchlist with live quotes." },
    ],
  }),
  component: Watchlist,
});

function Watchlist() {
  const qc = useQueryClient();
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("watchlist").select("*").order("added_at");
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async (symbol: string) => {
      const { error } = await supabase.from("watchlist").insert({ symbol });
      if (error) throw new Error(error.code === "23505" ? `${symbol} is already on your watchlist.` : error.message);
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
    if (q.data?.some((w) => w.symbol === s)) return setErr(`${s} is already on your watchlist.`);
    setErr(null);
    add.mutate(s);
  };

  const idBySym = new Map((q.data ?? []).map((w) => [w.symbol, w.id]));
  return (
    <div className="max-w-[760px]">
      <SectionLabel>Watchlist</SectionLabel>
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-center gap-2" noValidate>
        <label htmlFor="sym" className="sr-only">Symbol</label>
        <input
          id="sym"
          value={val}
          maxLength={15}
          onChange={(e) => { setVal(e.target.value.toUpperCase()); setErr(null); }}
          placeholder="Add symbol, e.g. TSLA"
          className="num h-8 w-48 rounded-sm border border-rule bg-background px-2 text-sm outline-none focus:border-link"
          aria-invalid={!!err}
          aria-describedby="sym-err"
        />
        <button type="submit" disabled={add.isPending} className="h-8 rounded-sm border border-foreground px-3 text-sm hover:bg-wash disabled:opacity-50">
          {add.isPending ? "Adding…" : "Add"}
        </button>
        {err && <p id="sym-err" className="w-full text-sm text-link" role="alert">{err}</p>}
      </form>
      {q.isLoading ? <Skeleton rows={5} /> : q.isError ? <ErrorLine message={(q.error as Error).message} onRetry={() => q.refetch()} /> : q.data!.length === 0 ? (
        <p className="py-4 text-muted-foreground">Your watchlist is empty.</p>
      ) : (
        <QuoteTable
          rows={q.data!.map((w) => ({ symbol: w.symbol }))}
          extraCol={(r) => (
            <button
              onClick={() => remove.mutate(idBySym.get(r.symbol)!)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
              aria-label={`Remove ${r.symbol}`}
            >
              Remove
            </button>
          )}
        />
      )}
    </div>
  );
}
