import { categories, SITE, LAST_UPDATED, LOW_VALUE_NOINDEX } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import { TYPING_LANDING, LANDING_UPDATED, visibleLandingKeys } from "../lib/typingLanding";
import { TOOL_LANDINGS, visibleToolLandingKeys } from "../lib/toolLandings";
import { sortedPosts, BLOG_UPDATED } from "../lib/blogPosts";

export default function sitemap() {
  const base = SITE.url;
  // Every entry carries a lastModified so crawlers get a freshness signal.
  // Tools that were revised on their own date carry that date (toolContent
  // `updated`); everything else falls back to the site-wide review date.
  const siteDate = new Date(LAST_UPDATED);
  const toolDate = (slug) => {
    const u = toolContent[slug] && toolContent[slug].updated;
    const d = u ? new Date(u) : null;
    return d && !isNaN(d.getTime()) ? d : siteDate;
  };

  const urls = [{ url: base, lastModified: siteDate, priority: 1 }];
  for (const u of ["/about", "/privacy", "/terms", "/contact"]) {
    urls.push({ url: `${base}${u}`, lastModified: siteDate, priority: 0.3 });
  }
  // Blog / guides: index + each published post (hand-written how-to content).
  const blogDate = new Date(BLOG_UPDATED);
  const blogPostList = sortedPosts();
  if (blogPostList.length) {
    urls.push({ url: `${base}/blog`, lastModified: blogDate, priority: 0.6 });
    for (const post of blogPostList) {
      const pd = post.updated || post.date;
      const d = pd ? new Date(pd) : blogDate;
      urls.push({
        url: `${base}/blog/${post.slug}`,
        lastModified: isNaN(d.getTime()) ? blogDate : d,
        priority: 0.5,
      });
    }
  }
  // Word-game + convert HUBS only. The per-combination pages (unscramble/<letters>,
  // convert/<pair>, words-*, crossword-solver/<pattern>) are noindexed as of
  // 2026-09-03 (AdSense flagged "low value content" — the auto-generated word-page
  // volume was the driver), so they are deliberately NOT submitted here. Re-add
  // individual pages if the word engine is later re-indexed as a curated subset.
  for (const u of ["/unscramble", "/anagram", "/wordle-solver", "/words-starting-with", "/words-ending-with", "/words-containing", "/crossword-solver", "/convert"]) {
    urls.push({ url: `${base}${u}`, lastModified: siteDate, priority: 0.6 });
  }
  // Typing Test long-tail landing pages — each is a hand-written, unique page
  // (not a templated combination), so they are indexed like tool pages.
  const landingDate = new Date(LANDING_UPDATED);
  for (const key of visibleLandingKeys()) {
    urls.push({ url: `${base}${TYPING_LANDING[key].url}`, lastModified: landingDate, priority: 0.6 });
  }
  // Long-tail landing pages for other tools (utm-builder, etc.)
  for (const key of visibleToolLandingKeys()) {
    const c = TOOL_LANDINGS[key];
    urls.push({ url: `${base}${c.url}`, lastModified: new Date(c.updated), priority: 0.6 });
  }
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}`, lastModified: siteDate });
    for (const t of c.tools) {
      // Only list tools that are actually built.
      if (toolContent[t.slug] && !LOW_VALUE_NOINDEX.has(t.slug)) urls.push({ url: `${base}/${c.slug}/${t.slug}`, lastModified: toolDate(t.slug) });
    }
  }
  return urls;
}
