import { SITE } from "../lib/tools";

// Bots that crawl heavily but send zero traffic and zero ad revenue — SEO-intelligence
// scrapers and mass AI-training crawlers. On 2026-08-31 the Vercel bill was almost
// entirely these two: meta-externalagent (~171K req/12h) and AhrefsBot (~20K), vs
// Googlebot at ~92. They drove the ISR Writes + Observability Events cost. Block the
// freeloaders; keep real search engines AND the answer engines that can cite us
// (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Applebot) on the default "*" rule.
const BLOCKED = [
  "meta-externalagent",   // Meta AI crawler — the #1 offender
  "meta-externalfetcher",
  "AhrefsBot",            // Ahrefs SEO intelligence
  "SemrushBot",          // Semrush SEO intelligence
  "DataForSeoBot",
  "MJ12bot",
  "dotbot",
  "BLEXBot",
  "PetalBot",
  "Bytespider",          // ByteDance / TikTok scraper
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...BLOCKED.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: [
      `${SITE.url}/sitemap.xml`,
      // TEMPORARY (added 2026-10-08): lists ~2.9K retired word pages that Google
      // still had indexed (from GSC: the indexed-pages sample + every word page
      // with search impressions in the last 3 months). Its only job is to get them
      // re-crawled so Google sees the 410 (since 2026-10-15; a noindex before that)
      // and drops them. Remove this line and public/sitemap-recrawl.xml once GSC
      // shows them as no longer indexed.
      `${SITE.url}/sitemap-recrawl.xml`,
    ],
    host: SITE.url,
  };
}
