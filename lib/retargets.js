// Gated SEO retargets from the 2026-09-09 winnability analysis. Several tools are
// named for a near-dead term while a same-tool sibling ("[X] size chart", a reverse
// direction, a clearer phrasing) has 5k-165k volume and is winnable. When enabled,
// the tool page overrides the H1 / <title> / meta description (and appends one true
// sentence to the About) so the page targets the higher-volume term too.
//
// GATED OFF until AdSense approval — flip RETARGETS_ENABLED to true together with
// HIDE_NEW_TOOLS=false (lib/tools.js) and GEO_HOMEPAGE_ENABLED=true (app/page.js).
// Two of these (binary-text-converter, json-schema-generator) are hidden tools, so
// they only take effect once un-hidden anyway.
export const RETARGETS_ENABLED = false;

export const RETARGETS = {
  "ring-size-converter": {
    name: "Ring Size Chart & Converter",
    seoTitle: "Ring Size Chart & Converter — US, UK, EU, mm",
    metaDescription: "Free ring size chart and converter — find your ring size and convert between US, UK, EU, Japan and mm. No sign-up, runs in your browser.",
    aboutAppend: "It doubles as a full ring size chart: every system's size sits side by side, so you can read the whole chart at a glance or convert a single size.",
  },
  "bra-size-converter": {
    seoTitle: "Bra Size Chart, Calculator & Converter",
    metaDescription: "Free bra size chart, calculator and converter — find your size from measurements and read it across US, UK, EU, French and Australian sizing.",
    aboutAppend: "Prefer a chart? Every size lines up across US, UK, EU, French and Australian systems, so it works as a bra size chart as well as a calculator.",
  },
  "cups-to-grams-converter": {
    name: "Cups to Grams & Grams to Cups Converter",
    seoTitle: "Cups to Grams (and Grams to Cups) Converter",
    metaDescription: "Convert cups to grams and grams to cups for common baking ingredients — a two-way kitchen converter. Free, no sign-up, in your browser.",
    aboutAppend: "It converts both directions — cups to grams, or grams back to cups — for everyday baking ingredients.",
  },
  "drill-bit-size-converter": {
    name: "Drill Bit Size Chart & Converter",
    seoTitle: "Drill Bit Size Chart & Converter — Fraction, mm",
    metaDescription: "Free drill bit size chart and converter: fraction, metric (mm), number and letter drill sizes side by side. Read the chart or convert a size.",
    aboutAppend: "Read it as a drill bit size chart — fraction, decimal, metric, number and letter sizes lined up together — or convert a single measurement.",
  },
  "battery-equivalents": {
    name: "Battery Equivalents & Cross-Reference",
    seoTitle: "Battery Equivalents & Cross-Reference Chart",
    metaDescription: "Find battery equivalents and cross-references — every interchangeable code for a given cell. Free battery equivalence chart, in your browser.",
    aboutAppend: "Look up a battery to see the equivalent codes that fit the same slot — a quick cross-reference chart.",
  },
  "most-likely-to": {
    seoTitle: "Who's Most Likely To… Questions Generator",
    metaDescription: "Hundreds of 'who's most likely to' questions — a free party-game generator. Random, clean prompts, no sign-up, right in your browser.",
    aboutAppend: "It's a bottomless source of 'who's most likely to' questions for the party game — tap for a fresh prompt whenever you need one.",
  },
  "binary-text-converter": {
    name: "Text to Binary & Binary to Text Converter",
    seoTitle: "Text to Binary Converter (and Binary to Text)",
    metaDescription: "Convert text to binary and binary back to text instantly — a free two-way binary translator that runs in your browser. No sign-up.",
    aboutAppend: "It works both ways: turn text into binary, or decode 0s and 1s back into readable text.",
  },
  "sheet-metal-gauge-converter": {
    name: "Sheet Metal Gauge Chart & Converter",
    seoTitle: "Sheet Metal Gauge Chart — Thickness (mm & in)",
    metaDescription: "Free sheet metal gauge chart and converter — gauge number to thickness in inches and millimetres. Read the chart or convert a value.",
    aboutAppend: "Use it as a sheet metal gauge chart — gauge number to thickness in inches and millimetres — or convert a single gauge.",
  },
  "pipe-size-converter": {
    name: "Pipe Size Chart & Converter",
    seoTitle: "Pipe Size Chart & Converter — NPS, OD, mm",
    metaDescription: "Free pipe size chart and converter — nominal pipe size (NPS) to outside diameter in inches and millimetres. Read the chart or convert a size.",
    aboutAppend: "Read it as a pipe size chart — nominal size to outside diameter in inches and millimetres — or convert a single measurement.",
  },
  "json-schema-generator": {
    seoTitle: "JSON to JSON Schema Generator (Free)",
    metaDescription: "Turn a sample JSON object into a valid JSON Schema — infers types, nested objects and required fields. Free, no sign-up, in your browser.",
    aboutAppend: "Paste JSON and it generates the matching JSON Schema — the fast “JSON to JSON Schema” route without writing the schema by hand.",
  },
  "hvac-load-estimator": {
    name: "HVAC Load Calculator",
    seoTitle: "HVAC Load Calculator — BTU & Tonnage Estimate",
    metaDescription: "Free HVAC load calculator: estimate heating and cooling BTU and tonnage for a room or home from size, climate and insulation. In your browser.",
    aboutAppend: "It works as a quick HVAC load calculator — enter room size, climate and insulation to get an estimated heating/cooling BTU and tonnage.",
  },
};

// The retarget for a slug when the feature is on, else null.
export function retargetFor(slug) {
  return RETARGETS_ENABLED && RETARGETS[slug] ? RETARGETS[slug] : null;
}
