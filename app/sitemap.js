import { categories, SITE } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import { POPULAR } from "../lib/wordPopular";
import { PAIRS } from "../lib/convertMatrix";

export default function sitemap() {
  const base = SITE.url;
  const urls = [{ url: base, priority: 1 }];
  for (const u of ["/about", "/privacy", "/terms", "/contact"]) urls.push({ url: `${base}${u}`, priority: 0.3 });
  // Word Games engine
  for (const u of ["/unscramble", "/anagram", "/wordle-solver", "/words-starting-with", "/words-ending-with", "/words-containing"]) {
    urls.push({ url: `${base}${u}`, priority: 0.9 });
  }
  // CAUTIOUS RAMP: submit only the word hubs, the finite "browse" pages, and a
  // small showcase of individual word pages — NOT all ~250 per-word URLs. On a
  // brand-new domain, firehosing thousands of templated pages into the sitemap
  // risks a site-wide quality hit. Every other word page stays live and crawlable
  // via internal links; widen this list once the domain has earned some trust.
  for (const l of POPULAR.slice(0, 12)) urls.push({ url: `${base}/unscramble/${l}` });
  for (const l of "abcdefghijklmnopqrstuvwxyz".split("")) urls.push({ url: `${base}/words-starting-with/${l}` });
  for (const s of ["ing", "ed", "tion", "ly", "ness", "ment", "able"]) urls.push({ url: `${base}/words-ending-with/${s}` });
  for (const s of ["qu", "th", "ch", "oo", "igh", "ough"]) urls.push({ url: `${base}/words-containing/${s}` });
  urls.push({ url: `${base}/crossword-solver`, priority: 0.9 });
  for (const p of ["c-t", "-at", "s--e"]) urls.push({ url: `${base}/crossword-solver/${p}` });
  // File-conversion engine: the hub, plus a CAUTIOUS curated subset of pairs
  // (sitemap:true). The rest stay crawlable via the hub and internal links —
  // widen convertMatrix's sitemap flags as the domain earns trust.
  urls.push({ url: `${base}/convert`, priority: 0.6 });
  for (const p of PAIRS) if (p.sitemap) urls.push({ url: `${base}/convert/${p.slug}`, priority: 0.7 });
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}` });
    for (const t of c.tools) {
      // Only list tools that are actually built.
      if (toolContent[t.slug]) urls.push({ url: `${base}/${c.slug}/${t.slug}` });
    }
  }
  return urls;
}
