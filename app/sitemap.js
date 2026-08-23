import { categories } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import { POPULAR } from "../lib/wordPopular";

export default function sitemap() {
  const base = "https://everyboringtool.com";
  const urls = [{ url: base, priority: 1 }];
  // Word Games engine
  for (const u of ["/unscramble", "/anagram", "/wordle-solver", "/words-starting-with", "/words-ending-with", "/words-containing"]) {
    urls.push({ url: `${base}${u}`, priority: 0.9 });
  }
  for (const l of POPULAR) {
    urls.push({ url: `${base}/unscramble/${l}` });
    urls.push({ url: `${base}/anagram/${l}` });
  }
  for (const l of "abcdefghijklmnopqrstuvwxyz".split("")) urls.push({ url: `${base}/words-starting-with/${l}` });
  for (const s of ["s", "e", "d", "y", "ing", "ed", "er", "ly", "ion", "ness", "ment", "able", "est", "ous", "ful"]) urls.push({ url: `${base}/words-ending-with/${s}` });
  for (const s of ["qu", "zz", "oo", "ee", "th", "ch", "ph", "ck", "igh", "ough", "x", "z", "j"]) urls.push({ url: `${base}/words-containing/${s}` });
  for (const c of categories) {
    urls.push({ url: `${base}/${c.slug}` });
    for (const t of c.tools) {
      // Only list tools that are actually built.
      if (toolContent[t.slug]) urls.push({ url: `${base}/${c.slug}/${t.slug}` });
    }
  }
  return urls;
}
