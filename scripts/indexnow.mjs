// Submit URLs to IndexNow so Bing (and Yandex, Seznam, etc.) crawl new/changed
// pages within minutes instead of days. Google does not participate in IndexNow.
//
// Usage:
//   node scripts/indexnow.mjs                          submit every URL in the live sitemap
//   node scripts/indexnow.mjs /games/coin-flip /pdf    submit only these path(s) or full URL(s)
//
// Run it after a deploy is live. Requires Node 18+ (global fetch).

const HOST = "everyboringtool.com";
const KEY = "2b0cf523179ce11c003c4d5c32e739c3";
const ORIGIN = `https://${HOST}`;
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow"; // shared endpoint; notifies all IndexNow engines

async function sitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, { cache: "no-store" });
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function toUrl(a) {
  if (/^https?:\/\//.test(a)) return a;
  return `${ORIGIN}${a.startsWith("/") ? "" : "/"}${a}`;
}

async function submit(urlList) {
  // IndexNow accepts up to 10,000 URLs per request.
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  return res.status;
}

const args = process.argv.slice(2);
const urls = args.length ? args.map(toUrl) : await sitemapUrls();

if (!urls.length) {
  console.error("No URLs to submit.");
  process.exit(1);
}
console.log(`Submitting ${urls.length} URL(s) to IndexNow (key ${KEY.slice(0, 8)}…)`);
const status = await submit(urls);
// 200 = accepted, 202 = accepted (key validation pending)
console.log(status === 200 || status === 202 ? `✅ Accepted (HTTP ${status})` : `⚠️  Unexpected HTTP ${status} — check the key file is live at ${KEY_LOCATION}`);
process.exit(status === 200 || status === 202 ? 0 : 1);
