import { categories } from "../lib/tools";

export default function sitemap() {
  const base = "https://everyboringtool.com";
  const urls = [{ url: base, priority: 1 }];
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}` });
    for (const t of c.tools) {
      urls.push({ url: `${base}/${c.slug}/${t.slug}` });
    }
  }
  return urls;
}
