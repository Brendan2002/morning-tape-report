import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Built from origins the site actually loads. 'unsafe-inline' scripts are needed for the SSR
// hydration payload, theme bootstrap and JSON-LD; TradingView widgets inject a script then iframes.
const SUPABASE = "https://ebwfroqkuibiiyxcouip.supabase.co";
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self' https://*.lovable.dev https://*.lovable.app",
  "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.tradingview.com",
  `connect-src 'self' ${SUPABASE} wss://ebwfroqkuibiiyxcouip.supabase.co https://*.tradingview.com`,
  "frame-src https://*.tradingview.com https://*.tradingview-widget.com",
].join("; ");

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const h = result.response?.headers;
  if (h) {
    h.set("Content-Security-Policy", CSP);
    h.set("X-Frame-Options", "SAMEORIGIN");
    h.set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), midi=()");
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeaders, errorMiddleware, csrfMiddleware],
}));
