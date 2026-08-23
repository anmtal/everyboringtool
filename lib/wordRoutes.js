// Parse top-level slugs like "5-letter-words" or "5-letter-words-starting-with-a".
// These live at the top level (great URLs) so they collide with the /[category]
// route; app/[category]/page.js checks this before falling back to notFound().
export function parseWordRoute(slug) {
  const s = String(slug || "").toLowerCase();
  let m;
  if ((m = s.match(/^(\d{1,2})-letter-words$/))) return mk(+m[1], "plain");
  if ((m = s.match(/^(\d{1,2})-letter-words-starting-with-([a-z]+)$/))) return mk(+m[1], "starting", m[2]);
  if ((m = s.match(/^(\d{1,2})-letter-words-ending-with-([a-z]+)$/))) return mk(+m[1], "ending", m[2]);
  if ((m = s.match(/^(\d{1,2})-letter-words-with-([a-z]+)$/))) return mk(+m[1], "with", m[2]);
  return null;
}

function mk(length, mode, value = "") {
  if (length < 2 || length > 15) return null;
  return { length, mode, value };
}

export function wordRouteLabel(route) {
  const v = (route.value || "").toUpperCase();
  const base = `${route.length} Letter Words`;
  if (route.mode === "starting") return `${base} Starting With ${v}`;
  if (route.mode === "ending") return `${base} Ending With ${v}`;
  if (route.mode === "with") return `${base} With ${v}`;
  return base;
}
