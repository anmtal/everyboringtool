// Sets or clears the ebt_internal cookie for /internal. Set by the server, not
// document.cookie: Safari (and every iOS browser) caps script-written cookies
// at 7 days, while a first-party Set-Cookie keeps its full Max-Age. Chrome caps
// any cookie at 400 days, so that is the lifetime. Not HttpOnly: the layout's
// gate reads it from document.cookie.
const MAX_AGE = 60 * 60 * 24 * 400;

export const dynamic = "force-dynamic";

export function POST(request) {
  const on = new URL(request.url).searchParams.get("on") === "1";
  const cookie = on
    ? `ebt_internal=1; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax; Secure`
    : "ebt_internal=; Max-Age=0; Path=/; SameSite=Lax; Secure";
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": cookie, "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
