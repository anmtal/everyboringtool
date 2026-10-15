// The per-query word pages (/unscramble/<letters>, /anagram/<letters>,
// /words-starting-with/<x>, /words-ending-with/<x>, /words-containing/<x>,
// /crossword-solver/<pattern>) were retired on 2026-10-15. Google had indexed
// ~9K of these thin, templated URLs, and they were the likely driver of the
// 2026-09-03 AdSense "low value content" rejection. A noindex took months to
// clear them, so each child route now answers 410 Gone, the strongest removal
// signal. A visitor arriving on an old link gets one click to the same results,
// which now live on the hub (?q=, noindexed).
//
// /convert/<pair> is NOT part of this: those are real file-converter tools.

import { wordHref, parseRack, parseAffix, parsePattern } from "./wordQuery";

const STYLE = `
:root{color-scheme:light dark;--bg:#fafaf9;--fg:#18181b;--muted:#52525b;--line:#e4e4e7;--btn:#18181b;--btnfg:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0c0c0d;--fg:#f4f4f5;--muted:#a1a1aa;--line:#27272a;--btn:#f4f4f5;--btnfg:#0c0c0d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:560px;margin:12vh auto 0;padding:0 16px}h1{font-size:1.5rem;line-height:1.25;margin:0 0 10px}
p{margin:0 0 18px;color:var(--muted)}a.btn{display:inline-block;background:var(--btn);color:var(--btnfg);text-decoration:none;font-weight:600;padding:11px 18px;border-radius:10px}
.home{display:block;margin-top:22px;color:var(--muted)}`;

// Each hub's own parser, so the button only promises results for a query the
// hub accepts. Parsers return letters, "?" and "-" only, so the query is safe
// to echo into HTML without further escaping.
const PARSERS = {
  "/unscramble": parseRack,
  "/anagram": parseRack,
  "/words-starting-with": parseAffix,
  "/words-ending-with": parseAffix,
  "/words-containing": parseAffix,
  "/crossword-solver": parsePattern,
};

export function gone(hub, toolName, raw, { pattern = false } = {}) {
  let s = String(raw || "");
  try { s = decodeURIComponent(s); } catch (e) { /* keep it raw */ }
  const q = PARSERS[hub](s) || "";
  const shown = (pattern ? q.replace(/-/g, "_") : q).toUpperCase();
  // nofollow: result views are noindexed, and crawlers re-fetching the 410s
  // shouldn't be handed one result URL per retired page.
  const cta = q
    ? `<a class="btn" rel="nofollow" href="${wordHref(hub, q)}">Show results for ${shown} →</a>`
    : `<a class="btn" href="${hub}">Open the ${toolName} →</a>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>This page has moved — Every Boring Tool</title><style>${STYLE}</style></head>
<body><main><h1>This page has moved</h1>
<p>The ${toolName} now shows every result on one page. Your search is still one click away.</p>
${cta}<a class="home" href="/">Browse all free tools</a></main></body></html>`;
  return new Response(html, {
    status: 410,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
