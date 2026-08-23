import { categories } from "../lib/tools";
import { toolContent } from "../lib/toolContent";

export default function sitemap() {
  const base = "https://everyboringtool.com";
  const urls = [{ url: base, priority: 1 }];
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}` });
    for (const t of c.tools) {
      // Only list tools that are actually built.
      if (toolContent[t.slug]) urls.push({ url: `${base}/${c.slug}/${t.slug}` });
    }
  }
  return urls;
}
