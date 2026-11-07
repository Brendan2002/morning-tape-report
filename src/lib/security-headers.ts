// Shared by request middleware and the outer SSR error boundary.
const BACKEND_ORIGIN = "https://ebwfroqkuibiiyxcouip.supabase.co";
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self' https://*.lovable.dev https://*.lovable.app",
  "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.tradingview.com",
  `connect-src 'self' ${BACKEND_ORIGIN} wss://ebwfroqkuibiiyxcouip.supabase.co https://*.tradingview.com`,
  "frame-src https://*.tradingview.com https://*.tradingview-widget.com",
].join("; ");

export function setSecurityHeaders(headers: Headers): void {
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), midi=()");
  if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!headers.has("X-Content-Type-Options")) headers.set("X-Content-Type-Options", "nosniff");
}

export function withSecurityHeaders(response: Response): Response {
  // A fetch/redirect response may have immutable headers. Clone the envelope,
  // not the body, preserving streaming, cookies, status and cache directives.
  const headers = new Headers(response.headers);
  setSecurityHeaders(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}