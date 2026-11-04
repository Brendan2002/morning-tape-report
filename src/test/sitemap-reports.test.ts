import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetReportPathCache, resolveReportPaths } from "@/lib/sitemap-reports";

const full = ["/report/2026-11-04", "/report/2026-11-03"];
beforeEach(() => { resetReportPathCache(); vi.spyOn(console, "error").mockImplementation(() => {}); });

describe("sitemap report list", () => {
  it("returns the full fresh list", async () => {
    expect(await resolveReportPaths(async () => full)).toEqual({ paths: full, source: "fresh" });
  });
  it("timeout with empty cache gives null (503), not a partial list", async () => {
    const r = await resolveReportPaths(() => new Promise(() => {}), 20);
    expect(r).toEqual({ paths: null, source: "none" });
  });
  it("query error with empty cache gives null", async () => {
    expect((await resolveReportPaths(async () => { throw new Error("db"); })).paths).toBeNull();
  });
  it("timeout after a good run serves the complete last-good list", async () => {
    await resolveReportPaths(async () => full);
    const r = await resolveReportPaths(() => new Promise(() => {}), 20);
    expect(r).toEqual({ paths: full, source: "cache" });
  });
  it("aborts the query when it times out", async () => {
    let aborted = false;
    await resolveReportPaths((s) => new Promise(() => s.addEventListener("abort", () => { aborted = true; })), 20);
    expect(aborted).toBe(true);
  });
});
