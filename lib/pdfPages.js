// Parse a page selection like "2, 4-6, 9" into a sorted unique list of 1-based
// page numbers, bounded to [1, total]. Throws on malformed input.
export function parsePageList(str, total) {
  const out = new Set();
  const parts = String(str || "").split(",");
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.add(i);
    } else if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      if (n >= 1 && n <= total) out.add(n);
    } else {
      throw new Error(`"${p}" isn't a valid page number or range.`);
    }
  }
  return [...out].sort((a, b) => a - b);
}
