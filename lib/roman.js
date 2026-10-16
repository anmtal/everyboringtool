// Roman numerals: the single source of truth for every numeral on the site.
// The converter (components/tools/roman-numeral-converter.jsx) and the printable
// chart (app/charts/roman-numerals) both import from here, so no numeral is ever
// typed by hand. Pure functions, no dependencies, safe on server and client.

export const ROMAN_MIN = 1;
export const ROMAN_MAX = 3999;
// Largest value toRomanVinculum() writes: 3,999 thousands + 999.
export const VINCULUM_MAX = 3999999;

// The seven symbols, smallest first.
export const SYMBOLS = [
  ["I", 1],
  ["V", 5],
  ["X", 10],
  ["L", 50],
  ["C", 100],
  ["D", 500],
  ["M", 1000],
];

const SYMBOL_VALUE = Object.fromEntries(SYMBOLS);

// Largest first, with the six subtractive pairs slotted in, so a greedy encoder
// emits the standard (shortest) numeral for any value 1-3999.
const ROMAN_MAP = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

// The only six legal subtractive pairs, smallest first: [numeral, value].
export const SUBTRACTIVE_PAIRS = ROMAN_MAP.filter(([, s]) => s.length === 2)
  .map(([v, s]) => [s, v])
  .reverse();

export function isRomanRange(n) {
  return Number.isInteger(n) && n >= ROMAN_MIN && n <= ROMAN_MAX;
}

// Integer 1-3999 -> standard Roman numeral. Throws on anything else so a bad
// value can never print a wrong numeral silently.
export function toRoman(n) {
  if (!isRomanRange(n)) {
    throw new RangeError(`toRoman: ${n} is not a whole number from ${ROMAN_MIN} to ${ROMAN_MAX}`);
  }
  let out = "";
  let rem = n;
  for (const [val, sym] of ROMAN_MAP) {
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

// Value of a string read with the plain add / subtract rule and NO validity
// checks: "IL" -> 49, "IIII" -> 4, "VX" -> 5. Used to say what a malformed
// numeral was trying to be. Returns null for non-symbol characters.
export function looseRomanValue(raw) {
  const s = String(raw || "").replace(/\s+/g, "").toUpperCase();
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = SYMBOL_VALUE[s[i]];
    const next = SYMBOL_VALUE[s[i + 1]];
    if (next && cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

// Standard Roman numeral -> integer, or null when the string is not a
// well-formed numeral in 1-3999. Case and spaces are ignored. Strictness comes
// from a round trip: the value is re-encoded and must match the input exactly,
// which rejects IIII, VV, IC, IL, IM, VX, XXXX and every other non-standard form.
export function fromRoman(raw) {
  const s = String(raw || "").replace(/\s+/g, "").toUpperCase();
  const total = looseRomanValue(s);
  if (total === null || !isRomanRange(total)) return null;
  return toRoman(total) === s ? total : null;
}

const PLACES = [
  ["thousands", 1000],
  ["hundreds", 100],
  ["tens", 10],
  ["ones", 1],
];

// Place-value breakdown of 1-3999, largest place first, zero places skipped:
// 1994 -> [{place:"thousands", value:1000, numeral:"M"}, {hundreds 900 CM},
// {tens 90 XC}, {ones 4 IV}]. Joining the numerals always gives toRoman(n).
export function romanParts(n) {
  toRoman(n); // range check
  const parts = [];
  let rem = n;
  for (const [place, size] of PLACES) {
    const digit = Math.floor(rem / size);
    rem -= digit * size;
    if (digit > 0) parts.push({ place, digit, value: digit * size, numeral: toRoman(digit * size) });
  }
  return parts;
}

// Split a standard numeral into the chunks a reader adds up, left to right,
// with a running total: "MCMLXXVII" -> M 1000, CM 900, L 50, X 10, X 10, V 5,
// I 1, I 1. Returns null when the numeral is not standard.
export function romanTokens(raw) {
  const n = fromRoman(raw);
  if (n === null) return null;
  const s = toRoman(n);
  const out = [];
  let total = 0;
  for (let i = 0; i < s.length; ) {
    const pair = s.slice(i, i + 2);
    const isPair = pair.length === 2 && SYMBOL_VALUE[pair[0]] < SYMBOL_VALUE[pair[1]];
    const sym = isPair ? pair : s[i];
    const value = isPair ? SYMBOL_VALUE[pair[1]] - SYMBOL_VALUE[pair[0]] : SYMBOL_VALUE[sym];
    total += value;
    out.push({ symbol: sym, value, total, subtractive: isPair });
    i += sym.length;
  }
  return out;
}

// Old-style purely additive numeral (no subtraction): 4 -> IIII, 9 -> VIIII,
// 40 -> XXXX. This is the form on most clock faces (IIII) and in many old
// documents. Not standard; fromRoman() rejects it whenever it differs.
export function toAdditiveRoman(n) {
  toRoman(n); // range check
  let out = "";
  let rem = n;
  for (let i = SYMBOLS.length - 1; i >= 0; i--) {
    const [sym, val] = SYMBOLS[i];
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

// Vinculum notation for 1-3,999,999: a bar over a numeral multiplies it by
// 1,000. 4,000 -> bar over IV; 1,000,000 -> bar over M; 4,001 -> bar over IV,
// then I. Below 4,000 the standard form is returned with no bar.
//   over:  the part written under the bar ("" when there is none)
//   plain: the part written normally after it
//   text:  a plain-text form with U+0305 COMBINING OVERLINE after each barred letter
export function toRomanVinculum(n) {
  if (!Number.isInteger(n) || n < 1 || n > VINCULUM_MAX) {
    throw new RangeError(`toRomanVinculum: ${n} is not a whole number from 1 to ${VINCULUM_MAX}`);
  }
  if (n <= ROMAN_MAX) return { over: "", plain: toRoman(n), text: toRoman(n) };
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const over = toRoman(thousands);
  const plain = rest ? toRoman(rest) : "";
  const text = over.split("").map((c) => c + "̅").join("") + plain;
  return { over, plain, text };
}

// [{ n, roman }] for every value from a to b inclusive (both within 1-3999).
export function romanRange(a, b) {
  const rows = [];
  for (let n = a; n <= b; n++) rows.push({ n, roman: toRoman(n) });
  return rows;
}

// Super Bowl I was played in January 1967 and there has been exactly one per
// year since, so Super Bowl n was played in 1966 + n (LX = February 2026).
export function superBowlYear(n) {
  return 1966 + n;
}
