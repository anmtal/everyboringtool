// Submit URLs to IndexNow so Bing (and Yandex, Seznam, etc.) crawl new/changed
// pages within minutes instead of days. Google does not participate in IndexNow.
//
// Usage:
//   node scripts/indexnow.mjs                 submit every URL in the live sitemap (the curated set)
//   node scripts/indexnow.mjs --all           submit the FULL enumerable set: sitemap + all word-game
//                                             seeds + browse pages (wider than the sitemap on purpose —
//                                             Bing is volume-friendly, and this feeds Copilot/ChatGPT.
//                                             Google stays on the cautious sitemap.)
//   node scripts/indexnow.mjs /games/coin-flip /pdf   submit only these path(s) or full URL(s)
//
// Run after a deploy is live. Requires Node 18+ (global fetch).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HOST = "everyboringtool.com";
const KEY = "2b0cf523179ce11c003c4d5c32e739c3";
const ORIGIN = `https://${HOST}`;
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow"; // shared endpoint; notifies all IndexNow engines
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

async function sitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, { cache: "no-store" });
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// The full enumerable page set: sitemap + every word-game seed/browse page. This
// mirrors what the site pre-renders, minus the unbounded ISR long-tail.
function fullUrls(sitemap) {
  const u = new Set(sitemap);
  const words = [...readFileSync(join(REPO, "lib/wordPopular.js"), "utf8").matchAll(/"([a-z]{2,15})"/g)].map((m) => m[1]);
  for (const w of words) { u.add(`${ORIGIN}/unscramble/${w}`); u.add(`${ORIGIN}/anagram/${w}`); }
  const az = "abcdefghijklmnopqrstuvwxyz".split("");
  az.forEach((l) => u.add(`${ORIGIN}/words-starting-with/${l}`));
  az.forEach((l) => u.add(`${ORIGIN}/5-letter-words-starting-with-${l}`));
  ["s", "e", "d", "y", "ing", "ed", "er", "ly", "ion", "ness", "ment", "able", "est", "ous", "ful"].forEach((s) => u.add(`${ORIGIN}/words-ending-with/${s}`));
  ["qu", "zz", "oo", "ee", "th", "ch", "ph", "ck", "igh", "ough", "x", "z", "j"].forEach((s) => u.add(`${ORIGIN}/words-containing/${s}`));
  for (let n = 2; n <= 9; n++) u.add(`${ORIGIN}/${n}-letter-words`);
  ["c-t", "-at", "s--e", "c--se", "p--nt", "w-rd", "-ing"].forEach((p) => u.add(`${ORIGIN}/crossword-solver/${p}`));
  return [...u];
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
const paths = args.filter((a) => !a.startsWith("--"));
let urls;
if (args.includes("--all")) urls = fullUrls(await sitemapUrls());
else if (paths.length) urls = paths.map(toUrl);
else urls = await sitemapUrls();

if (!urls.length) { console.error("No URLs to submit."); process.exit(1); }
console.log(`Submitting ${urls.length} URL(s) to IndexNow (key ${KEY.slice(0, 8)}…)`);
const status = await submit(urls);
console.log(status === 200 || status === 202 ? `✅ Accepted (HTTP ${status})` : `⚠️  Unexpected HTTP ${status} — check the key file is live at ${KEY_LOCATION}`);
process.exit(status === 200 || status === 202 ? 0 : 1);
