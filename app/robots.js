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
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
