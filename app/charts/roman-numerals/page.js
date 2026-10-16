import Link from "next/link";
import { SITE, getToolBySlug } from "../../../lib/tools";
import { getChart, chartUrl } from "../../../lib/charts";
import { guideForTool } from "../../../lib/blogPosts";
import {
  ROMAN_MAX,
  VINCULUM_MAX,
  SYMBOLS,
  SUBTRACTIVE_PAIRS,
  toRoman,
  fromRoman,
  looseRomanValue,
  romanParts,
  romanTokens,
  toAdditiveRoman,
  toRomanVinculum,
  superBowlYear,
} from "../../../lib/roman";
import PrintSheetButton from "../../../components/charts/PrintSheetButton";
import ChartPageEffects from "../../../components/charts/ChartPageEffects";
import RomanBuilder from "../../../components/charts/RomanBuilder";
import RomanPractice from "../../../components/charts/RomanPractice";
import RomanDataDownload from "../../../components/charts/RomanDataDownload";
import CopyField from "../../../components/charts/CopyField";
import AdSlot from "../../../components/AdSlot";

// Printable Roman numerals chart: a reference asset for teachers, librarians and
// anyone who wants to link to a correct chart. HOUSE RULE: every numeral on this
// page comes from lib/roman.js at build time. The only numeral-like strings typed
// below are the deliberately WRONG forms used as counter-examples (the build
// fails if any of them is accepted) and the KNOWN answers selfCheck compares
// against, which are never rendered. Unit tests: lib/roman.test.mjs (npm test).

const CHART = getChart("roman-numerals");
const PATH = chartUrl(CHART.slug);
const PAGE_URL = `${SITE.url}${PATH}`;
const UPDATED = CHART.updated;
const CONVERTER = CHART.tool.url;
const R = toRoman;
const fmt = (n) => n.toLocaleString("en-US");
const SOURCE = `Source: ${SITE.domain}${PATH} · Free to print and copy for classroom and personal use`;

const TITLE = "Roman Numerals Chart: 1-100, 1-1000 & Years (Printable)";
const DESCRIPTION =
  "Free printable Roman numerals charts: 1–100, 1–1000, years 1900–2099 and big numbers, plus blank practice sheets with answer keys. No sign-up.";
const H1 = "Roman Numerals Chart: 1–100, 1–1000, Years and Printables";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const [UY, UM, UD] = UPDATED.split("-").map(Number);
const UPDATED_LABEL = `${MONTHS[UM - 1]} ${UD}, ${UY}`;

// Deliberately wrong forms (counter-examples) and why each is wrong.
const WRONG = {
  IIII: "No symbol is written four times in a row. Clock faces are the well-known exception.",
  XXXX: "X is written at most three times in a row.",
  VV: "V, L and D are never repeated: two fives make ten.",
  VX: "V, L and D never subtract.",
  IL: "I can only be subtracted from V and X.",
  IC: "I can only be subtracted from V and X.",
  IM: "I can only be subtracted from V and X.",
  MMMM: "M is written at most three times, so standard numerals stop at 3,999.",
};

const VAL = Object.fromEntries(SYMBOLS);
const DESCENDING = SYMBOLS.map(([s]) => s).reverse().join("");

// The standard form, written out independently of toRoman: up to three M's,
// then one hundreds, one tens and one ones group, each in its only legal shape.
const STANDARD = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

// Known answers, typed by hand on purpose so the check does not lean on the
// encoder it is checking. Compared against only; never rendered.
const KNOWN = [
  [1, "I"],
  [4, "IV"],
  [9, "IX"],
  [40, "XL"],
  [90, "XC"],
  [400, "CD"],
  [900, "CM"],
  [1994, "MCMXCIV"],
  [3888, "MMMDCCCLXXXVIII"],
  [3999, "MMMCMXCIX"],
];

// Runs once at build time. Any failure throws, so a wrong chart can never ship.
// A round trip alone is not enough (fromRoman accepts whatever toRoman emits),
// so each numeral must also have the standard shape and add up to n when read
// symbol by symbol (looseRomanValue does not call toRoman). Shape plus value
// pins down the one correct numeral for every n.
function selfCheck() {
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const r = toRoman(n);
    if (!STANDARD.test(r)) throw new Error(`Roman chart self-check: ${n} -> ${r} is not in standard form`);
    if (looseRomanValue(r) !== n) throw new Error(`Roman chart self-check: ${r} does not add up to ${n}`);
    if (fromRoman(r) !== n) throw new Error(`Roman chart self-check: ${r} does not read back as ${n}`);
  }
  for (const [n, r] of KNOWN) {
    if (toRoman(n) !== r) throw new Error(`Roman chart self-check: ${n} must be ${r}, got ${toRoman(n)}`);
  }
  for (const w of Object.keys(WRONG)) {
    if (fromRoman(w) !== null) throw new Error(`Roman chart self-check: ${w} must be rejected`);
  }
  // Claims made in the FAQ about 666 and 1666.
  if (R(666) !== DESCENDING.slice(1)) throw new Error("666 claim no longer holds");
  if (R(1666) !== DESCENDING) throw new Error("1666 claim no longer holds");
}
selfCheck();

function longestIn(a, b) {
  let best = { n: a, roman: R(a) };
  for (let n = a; n <= b; n++) {
    const r = R(n);
    if (r.length > best.roman.length) best = { n, roman: r };
  }
  return best;
}
const LONGEST = longestIn(1, ROMAN_MAX);
const LONGEST_100 = longestIn(1, 100);
const LONGEST_YEAR = longestIn(1900, 2099);

const partsText = (n) => romanParts(n).map((p) => p.numeral).join(" + ");
const valuesText = (n) => romanParts(n).map((p) => fmt(p.value)).join(" + ");

// ---------------------------------------------------------------------------
// Small server components
// ---------------------------------------------------------------------------

// Tens-by-ones grid: each row is a multiple of ten, each column adds 0-9, so a
// cell's numeral is always its row numeral followed by its column numeral.
function TensGrid({ from, caption, withHundred = false, size = "" }) {
  const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <div className="rn-table-wrap">
      <table className={`rn-table rn-grid ${size}`.trim()}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="rn-corner">Tens</th>
            {cols.map((c) => (
              <th scope="col" key={c}>
                +{c}
                {c ? <span className="rn-h-r">{R(c)}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((r) => {
            const base = from + r * 10;
            return (
              <tr key={base}>
                <th scope="row">
                  {base}
                  {base ? <span className="rn-h-r">{R(base)}</span> : null}
                </th>
                {cols.map((c) => {
                  const n = base + c;
                  return (
                    <td key={c}>
                      <span className="rn-n">{n}</span>
                      {n === 0 ? <span className="rn-r rn-none">no zero</span> : <span className="rn-r">{R(n)}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {withHundred ? (
            <tr>
              <th scope="row">
                100<span className="rn-h-r">{R(100)}</span>
              </th>
              <td>
                <span className="rn-n">100</span>
                <span className="rn-r">{R(100)}</span>
              </td>
              <td colSpan={9} className="rn-blank" />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ListTable({ caption, rows, lower = false, big = false }) {
  return (
    <table className={`rn-table rn-list${big ? " rn-big" : ""}`}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Number</th>
          <th scope="col">Numeral</th>
          {lower ? <th scope="col">Lowercase</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((n) => (
          <tr key={n}>
            <th scope="row">{fmt(n)}</th>
            <td className="rn-numeral">{R(n)}</td>
            {lower ? <td className="rn-numeral">{R(n).toLowerCase()}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// A numeral in vinculum notation, with the bar drawn by CSS and a spoken label.
function Vinc({ n }) {
  const v = toRomanVinculum(n);
  const label = v.over
    ? `${v.over} with a bar over it${v.plain ? `, then ${v.plain}` : ""}, meaning ${fmt(n)}`
    : `${v.plain}, meaning ${fmt(n)}`;
  return (
    <span className="rn-numeral rn-vinc" role="img" aria-label={label}>
      {v.over ? <span className="rn-over">{v.over}</span> : null}
      {v.plain}
    </span>
  );
}

function Clock({ four, label, caption }) {
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const pt = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [(100 + r * Math.cos(a)).toFixed(1), (100 + r * Math.sin(a)).toFixed(1)];
  };
  const [hx, hy] = pt(4 * 30, 42);
  const [mx, my] = pt(0, 56);
  return (
    <figure className="rn-clock">
      <svg viewBox="0 0 200 200" role="img" aria-label={label}>
        <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="3" />
        {hours.map((h) => {
          const [x1, y1] = pt(h * 30, 88);
          const [x2, y2] = pt(h * 30, 94);
          return <line key={`t${h}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2" />;
        })}
        {hours.map((h) => {
          const [x, y] = pt(h * 30, 72);
          return (
            <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="650" fill="currentColor">
              {h === 4 ? four : R(h)}
            </text>
          );
        })}
        <line x1="100" y1="100" x2={hx} y2={hy} stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <line x1="100" y1="100" x2={mx} y2={my} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="5" fill="currentColor" />
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Mistake({ wrong }) {
  const meant = looseRomanValue(wrong);
  return (
    <tr>
      <th scope="row" className="rn-numeral rn-wrong-form">{wrong}</th>
      <td>{fmt(meant)}</td>
      <td className="rn-numeral">{meant <= ROMAN_MAX ? R(meant) : <Vinc n={meant} />}</td>
      <td className="rn-why">{WRONG[wrong]}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Content (all numerals generated)
// ---------------------------------------------------------------------------

const SYMBOL_LIST = SYMBOLS.map(([s, v]) => `${s} = ${fmt(v)}`).join(", ");
const PAIR_LIST = SUBTRACTIVE_PAIRS.map(([s]) => s).join(", ");
const pairMath = (s) => `${s} = ${fmt(VAL[s[1]])} − ${fmt(VAL[s[0]])} = ${fmt(VAL[s[1]] - VAL[s[0]])}`;

const RULES = [
  {
    h: "Seven symbols make every numeral.",
    p: `${SYMBOL_LIST}. There are no other symbols.`,
    right: [1666],
  },
  {
    h: "Write them from largest to smallest and add.",
    p: `${R(77)} = ${romanTokens(R(77)).map((t) => t.value).join(" + ")} = 77.`,
    right: [8, 77, 2026],
  },
  {
    h: "A smaller symbol written before a larger one is subtracted.",
    p: `${pairMath(R(4))}; ${pairMath(R(90))}.`,
    right: [4, 9, 90],
  },
  {
    h: "Only I, X and C subtract, and only from the next two larger symbols.",
    p: `That gives exactly six pairs: ${PAIR_LIST}. So 49 is ${R(49)} (40 + 9), not ${"IL"}.`,
    right: [49, 99, 999],
    wrong: ["IL", "IC", "IM", "VX"],
  },
  {
    h: "I, X, C and M repeat up to three times in a row; V, L and D never repeat.",
    p: `Three is ${R(3)}, but four is ${R(4)}; thirty is ${R(30)}, but forty is ${R(40)}.`,
    right: [3, 40, 300],
    wrong: ["IIII", "XXXX", "VV"],
  },
  {
    h: "There is no zero and no negative numbers, and the standard numerals are whole numbers only.",
    p: `Roman numerals count from ${R(1)} (one). There is no symbol for zero: around AD 725 the scholar Bede and his colleagues wrote the Latin word nulla ("none"), or just the letter N, for zero in their calculation tables, but it never became part of the everyday system. The Romans did write fractions, but in a separate base-12 notation: S (semis) for one half and a dot for each twelfth (uncia).`,
  },
  {
    h: `The standard form stops at ${fmt(ROMAN_MAX)}.`,
    p: `${fmt(ROMAN_MAX)} is ${R(ROMAN_MAX)}. Larger numbers need a bar on top, which multiplies by 1,000: 4,000 is ${toRomanVinculum(4000).over} with a bar over it.`,
    right: [ROMAN_MAX],
    wrong: ["MMMM"],
  },
];

const BIG = [4000, 5000, 10000, 50000, 100000, 500000, 1000000, VINCULUM_MAX];

const SUPER_BOWLS = Array.from({ length: 60 }, (_, i) => i + 1);

const v4000 = toRomanVinculum(4000);

// Unicode ROMAN NUMERAL ONE is U+2160 and the capitals run in order to TWELVE.
const UNI_TWELVE = (() => {
  const cp = 0x2160 + 12 - 1;
  return { char: String.fromCodePoint(cp), code: `U+${cp.toString(16).toUpperCase()}` };
})();

const FAQ = [
  {
    q: "Is there a zero in Roman numerals?",
    a: `No. Roman numerals start at ${R(1)} (1) and have no symbol for zero, because the system has no place value that needs one. Around AD 725 the scholar Bede and his colleagues wrote the Latin word nulla ("none"), or just the letter N, for zero in their calculation tables, but that never became part of the everyday system.`,
  },
  {
    q: "What is the largest Roman numeral?",
    a: `In standard form the largest number is ${fmt(ROMAN_MAX)}, written ${R(ROMAN_MAX)}: no symbol may appear more than three times in a row and there is no symbol above M (1,000). With the vinculum, a bar that multiplies a numeral by 1,000, you can write up to ${fmt(VINCULUM_MAX)}.`,
  },
  {
    q: "How do you write 4,000 in Roman numerals?",
    a: `With a bar over ${v4000.over}: ${v4000.text}, meaning ${v4000.over} × 1,000. You will sometimes see MMMM in informal use, but it breaks the three-in-a-row rule and is not standard.`,
  },
  {
    q: "How do you write 666 in Roman numerals?",
    a: `666 is ${R(666)}. It uses D, C, L, X, V and I exactly once each, from largest to smallest. Add M in front and you get 1666 = ${R(1666)}, which uses all seven symbols once each in descending order.`,
  },
  {
    q: "What is the longest Roman numeral?",
    a: `Below 4,000 the longest is ${fmt(LONGEST.n)} = ${LONGEST.roman}, with ${LONGEST.roman.length} letters, the longest standard Roman numeral. Among the years 1900 to 2099 the longest is ${LONGEST_YEAR.n} = ${LONGEST_YEAR.roman} (${LONGEST_YEAR.roman.length} letters).`,
  },
  {
    q: "What are 48, 67, 69 and 96 in Roman numerals?",
    a: `48 = ${R(48)}, 67 = ${R(67)}, 69 = ${R(69)} and 96 = ${R(96)}. Each one is its tens part followed by its ones part, for example 96 = ${partsText(96)}.`,
  },
  {
    q: "What is \"I love you\" in Roman numerals?",
    a: `It is usually written ${R(143)}, which is 143. The number comes from the old pager code 1-4-3: "I" has 1 letter, "love" has 4 and "you" has 3.`,
  },
  {
    q: `Why do clocks use ${toAdditiveRoman(4)} instead of ${R(4)}?`,
    a: `No one knows for certain. The usual explanations are that ${toAdditiveRoman(4)} visually balances the ${R(8)} on the opposite side of the dial, and that it is simply clockmaking tradition. Plenty of clocks use the standard ${R(4)}, including the Great Clock of Westminster (Big Ben).`,
  },
  {
    q: "What are the 7 Roman numeral symbols?",
    a: `${SYMBOL_LIST}. The letter for 1 is I. Every other numeral is built from these seven.`,
  },
  {
    q: "What are the 7 rules of Roman numerals?",
    a: RULES.map((r, i) => `(${i + 1}) ${r.h}`).join(" "),
  },
  {
    q: "How do I write a year like 2026 in Roman numerals?",
    a: `Split it into thousands, hundreds, tens and ones and write each part: 2026 = ${valuesText(2026)} = ${partsText(2026)} = ${R(2026)}. Years in the 1900s start with ${R(1900)} and years in the 2000s start with ${R(2000)}.`,
  },
  {
    q: "Can I print and copy these charts for my class?",
    a: "Yes. Every chart and worksheet on this page is free to print and photocopy for classroom, library and personal use, with no sign-up. Each printed sheet carries the page address in its footer.",
  },
];

const SHEETS = [
  { id: "basics", title: "Symbols and rules", pages: 1, desc: "The seven symbols, the six subtractive pairs, the place-value table and the seven rules on one page." },
  { id: "chart20", title: "1–20, large print", pages: 1, desc: "Numbers 1 to 20 in capitals and lowercase, with two clock faces." },
  { id: "chart100", title: "1–100 chart", pages: 1, desc: "The 10 × 10 tens-and-ones grid, the chart most classrooms use." },
  { id: "chart1000", title: "1–1000 chart", pages: 10, desc: "The 1–100 grid plus one page for each hundred up to 999, then 1000." },
  { id: "years", title: "Years 1900–2099", pages: 2, desc: "Every year from 1900 to 2099, one hundred years per page." },
  { id: "worksheet", title: "Worksheet + answer key", pages: 2, desc: "20 questions at four levels, or a fill-in 1–100 grid. Answer key on page 2.", practice: true },
];

function citationApa() {
  return `Every Boring Tool. (${UY}, ${MONTHS[UM - 1]} ${UD}). Roman numerals chart: 1–100, 1–1000, years and printables. ${PAGE_URL}`;
}
function citationMla() {
  return `"${H1}." Every Boring Tool, ${UD} ${MONTHS_SHORT[UM - 1]} ${UY}, ${SITE.domain}${PATH}.`;
}
function embedHtml() {
  const td = 'style="border:1px solid #ccc;padding:4px 6px"';
  const rows = [];
  for (let r = 0; r < 10; r++) {
    const cells = [];
    for (let c = 1; c <= 10; c++) {
      const n = r * 10 + c;
      cells.push(`<td ${td}>${n}<br><b>${R(n)}</b></td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return [
    '<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;text-align:center">',
    '<caption style="padding:6px;font-weight:bold">Roman numerals 1 to 100</caption>',
    `<tbody>${rows.join("")}</tbody></table>`,
    `<p style="font-size:12px">Chart from the <a href="${PAGE_URL}" rel="nofollow">Roman numerals chart</a> by Every Boring Tool</p>`,
  ].join("\n");
}

function relatedLinks() {
  const out = [];
  for (const slug of ["roman-numeral-converter", "number-to-words", "number-base-converter"]) {
    const hit = getToolBySlug(slug);
    if (hit) out.push({ href: `/${hit.category.slug}/${hit.tool.slug}`, name: hit.tool.name, desc: hit.tool.description, main: slug === "roman-numeral-converter" });
  }
  const guide = guideForTool("roman-numeral-converter");
  if (guide) out.splice(1, 0, { href: `/blog/${guide.slug}`, name: guide.title, desc: "The guide: the rules, reading years, and where the system falls short." });
  return out;
}

export const metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  robots: { index: true, follow: true },
  openGraph: { type: "article", url: PATH, siteName: SITE.name, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const JUMP = [
  ["chart-1-100", "1–100"],
  ["symbols", "Symbols"],
  ["printables", "Print & download"],
  ["chart-1-20", "1–20"],
  ["chart-1-1000", "1–1000"],
  ["build", "Build any number"],
  ["rules", "Rules"],
  ["read", "How to read"],
  ["years", "Years"],
  ["big-numbers", "Big numbers"],
  ["uses", "Where you see them"],
  ["practice", "Practice"],
  ["faq", "FAQ"],
  ["cite", "Cite"],
];

export default function RomanNumeralsChartPage() {
  const abs = (p) => `${SITE.url}${p}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Printable Charts", item: abs("/charts") },
          { "@type": "ListItem", position: 3, name: CHART.title, item: PAGE_URL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "WebPage",
        name: H1,
        url: PAGE_URL,
        description: DESCRIPTION,
        dateModified: UPDATED,
        inLanguage: "en",
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@id": `${SITE.url}/#org` },
      },
    ],
  };

  const readYear = 1977;
  const readTokens = romanTokens(R(readYear));
  const related = relatedLinks();

  return (
    <div className="chart-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href="/charts">Printable Charts</Link>
        <span className="sep">/</span>
        <span>{CHART.title}</span>
      </nav>

      <header className="page-head">
        <h1>
          Roman Numerals Chart: <span className="rn-nowrap">1–100,</span> <span className="rn-nowrap">1–1000,</span> Years and
          Printables
        </h1>
        <p>
          Roman numerals from 1 to 1,000, every year from 1900 to 2099 and milestones up to {fmt(ROMAN_MAX)} (the largest standard numeral), with free printable charts and worksheets. Each numeral
          below is generated and checked by code, not typed by hand.
        </p>
        <div className="tool-actions chart-noprint" style={{ marginTop: 16 }}>
          <Link href={CONVERTER} className="btn btn-primary">Convert any number →</Link>
          <PrintSheetButton sheet="chart100" chart={CHART.slug} label="Print the 1–100 chart" className="btn" />
        </div>
        <div className="tool-note tool-updated" style={{ marginTop: 12 }}>
          Last reviewed <time dateTime={UPDATED}>{UPDATED_LABEL}</time>
        </div>
      </header>

      <nav className="rn-jump chart-noprint" aria-label="On this page">
        {JUMP.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="badge">{label}</a>
        ))}
      </nav>

      {/* 1. 1-100 ----------------------------------------------------------- */}
      <section className="chart-section" id="chart-1-100" data-sheets="chart100 chart1000" aria-labelledby="c100-h">
        <h2 className="tool-h2" id="c100-h">Roman numerals 1–100 chart</h2>
        <TensGrid
          from={0}
          withHundred
          size="rn-grid-100"
          caption={`Roman numerals 1 to 100. Each row is a tens value and each column adds the ones, so row 20 (${R(20)}) and column +4 (${R(4)}) give 24 = ${R(24)}.`}
        />
        <div className="chart-sheet-skip">
          <h3 className="rn-h3">Patterns to spot</h3>
          <ul className="chart-prose rn-bullets">
            <li>
              Every number ending in 4 ends in {R(4)} and every number ending in 9 ends in {R(9)}: 14 = {R(14)},
              39 = {R(39)}, 94 = {R(94)}.
            </li>
            <li>
              The 40s all start with {R(40)} and the 90s with {R(90)}: 45 = {R(45)}, 92 = {R(92)}.
            </li>
            <li>
              Every number is its tens part plus its ones part: 24 = {partsText(24)} = {R(24)}, and 67 = {partsText(67)} ={" "}
              {R(67)}.
            </li>
            <li>
              The longest numeral up to 100 is {LONGEST_100.n} = {LONGEST_100.roman}, with {LONGEST_100.roman.length} letters.
            </li>
          </ul>
        </div>
        <p className="chart-print-source">{SOURCE}</p>
      </section>

      {/* 2. Symbols ------------------------------------------------------- */}
      <section className="chart-section" id="symbols" data-sheets="basics" aria-labelledby="symbols-h">
        <h2 className="tool-h2" id="symbols-h">Roman numeral symbols</h2>
        <p className="chart-prose chart-sheet-skip">Seven letters make every Roman numeral. They alternate between ones and fives: 1, 5, 10, 50, 100, 500, 1,000.</p>
        <div className="tool-stat-grid rn-tiles">
          {SYMBOLS.map(([s, v]) => (
            <div className="tool-stat" key={s}>
              <div className="tool-stat-num rn-numeral">{s}</div>
              <div className="tool-stat-label">{fmt(v)}</div>
            </div>
          ))}
        </div>
        <h3 className="rn-h3">The six subtractive pairs</h3>
        <p className="chart-prose chart-sheet-skip">When a smaller symbol comes before a larger one it is subtracted. Only these six pairs exist:</p>
        <ul className="rn-pairs">
          {SUBTRACTIVE_PAIRS.map(([s, v]) => (
            <li key={s}>
              <span className="rn-numeral">{s}</span> = {fmt(v)}
            </li>
          ))}
        </ul>
        <p className="chart-prose chart-sheet-skip">
          To remember the order {SYMBOLS.map(([s]) => s).join("-")}, try &ldquo;<strong>I</strong> <strong>V</strong>alue{" "}
          <strong>X</strong>ylophones <strong>L</strong>ike <strong>C</strong>ows <strong>D</strong>o <strong>M</strong>ilk&rdquo;.
        </p>
      </section>

      {/* 3. Printables ---------------------------------------------------- */}
      <section className="chart-section chart-noprint" id="printables" aria-labelledby="printables-h">
        <h2 className="tool-h2" id="printables-h">Printable Roman numerals charts</h2>
        <p className="chart-prose">
          Each button prints just that sheet, in black and white, sized to fit US Letter and A4, with this page&apos;s
          address in the footer. No sign-up, no email, nothing to download first.
        </p>
        <div className="rn-sheets">
          {SHEETS.map((s) => (
            <div className="rn-sheet-card" key={s.id}>
              <h3 className="rn-h3">{s.title}</h3>
              <p className="tool-note">{s.desc}</p>
              <p className="rn-sheet-meta">{s.pages} {s.pages === 1 ? "page" : "pages"} · Letter or A4</p>
              {s.practice ? (
                <a href="#practice" className="btn btn-sm">Set up a worksheet ↓</a>
              ) : (
                <PrintSheetButton sheet={s.id} chart={CHART.slug} label={`Print ${s.title}`} />
              )}
            </div>
          ))}
        </div>
        <h3 className="rn-h3">Download the data</h3>
        <p className="chart-prose">
          Every numeral from 1 to {fmt(ROMAN_MAX)} as a spreadsheet-ready CSV or a JSON file (number, numeral, lowercase,
          letter count), built in your browser.
        </p>
        <RomanDataDownload source={PAGE_URL} />
        <h3 className="rn-h3">For teachers</h3>
        <p className="chart-prose">
          The national curriculum for mathematics in England has pupils read clock numerals from {R(1)} to {R(12)} in
          Year 3, Roman numerals to 100 ({R(1)} to {R(100)}) in Year 4, and numerals to 1000 ({R(1000)}) and years
          written in Roman numerals in Year 5. The 1–20 sheet (with its clock faces), the 1–100 chart, and the 1–1000
          and years sheets match those three steps.
        </p>
      </section>

      {/* 4. 1-20 ------------------------------------------------------------ */}
      <section className="chart-section" id="chart-1-20" data-sheets="chart20" aria-labelledby="c20-h">
        <h2 className="tool-h2" id="c20-h">
          Roman numerals 1–20 (and lowercase {R(1).toLowerCase()}–{R(20).toLowerCase()})
        </h2>
        <p className="chart-prose chart-sheet-skip">
          Large type for early grades. The lowercase column is the style used to number the front pages of books, such
          as a preface on page {R(3).toLowerCase()} or {R(4).toLowerCase()}.
        </p>
        <div className="rn-two">
          <ListTable caption="Roman numerals 1 to 10" rows={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} lower big />
          <ListTable caption="Roman numerals 11 to 20" rows={[11, 12, 13, 14, 15, 16, 17, 18, 19, 20]} lower big />
        </div>
        <h3 className="rn-h3">Clock numerals {R(1)} to {R(12)}</h3>
        <div className="rn-clocks">
          <Clock
            four={toAdditiveRoman(4)}
            label={`Clock face with Roman numerals ${R(1)} to ${R(12)}, using ${toAdditiveRoman(4)} for four, showing 4 o'clock`}
            caption={`${toAdditiveRoman(4)} for four, the style on many clock and watch faces`}
          />
          <Clock
            four={R(4)}
            label={`Clock face with Roman numerals ${R(1)} to ${R(12)}, using ${R(4)} for four, showing 4 o'clock`}
            caption={`${R(4)} for four, the standard form, as on the Great Clock of Westminster (Big Ben)`}
          />
        </div>
        <p className="chart-print-source">{SOURCE}</p>
      </section>

      {/* 5. 1-1000 ---------------------------------------------------------- */}
      <section className="chart-section" id="chart-1-1000" data-sheets="chart1000" aria-labelledby="c1000-h">
        <h2 className="tool-h2 chart-sheet-skip" id="c1000-h">Roman numerals 1–1000</h2>
        <div className="chart-sheet-skip">
          <p className="chart-prose">
            The tens and hundreds are the anchors: every number up to 1000 is a hundreds part, a tens part and a ones
            part written in that order.
          </p>
          <div className="rn-two">
            <ListTable caption="Tens from 10 to 100" rows={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} />
            <ListTable caption="Hundreds from 100 to 1000" rows={[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]} />
          </div>
          <h3 className="rn-h3">Every number from 100 to 999</h3>
          <p className="chart-prose">
            <span className="chart-noprint">Open a block to see all hundred numerals in it. </span>Numbers 1 to 99 are in
            the 1–100 chart above.
          </p>
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => {
          const from = h * 100;
          return (
            <details className="rn-details chart-break-before" key={h}>
              <summary>
                Roman numerals {from}–{from + 99}{" "}
                <span className="muted">
                  ({R(from)} to {R(from + 99)})
                </span>
              </summary>
              <TensGrid
                from={from}
                size="rn-grid-wide"
                caption={`Roman numerals ${from} to ${from + 99}. Row ${from + 40} (${R(from + 40)}) and column +7 (${R(7)}) give ${from + 47} = ${R(from + 47)}.`}
              />
              {h === 9 ? (
                <p className="chart-prose rn-thousand">
                  And 1000 = <strong className="rn-numeral">{R(1000)}</strong>.
                </p>
              ) : null}
              <p className="chart-print-source">{SOURCE}</p>
            </details>
          );
        })}
        <h3 className="rn-h3 chart-sheet-skip">Thousands up to {fmt(ROMAN_MAX)}</h3>
        <div className="rn-table-wrap rn-narrow chart-sheet-skip">
          <ListTable caption={`Milestones from 1,000 to ${fmt(ROMAN_MAX)}`} rows={[1000, 1500, 1900, 2000, 2500, 3000, 3500, ROMAN_MAX]} />
        </div>
      </section>

      {/* 6. Build any number -------------------------------------------------- */}
      <section className="chart-section" id="build" data-sheets="basics" aria-labelledby="build-h">
        <h2 className="tool-h2" id="build-h">Build any number up to {fmt(ROMAN_MAX)}</h2>
        <p className="chart-prose">
          Split the number into thousands, hundreds, tens and ones, look each part up in this table, and write the
          pieces left to right. That is the whole method.
        </p>
        <div className="rn-table-wrap">
          <table className="rn-table rn-blocks">
            <caption>Place-value building blocks: the numeral for each digit 1 to 9 in each place</caption>
            <thead>
              <tr>
                <th scope="col">Place</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <th scope="col" key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Thousands", 1000],
                ["Hundreds", 100],
                ["Tens", 10],
                ["Ones", 1],
              ].map(([label, size]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <td key={d} className="rn-numeral">
                      {d * size <= ROMAN_MAX ? R(d * size) : <span className="rn-none" aria-label="not used">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chart-sheet-skip">
          <h3 className="rn-h3">Worked examples</h3>
          <ul className="chart-prose rn-bullets">
            {[1994, 2026, LONGEST.n, ROMAN_MAX].map((n) => (
              <li key={n}>
                {fmt(n)} = {valuesText(n)} = {partsText(n)} = <strong className="rn-numeral">{R(n)}</strong>
                {n === LONGEST.n ? ` (the longest numeral, ${R(n).length} letters)` : null}
                {n === ROMAN_MAX ? " (the largest in standard form)" : null}
              </li>
            ))}
          </ul>
          <div className="chart-noprint">
            <h3 className="rn-h3">Try it</h3>
            <RomanBuilder initial={1994} />
          </div>
        </div>
      </section>

      {/* 7. Rules ------------------------------------------------------------- */}
      <section className="chart-section" id="rules" data-sheets="basics" aria-labelledby="rules-h">
        <h2 className="tool-h2" id="rules-h">The 7 rules of Roman numerals</h2>
        <ol className="rn-rules">
          {RULES.map((r, i) => (
            <li key={i}>
              <strong>{r.h}</strong> {r.p}
              {r.right || r.wrong ? (
                <span className="rn-examples">
                  {r.right ? (
                    <span>
                      <span className="rn-ex-label">Right:</span>{" "}
                      {r.right.map((n, j) => (
                        <span key={n}>
                          {j ? ", " : ""}
                          <span className="rn-numeral">{R(n)}</span> = {fmt(n)}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  {r.wrong ? (
                    <span>
                      <span className="rn-ex-label">Wrong:</span>{" "}
                      {r.wrong.map((w, j) => (
                        <span key={w}>
                          {j ? ", " : ""}
                          <s className="rn-numeral">{w}</s>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="chart-sheet-skip">
          <h3 className="rn-h3">Common mistakes</h3>
          <div className="rn-table-wrap">
            <table className="rn-table rn-mistakes">
              <caption>Non-standard numerals, what they were meant to say, and the standard form</caption>
              <thead>
                <tr>
                  <th scope="col">Wrong</th>
                  <th scope="col">Meant</th>
                  <th scope="col">Standard</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(WRONG).map((w) => (
                  <Mistake key={w} wrong={w} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="tool-note" style={{ marginTop: 10 }}>
            Every &ldquo;wrong&rdquo; form above is fed to the same parser the converter uses, and the page will not
            build unless each one is rejected.
          </p>
        </div>
        <p className="chart-print-source">{SOURCE}</p>
      </section>

      {/* 8. How to read --------------------------------------------------------- */}
      <section className="chart-section" id="read" aria-labelledby="read-h">
        <h2 className="tool-h2" id="read-h">How to read a Roman numeral</h2>
        <p className="chart-prose">
          Read left to right. First spot the subtractive pairs ({PAIR_LIST}) and treat each pair as one value, then add
          everything up. Here is {R(readYear)}, the kind of date you see at the end of film credits:
        </p>
        <div className="rn-table-wrap rn-narrow">
          <table className="rn-table">
            <caption>Reading {R(readYear)} one step at a time</caption>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Symbol</th>
                <th scope="col">Value</th>
                <th scope="col">Running total</th>
              </tr>
            </thead>
            <tbody>
              {readTokens.map((t, i) => (
                <tr key={i}>
                  <th scope="row">{i + 1}</th>
                  <td className="rn-numeral">
                    {t.symbol}
                    {t.subtractive ? <span className="muted"> (pair: {fmt(VAL[t.symbol[1]])} − {fmt(VAL[t.symbol[0]])})</span> : null}
                  </td>
                  <td>{fmt(t.value)}</td>
                  <td>{fmt(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-prose">
          So {R(readYear)} is {readYear}, the year the first <em>Star Wars</em> film was released. The shortcut for
          copyright years: a numeral starting {R(1900)}… is in the 1900s, and one starting {R(2000)}… is in the 2000s.
        </p>
      </section>

      {/* 9. Years ------------------------------------------------------------------ */}
      <section className="chart-section" id="years" data-sheets="years" aria-labelledby="years-h">
        <h2 className="tool-h2 chart-sheet-skip" id="years-h">Years in Roman numerals: 1900–2099</h2>
        <div className="chart-sheet-skip">
          <p className="chart-prose">
            Years work like any other number: {R(1900)} is 1900 and {R(2000)} is 2000, then the tens and ones follow.
            The longest year in this range is {LONGEST_YEAR.n} = {LONGEST_YEAR.roman} ({LONGEST_YEAR.roman.length} letters).
            For a full date such as a birthday or a tattoo, convert the day, month and year separately with the{" "}
            <Link href={CONVERTER} style={{ textDecoration: "underline" }}>Roman Numeral Converter</Link>.
          </p>
        </div>
        {[1900, 2000].map((c, i) => (
          <details className={`rn-details${i ? " chart-break-before" : ""}`} key={c} open={c === 2000}>
            <summary>
              Years {c}–{c + 99}{" "}
              <span className="muted">
                ({R(c)} to {R(c + 99)})
              </span>
            </summary>
            <TensGrid
              from={c}
              size="rn-grid-wide"
              caption={`Years ${c} to ${c + 99} in Roman numerals. Row ${c + 80} (${R(c + 80)}) and column +4 (${R(4)}) give ${c + 84} = ${R(c + 84)}.`}
            />
            <p className="chart-print-source">{SOURCE}</p>
          </details>
        ))}
      </section>

      {/* 10. Big numbers -------------------------------------------------------- */}
      <section className="chart-section" id="big-numbers" aria-labelledby="big-h">
        <h2 className="tool-h2" id="big-h">Big numbers: 4,000 and above</h2>
        <p className="chart-prose">
          Standard numerals stop at {fmt(ROMAN_MAX)} ({R(ROMAN_MAX)}). For larger numbers the notation taught today is
          the <em>vinculum</em>: a bar over a numeral multiplies it by 1,000. So 4,000 is {v4000.over} with a bar over
          it. Writers over the centuries used several other systems for big numbers, and none became universal, so
          treat the table below as the modern convention. MMMM for 4,000 turns up informally but is not standard.
        </p>
        <div className="rn-table-wrap rn-narrow">
          <table className="rn-table">
            <caption>Large numbers in vinculum notation (a bar means × 1,000)</caption>
            <thead>
              <tr>
                <th scope="col">Number</th>
                <th scope="col">Numeral</th>
                <th scope="col">How it is built</th>
              </tr>
            </thead>
            <tbody>
              {BIG.map((n) => {
                const v = toRomanVinculum(n);
                return (
                  <tr key={n}>
                    <th scope="row">{fmt(n)}</th>
                    <td><Vinc n={n} /></td>
                    <td>
                      {v.over} × 1,000 = {fmt(Math.floor(n / 1000) * 1000)}
                      {v.plain ? `, plus ${v.plain} = ${fmt(n % 1000)}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 11. Where you see them -------------------------------------------------- */}
      <section className="chart-section" id="uses" aria-labelledby="uses-h">
        <h2 className="tool-h2" id="uses-h">Where you still see Roman numerals</h2>
        <h3 className="rn-h3">Clock faces</h3>
        <p className="chart-prose">
          Many clocks write four as {toAdditiveRoman(4)} rather than {R(4)}. The Great Clock of Westminster (Big Ben)
          is a famous exception that uses {R(4)}. Both styles are shown on the 1–20 sheet above.
        </p>
        <h3 className="rn-h3">The Super Bowl</h3>
        <p className="chart-prose">
          The first Super Bowl was played in January 1967 and there has been one every year since, so Super Bowl{" "}
          <em>n</em> was played in 1966 + <em>n</em>: Super Bowl {R(60)} (60) was played in {superBowlYear(60)}. Roman
          numerals were first used for Super Bowl {R(5)} in {superBowlYear(5)}; the first four games were numbered
          later. Super Bowl 50 in {superBowlYear(50)} was branded with Arabic numerals instead of {R(50)}, and the
          numerals came back the next year with Super Bowl {R(51)}.
        </p>
        <details className="rn-details">
          <summary>All 60 Super Bowl numerals with the year each was played</summary>
          <div className="rn-table-wrap rn-narrow">
            <table className="rn-table rn-list">
              <caption>Super Bowl numerals {R(1)} to {R(60)} and the calendar year each game was played</caption>
              <thead>
                <tr>
                  <th scope="col">Super Bowl</th>
                  <th scope="col">Number</th>
                  <th scope="col">Year played</th>
                </tr>
              </thead>
              <tbody>
                {SUPER_BOWLS.map((n) => (
                  <tr key={n}>
                    <th scope="row" className="rn-numeral">
                      {R(n)}
                      {n === 50 ? <span className="muted"> (branded “50”)</span> : null}
                    </th>
                    <td>{n}</td>
                    <td>{superBowlYear(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <h3 className="rn-h3">The Olympic Games</h3>
        <p className="chart-prose">
          Summer Games are numbered by Olympiad and Winter Games by their own count: Paris 2024 was the Games of the{" "}
          {R(33)} Olympiad, Milano Cortina 2026 the {R(25)} Olympic Winter Games, and Los Angeles 2028 will be the Games
          of the {R(34)} Olympiad.
        </p>
        <h3 className="rn-h3">Monarchs and popes</h3>
        <p className="chart-prose">
          Rulers who share a name are numbered in order: Elizabeth {R(2)}, Charles {R(3)}, Louis {R(14)} of France, and
          Pope Leo {R(14)}, elected in 2025.
        </p>
        <h3 className="rn-h3">Books, outlines, music and chemistry</h3>
        <ul className="chart-prose rn-bullets">
          <li>
            Front matter such as a preface is often numbered in lowercase ({R(1).toLowerCase()}, {R(2).toLowerCase()},{" "}
            {R(3).toLowerCase()}) before page 1 of the main text.
          </li>
          <li>
            Formal outlines label top-level points {R(1)}, {R(2)}, {R(3)}, then A, B, C, then 1, 2, 3, then a, b, c.
          </li>
          <li>
            In music, chords are numbered by the scale note they are built on: in C major the {R(1)}, {R(4)} and {R(5)}{" "}
            chords are C, F and G. Lowercase marks minor chords, such as {R(2).toLowerCase()} and {R(6).toLowerCase()}.
          </li>
          <li>
            In chemistry, a numeral gives an element&apos;s oxidation state: iron({R(3)}) oxide, Fe₂O₃, contains iron in
            the +3 state.
          </li>
        </ul>
      </section>

      {/* 12. Old documents -------------------------------------------------------- */}
      <section className="chart-section" id="old-documents" aria-labelledby="old-h">
        <h2 className="tool-h2" id="old-h">Reading Roman numerals in old documents</h2>
        <p className="chart-prose">
          Family historians and archivists meet numerals that break the modern rules. Scribes often wrote them in
          lowercase, ended a run of i&apos;s with a j ({R(3).toLowerCase().replace(/i$/, "j")} = 3,{" "}
          {R(6).toLowerCase().replace(/i$/, "j")} = 6, {R(8).toLowerCase().replace(/i$/, "j")} = 8), and freely used
          additive forms such as {toAdditiveRoman(4).toLowerCase().replace(/i$/, "j")} for 4 or {toAdditiveRoman(1490)}{" "}
          for 1490 (today {R(1490)}). The UK National Archives has a{" "}
          <a href="https://www.nationalarchives.gov.uk/help-with-your-research/reading-old-documents/roman-numerals/" rel="noopener" style={{ textDecoration: "underline" }}>
            guide to Roman numerals in historical documents
          </a>
          .
        </p>
      </section>

      {/* 13. Practice ------------------------------------------------------------------ */}
      <section className="chart-section" id="practice" data-sheets="worksheet" aria-labelledby="practice-h">
        <h2 className="tool-h2 chart-sheet-skip" id="practice-h">Roman numerals quiz and worksheets</h2>
        <p className="chart-prose chart-sheet-skip">
          Answer on screen and press &ldquo;Check my answers&rdquo;, or print the sheet: questions on page 1, the answer
          key on page 2. &ldquo;New version&rdquo; shuffles a fresh set. To get a printed sheet back later, choose the
          same sheet type and level and type the version number from the sheet into the Version box.
        </p>
        <RomanPractice source={SOURCE} />
      </section>

      <div className="chart-noprint">
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSLOT_TOOL} minHeight={280} />
      </div>

      {/* 14. Typing ---------------------------------------------------------------------- */}
      <section className="chart-section" id="typing" aria-labelledby="typing-h">
        <h2 className="tool-h2" id="typing-h">Typing and using Roman numerals</h2>
        <ul className="chart-prose rn-bullets">
          <li>
            <strong>Plain capital letters</strong> are the best choice almost everywhere: every font has them, and they
            search, copy and sort like any other text.
          </li>
          <li>
            <strong>Unicode</strong> also has single-character numerals from U+2160 to U+2188, such as {UNI_TWELVE.char} (
            {UNI_TWELVE.code}) for twelve. They exist mainly for compatibility with older character sets.
          </li>
          <li>
            <strong>CSS and HTML</strong> number lists for you: <code>list-style-type: upper-roman</code> (or{" "}
            <code>lower-roman</code>), or <code>&lt;ol type=&quot;I&quot;&gt;</code>.
          </li>
          <li>
            <strong>Excel and Google Sheets</strong> convert with <code>=ROMAN(2026)</code>, which returns {R(2026)},
            and <code>=ARABIC(&quot;{R(2026)}&quot;)</code>, which returns 2026.
          </li>
        </ul>
      </section>

      {/* 15. FAQ --------------------------------------------------------------------------- */}
      <section className="chart-section tool-faq" id="faq" aria-labelledby="faq-h">
        <h2 className="tool-h2" id="faq-h">Frequently asked questions</h2>
        <dl>
          {FAQ.map((f, i) => (
            <div className="faq-item" key={i}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 16. Cite -------------------------------------------------------------------------- */}
      <section className="chart-section chart-noprint" id="cite" aria-labelledby="cite-h">
        <h2 className="tool-h2" id="cite-h">Cite or link to this chart</h2>
        <div className="rn-callout">
          <h3 className="rn-h3" style={{ marginTop: 0 }}>How we checked this chart</h3>
          <p className="chart-prose">
            Every numeral on this page comes from one function rather than being typed in. Before the page is built,
            that function converts all {fmt(ROMAN_MAX)} numbers from 1 to {fmt(ROMAN_MAX)}, and every result must have
            the shape of a standard numeral, add back up to the number it started from, and read back correctly. A set
            of known answers must match exactly and every wrong example in the rules must be rejected. If any check
            fails, the page does not build. The function also has its own unit tests, and the{" "}
            <Link href={CONVERTER} style={{ textDecoration: "underline" }}>Roman Numeral Converter</Link> uses the same
            code. Last reviewed <time dateTime={UPDATED}>{UPDATED_LABEL}</time>.
          </p>
        </div>
        <p className="chart-prose">
          Free to print and photocopy for classroom, library and personal use. If the chart is useful to your students
          or readers, a link back is the best thanks.
        </p>
        <div className="rn-cite-grid">
          <CopyField id="rn-cite-link" label="Link (HTML)" value={`<a href="${PAGE_URL}">Roman numerals chart (1–1000, printable)</a>`} rows={4} />
          <CopyField id="rn-cite-apa" label="Citation (APA style)" value={citationApa()} rows={4} />
          <CopyField id="rn-cite-mla" label="Citation (MLA style)" value={citationMla()} rows={4} />
          <CopyField id="rn-cite-embed" label="Embed the 1–100 table (plain HTML, no script)" value={embedHtml()} rows={4} />
        </div>
      </section>

      {/* 17. Related ------------------------------------------------------------------------- */}
      <section className="chart-section chart-noprint" aria-labelledby="related-h">
        <h2 className="tool-h2" id="related-h">Related</h2>
        <div className="grid">
          {related.map((r) => (
            <Link key={r.href} href={r.href} className="card">
              {r.main ? <span className="badge">Convert any number</span> : null}
              <span className="tool-name">{r.name}</span>
              <span className="tool-desc">{r.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="chart-print-footer">{SOURCE}</p>
      <ChartPageEffects />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
