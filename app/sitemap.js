import { categories, SITE } from "../lib/tools";
import { toolContent } from "../lib/toolContent";

export default function sitemap() {
  const base = SITE.url;
  const urls = [{ url: base, priority: 1 }];
  for (const u of ["/about", "/privacy", "/terms", "/contact"]) urls.push({ url: `${base}${u}`, priority: 0.3 });
  // Word-game + convert HUBS only. The per-combination pages (unscramble/<letters>,
  // convert/<pair>, words-*, crossword-solver/<pattern>) are noindexed as of
  // 2026-09-03 (AdSense flagged "low value content" — the auto-generated word-page
  // volume was the driver), so they are deliberately NOT submitted here. Re-add
  // individual pages if the word engine is later re-indexed as a curated subset.
  for (const u of ["/unscramble", "/anagram", "/wordle-solver", "/words-starting-with", "/words-ending-with", "/words-containing", "/crossword-solver", "/convert"]) {
    urls.push({ url: `${base}${u}`, priority: 0.6 });
  }
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}` });
    for (const t of c.tools) {
      // Only list tools that are actually built.
      if (toolContent[t.slug]) urls.push({ url: `${base}/${c.slug}/${t.slug}` });
    }
  }
  return urls;
}
