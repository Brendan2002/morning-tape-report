import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, withSecurityHeaders } from "@/lib/security-headers";

describe("server response security headers", () => {
  it.each([200, 401, 404, 500])("protects HTTP %i responses without changing their body", async (status) => {
    const response = withSecurityHeaders(new Response("original", { status }));
    expect(response.status).toBe(status);
    expect(await response.text()).toBe("original");
    expect(response.headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Permissions-Policy")).toBe("accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), midi=()");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
  it("preserves redirects, cookies, caching and existing referrer protection", () => {
    const response = withSecurityHeaders(new Response(null, { status: 302, headers: {
      Location: "/login", "Set-Cookie": "example=value; HttpOnly", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    } }));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
    expect(response.headers.get("Set-Cookie")).toBe("example=value; HttpOnly");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
  it("supports immutable redirect headers", () => {
    expect(withSecurityHeaders(Response.redirect("https://closeandopen.com", 301)).status).toBe(301);
  });
  it("keeps the required preview, TradingView, fonts and backend origins", () => {
    for (const origin of ["https://*.lovable.dev", "https://*.lovable.app", "https://s3.tradingview.com", "https://*.tradingview-widget.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://ebwfroqkuibiiyxcouip.supabase.co"]) {
      expect(CONTENT_SECURITY_POLICY).toContain(origin);
    }
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
  });
});