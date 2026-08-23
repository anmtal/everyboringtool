import { categories } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import { POPULAR } from "../lib/wordPopular";

export default function sitemap() {
  const base = "https://everyboringtool.com";
  const urls = [{ url: base, priority: 1 }];
  // Word Games engine
  urls.push({ url: `${base}/unscramble`, priority: 0.9 });
  for (const l of POPULAR) urls.push({ url: `${base}/unscramble/${l}` });
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}` });
    for (const t of c.tools) {
      // Only list tools that are actually built.
      if (toolContent[t.slug]) urls.push({ url: `${base}/${c.slug}/${t.slug}` });
    }
  }
  return urls;
}
