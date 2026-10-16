// Unit tests for lib/roman.js, the source of every Roman numeral on the site
// (the converter and /charts/roman-numerals). Run: npm test
// Uses only node:test and node:assert, so there is nothing to install.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ROMAN_MAX,
  SYMBOLS,
  SUBTRACTIVE_PAIRS,
  toRoman,
  fromRoman,
  looseRomanValue,
  romanParts,
  romanTokens,
  toAdditiveRoman,
  toRomanVinculum,
  romanRange,
  superBowlYear,
} from "./roman.js";

// The standard form, written independently of toRoman.
const STANDARD = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

test("every value 1..3999 is in standard form, adds up, and round-trips", () => {
  const seen = new Set();
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const r = toRoman(n);
    assert.match(r, STANDARD, `standard form for ${n}`);
    assert.equal(looseRomanValue(r), n, `value of ${r}`);
    assert.equal(fromRoman(r), n, `round trip ${n} -> ${r}`);
    assert.equal(fromRoman(r.toLowerCase()), n, `lowercase ${n}`);
    assert.ok(!seen.has(r), `unique numeral ${r}`);
    seen.add(r);
  }
});

test("known values", () => {
  const cases = [
    [1, "I"], [4, "IV"], [9, "IX"], [14, "XIV"], [40, "XL"], [49, "XLIX"], [90, "XC"], [400, "CD"],
    [444, "CDXLIV"], [900, "CM"], [1994, "MCMXCIV"], [2024, "MMXXIV"], [2026, "MMXXVI"], [3999, "MMMCMXCIX"],
    [3888, "MMMDCCCLXXXVIII"], [1666, "MDCLXVI"], [666, "DCLXVI"], [48, "XLVIII"], [67, "LXVII"], [69, "LXIX"],
    [96, "XCVI"], [143, "CXLIII"], [1977, "MCMLXXVII"], [1988, "MCMLXXXVIII"], [33, "XXXIII"], [25, "XXV"],
    [34, "XXXIV"],
  ];
  for (const [n, r] of cases) assert.equal(toRoman(n), r, `toRoman(${n})`);
});

test("toRoman rejects out-of-range and non-integers", () => {
  for (const bad of [0, -1, 4000, 1.5, NaN, "12", null, undefined, Infinity]) {
    assert.throws(() => toRoman(bad), RangeError, String(bad));
  }
});

test("fromRoman rejects non-standard and junk", () => {
  const bad = [
    "IIII", "IC", "IL", "IM", "VX", "XXXX", "VV", "LL", "DD", "MMMM", "IXI", "XCX", "VIIII", "IIX", "", "  ", "ABC",
    "0", "MMMCMXCIXI", "CMM", "XM", "VL", "LC", "DM", "IVI", "CDC", "XLX",
  ];
  for (const s of bad) assert.equal(fromRoman(s), null, `should reject ${JSON.stringify(s)}`);
  assert.equal(fromRoman(" mm xx vi "), 2026);
});

test("longest numeral below 4000 is 3888 with 15 letters, and it is unique", () => {
  let best = 0;
  let at = [];
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const len = toRoman(n).length;
    if (len > best) {
      best = len;
      at = [n];
    } else if (len === best) at.push(n);
  }
  assert.equal(best, 15);
  assert.deepEqual(at, [3888]);
});

test("rule invariants over 1..3999", () => {
  const legalPairs = new Set(["IV", "IX", "XL", "XC", "CD", "CM"]);
  const val = Object.fromEntries(SYMBOLS);
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const r = toRoman(n);
    assert.ok(!/(.)\1\1\1/.test(r), `no symbol 4x in a row: ${n} ${r}`);
    for (const once of ["V", "L", "D"]) assert.ok(r.split(once).length - 1 <= 1, `${once} at most once: ${r}`);
    for (let i = 0; i < r.length - 1; i++) {
      if (val[r[i]] < val[r[i + 1]]) assert.ok(legalPairs.has(r[i] + r[i + 1]), `illegal pair in ${r}`);
    }
  }
  assert.deepEqual(SUBTRACTIVE_PAIRS.map(([s]) => s), ["IV", "IX", "XL", "XC", "CD", "CM"]);
  assert.deepEqual(SUBTRACTIVE_PAIRS.map(([, v]) => v), [4, 9, 40, 90, 400, 900]);
});

test("romanParts joins to toRoman and sums to n", () => {
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const p = romanParts(n);
    assert.equal(p.map((x) => x.numeral).join(""), toRoman(n));
    assert.equal(p.reduce((a, x) => a + x.value, 0), n);
  }
  assert.deepEqual(romanParts(1994).map((x) => x.numeral), ["M", "CM", "XC", "IV"]);
});

test("romanTokens running total", () => {
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const t = romanTokens(toRoman(n));
    assert.equal(t[t.length - 1].total, n);
    assert.equal(t.map((x) => x.symbol).join(""), toRoman(n));
  }
  assert.deepEqual(romanTokens("MCMLXXVII").map((x) => x.symbol), ["M", "CM", "L", "X", "X", "V", "I", "I"]);
  assert.equal(romanTokens("IIII"), null);
});

test("additive (clock-face) form", () => {
  assert.equal(toAdditiveRoman(4), "IIII");
  assert.equal(toAdditiveRoman(9), "VIIII");
  assert.equal(toAdditiveRoman(1985), "MDCCCCLXXXV");
  for (let n = 1; n <= ROMAN_MAX; n++) assert.equal(looseRomanValue(toAdditiveRoman(n)), n);
});

test("loose values for the common-mistake list", () => {
  const m = { IIII: 4, IL: 49, IC: 99, IM: 999, XXXX: 40, VX: 5 };
  for (const [s, v] of Object.entries(m)) {
    assert.equal(looseRomanValue(s), v, s);
    assert.equal(fromRoman(s), null, s);
  }
  assert.equal(toRoman(49), "XLIX");
  assert.equal(toRoman(99), "XCIX");
  assert.equal(toRoman(999), "CMXCIX");
});

test("vinculum anchors", () => {
  const v = (n) => toRomanVinculum(n);
  assert.deepEqual([v(4000).over, v(4000).plain], ["IV", ""]);
  assert.deepEqual([v(5000).over, v(5000).plain], ["V", ""]);
  assert.deepEqual([v(10000).over, v(10000).plain], ["X", ""]);
  assert.equal(v(50000).over, "L");
  assert.equal(v(100000).over, "C");
  assert.equal(v(500000).over, "D");
  assert.deepEqual([v(1000000).over, v(1000000).plain], ["M", ""]);
  assert.deepEqual([v(4001).over, v(4001).plain], ["IV", "I"]);
  assert.deepEqual([v(3999).over, v(3999).plain], ["", "MMMCMXCIX"]);
  assert.equal(v(4000).text, "I̅V̅");
  assert.equal(v(3999999).over, "MMMCMXCIX");
  assert.throws(() => toRomanVinculum(4000000), RangeError);
  assert.throws(() => toRomanVinculum(0), RangeError);
});

test("ranges and real-world anchors", () => {
  assert.equal(romanRange(1, 100).length, 100);
  assert.equal(romanRange(1900, 2099).length, 200);
  // Super Bowl I: January 1967. Super Bowl 50: February 2016. Super Bowl LX: February 2026.
  assert.equal(superBowlYear(1), 1967);
  assert.equal(superBowlYear(50), 2016);
  assert.equal(superBowlYear(60), 2026);
  assert.equal(toRoman(60), "LX");
  const lens = romanRange(1900, 2099).map((r) => r.roman.length);
  const max = Math.max(...lens);
  assert.equal(max, 11);
  assert.deepEqual(romanRange(1900, 2099).filter((r) => r.roman.length === max).map((r) => r.n), [1988]);
});
