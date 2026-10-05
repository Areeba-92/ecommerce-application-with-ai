const FALLBACK = "/profile";

/**
 * Returns `next` only if it is a same-origin path ("/checkout",
 * "/payment/abc?x=1"); anything that could leave the site — absolute URLs,
 * protocol-relative "//host", the "/\host" form browsers treat the same way,
 * or control characters that get stripped into one of those — falls back to
 * /profile.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return FALLBACK;
  if (next.startsWith("//") || next.startsWith("/\\")) return FALLBACK;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return FALLBACK;
  return next;
}
