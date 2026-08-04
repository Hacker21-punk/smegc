/**
 * CORS helper for edge functions.
 *
 * Returns CORS headers that echo the request's Origin back only when it matches
 * the application's allowed-origin allowlist. If the origin is not in the list
 * the Access-Control-Allow-Origin header is omitted entirely, causing the browser
 * to block the cross-origin response.
 *
 * To add a production custom domain, append it to ALLOWED_ORIGINS below.
 */

const ALLOWED_ORIGINS = [
  "https://smegc.lovable.app",
  // TODO: add production custom domain here when available
  //   e.g. "https://smegc.com",
];

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, " +
  "x-supabase-client-platform, x-supabase-client-platform-version, " +
  "x-supabase-client-runtime, x-supabase-client-runtime-version";

/**
 * Returns CORS response headers for the given request.
 * Always includes Access-Control-Allow-Headers.
 * Only includes Access-Control-Allow-Origin when the request's Origin is
 * on the allowlist.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}
