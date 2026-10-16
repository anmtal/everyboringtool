// Printable reference charts: pages people print, cite and link to (as opposed
// to interactive tools). Each entry is a static route at /charts/<slug>; the
// /charts hub, the sitemap and /llms.txt all read this list, so a new chart only
// needs its page plus one entry here.
//   updated: the date the chart's content was last reviewed (YYYY-MM-DD)
//   tool:    the matching interactive tool, cross-linked from the chart

export const CHARTS_UPDATED = "2026-10-15";

export const charts = [
  {
    slug: "roman-numerals",
    title: "Roman Numerals Chart",
    description:
      "Every Roman numeral from 1 to 1000, years 1900–2099 and big numbers, with the rules, printable sheets and practice worksheets with answer keys.",
    updated: "2026-10-15",
    tool: { name: "Roman Numeral Converter", url: "/converters/roman-numeral-converter" },
  },
];

export function chartUrl(slug) {
  return `/charts/${slug}`;
}

export function getChart(slug) {
  return charts.find((c) => c.slug === slug) || null;
}
