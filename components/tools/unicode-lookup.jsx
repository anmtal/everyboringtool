"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// General category short code -> readable name. Detected live with Unicode
// property escapes (\p{Lu} etc.), so this stays correct across the engine's
// Unicode version without shipping a giant table.
const CATEGORIES = [
  ["Lu", "Uppercase Letter"],
  ["Ll", "Lowercase Letter"],
  ["Lt", "Titlecase Letter"],
  ["Lm", "Modifier Letter"],
  ["Lo", "Other Letter"],
  ["Mn", "Nonspacing Mark"],
  ["Mc", "Spacing Combining Mark"],
  ["Me", "Enclosing Mark"],
  ["Nd", "Decimal Number"],
  ["Nl", "Letter Number"],
  ["No", "Other Number"],
  ["Pc", "Connector Punctuation"],
  ["Pd", "Dash Punctuation"],
  ["Ps", "Open Punctuation"],
  ["Pe", "Close Punctuation"],
  ["Pi", "Initial Punctuation"],
  ["Pf", "Final Punctuation"],
  ["Po", "Other Punctuation"],
  ["Sm", "Math Symbol"],
  ["Sc", "Currency Symbol"],
  ["Sk", "Modifier Symbol"],
  ["So", "Other Symbol"],
  ["Zs", "Space Separator"],
  ["Zl", "Line Separator"],
  ["Zp", "Paragraph Separator"],
  ["Cc", "Control"],
  ["Cf", "Format"],
  ["Cs", "Surrogate"],
  ["Co", "Private Use"],
];

// Common scripts, tested in order with \p{Script=...}.
const SCRIPTS = [
  "Latin", "Greek", "Cyrillic", "Armenian", "Hebrew", "Arabic", "Syriac",
  "Thaana", "Devanagari", "Bengali", "Gurmukhi", "Gujarati", "Tamil",
  "Telugu", "Kannada", "Malayalam", "Sinhala", "Thai", "Lao", "Tibetan",
  "Myanmar", "Georgian", "Hangul", "Ethiopic", "Cherokee", "Khmer",
  "Mongolian", "Hiragana", "Katakana", "Han", "Bopomofo", "Yi", "Runic",
  "Ogham", "Coptic", "Braille",
];

// Unicode block ranges (subset covering the common planes). Used to name the
// block a code point sits in — reliable, since block boundaries are fixed.
const BLOCKS = [
  [0x0000, 0x007f, "Basic Latin"],
  [0x0080, 0x00ff, "Latin-1 Supplement"],
  [0x0100, 0x017f, "Latin Extended-A"],
  [0x0180, 0x024f, "Latin Extended-B"],
  [0x0250, 0x02af, "IPA Extensions"],
  [0x02b0, 0x02ff, "Spacing Modifier Letters"],
  [0x0300, 0x036f, "Combining Diacritical Marks"],
  [0x0370, 0x03ff, "Greek and Coptic"],
  [0x0400, 0x04ff, "Cyrillic"],
  [0x0500, 0x052f, "Cyrillic Supplement"],
  [0x0530, 0x058f, "Armenian"],
  [0x0590, 0x05ff, "Hebrew"],
  [0x0600, 0x06ff, "Arabic"],
  [0x0700, 0x074f, "Syriac"],
  [0x0900, 0x097f, "Devanagari"],
  [0x0980, 0x09ff, "Bengali"],
  [0x0e00, 0x0e7f, "Thai"],
  [0x1000, 0x109f, "Myanmar"],
  [0x10a0, 0x10ff, "Georgian"],
  [0x1100, 0x11ff, "Hangul Jamo"],
  [0x1e00, 0x1eff, "Latin Extended Additional"],
  [0x1f00, 0x1fff, "Greek Extended"],
  [0x2000, 0x206f, "General Punctuation"],
  [0x2070, 0x209f, "Superscripts and Subscripts"],
  [0x20a0, 0x20cf, "Currency Symbols"],
  [0x2100, 0x214f, "Letterlike Symbols"],
  [0x2150, 0x218f, "Number Forms"],
  [0x2190, 0x21ff, "Arrows"],
  [0x2200, 0x22ff, "Mathematical Operators"],
  [0x2300, 0x23ff, "Miscellaneous Technical"],
  [0x2400, 0x243f, "Control Pictures"],
  [0x2500, 0x257f, "Box Drawing"],
  [0x2580, 0x259f, "Block Elements"],
  [0x25a0, 0x25ff, "Geometric Shapes"],
  [0x2600, 0x26ff, "Miscellaneous Symbols"],
  [0x2700, 0x27bf, "Dingbats"],
  [0x2b00, 0x2bff, "Miscellaneous Symbols and Arrows"],
  [0x3000, 0x303f, "CJK Symbols and Punctuation"],
  [0x3040, 0x309f, "Hiragana"],
  [0x30a0, 0x30ff, "Katakana"],
  [0x3400, 0x4dbf, "CJK Unified Ideographs Extension A"],
  [0x4e00, 0x9fff, "CJK Unified Ideographs"],
  [0xac00, 0xd7af, "Hangul Syllables"],
  [0xe000, 0xf8ff, "Private Use Area"],
  [0xf900, 0xfaff, "CJK Compatibility Ideographs"],
  [0xfb00, 0xfb4f, "Alphabetic Presentation Forms"],
  [0xfe00, 0xfe0f, "Variation Selectors"],
  [0xfe30, 0xfe4f, "CJK Compatibility Forms"],
  [0xff00, 0xffef, "Halfwidth and Fullwidth Forms"],
  [0x1f000, 0x1f02f, "Mahjong Tiles"],
  [0x1f100, 0x1f1ff, "Enclosed Alphanumeric Supplement"],
  [0x1f300, 0x1f5ff, "Miscellaneous Symbols and Pictographs"],
  [0x1f600, 0x1f64f, "Emoticons"],
  [0x1f650, 0x1f67f, "Ornamental Dingbats"],
  [0x1f680, 0x1f6ff, "Transport and Map Symbols"],
  [0x1f700, 0x1f77f, "Alchemical Symbols"],
  [0x1f900, 0x1f9ff, "Supplemental Symbols and Pictographs"],
  [0x1fa70, 0x1faff, "Symbols and Pictographs Extended-A"],
  [0x20000, 0x2a6df, "CJK Unified Ideographs Extension B"],
];

// A small set of well-known named HTML entities.
const NAMED_ENTITIES = {
  34: "quot", 38: "amp", 39: "apos", 60: "lt", 62: "gt", 160: "nbsp",
  162: "cent", 163: "pound", 164: "curren", 165: "yen", 169: "copy",
  171: "laquo", 174: "reg", 176: "deg", 177: "plusmn", 187: "raquo",
  215: "times", 247: "divide", 8211: "ndash", 8212: "mdash",
  8216: "lsquo", 8217: "rsquo", 8220: "ldquo", 8221: "rdquo",
  8224: "dagger", 8225: "Dagger", 8226: "bull", 8230: "hellip",
  8364: "euro", 8482: "trade", 8592: "larr", 8593: "uarr",
  8594: "rarr", 8595: "darr", 8730: "radic", 8734: "infin",
  8804: "le", 8805: "ge", 9829: "hearts", 9824: "spades",
};

// Names for control characters (C0/C1) and a handful of invisible/tricky
// code points that people most often paste in to identify.
const NAMED_CHARS = {
  0x00: "NULL", 0x07: "BELL", 0x08: "BACKSPACE", 0x09: "CHARACTER TABULATION (Tab)",
  0x0a: "LINE FEED (LF)", 0x0b: "LINE TABULATION", 0x0c: "FORM FEED",
  0x0d: "CARRIAGE RETURN (CR)", 0x1b: "ESCAPE", 0x20: "SPACE",
  0x7f: "DELETE", 0x85: "NEXT LINE (NEL)", 0xa0: "NO-BREAK SPACE",
  0xad: "SOFT HYPHEN", 0x200b: "ZERO WIDTH SPACE", 0x200c: "ZERO WIDTH NON-JOINER",
  0x200d: "ZERO WIDTH JOINER", 0x200e: "LEFT-TO-RIGHT MARK",
  0x200f: "RIGHT-TO-LEFT MARK", 0x202f: "NARROW NO-BREAK SPACE",
  0x2060: "WORD JOINER", 0xfeff: "ZERO WIDTH NO-BREAK SPACE (BOM)",
  0xfffd: "REPLACEMENT CHARACTER", 0x3000: "IDEOGRAPHIC SPACE",
};

function toHex(n, pad) {
  let h = n.toString(16).toUpperCase();
  while (h.length < pad) h = "0" + h;
  return h;
}

function categoryOf(ch) {
  for (const [code, name] of CATEGORIES) {
    try {
      if (new RegExp("\\p{" + code + "}", "u").test(ch)) return code + " — " + name;
    } catch {
      /* engine may not know a property; skip */
    }
  }
  return "Cn — Unassigned / Unknown";
}

function scriptOf(ch) {
  for (const s of SCRIPTS) {
    try {
      if (new RegExp("\\p{Script=" + s + "}", "u").test(ch)) return s;
    } catch {
      /* ignore */
    }
  }
  return "";
}

function blockOf(cp) {
  for (const [start, end, name] of BLOCKS) {
    if (cp >= start && cp <= end) return name;
  }
  return "";
}

// Build the full descriptor for a single code point.
function describe(cp) {
  const ch = String.fromCodePoint(cp);
  const hex = toHex(cp, cp > 0xffff ? 5 : 4);

  // UTF-8 bytes.
  const bytes = Array.from(new TextEncoder().encode(ch));
  const utf8 = bytes.map((b) => toHex(b, 2)).join(" ");
  const url = bytes.map((b) => "%" + toHex(b, 2)).join("");

  // UTF-16 code units.
  const units = [];
  for (let i = 0; i < ch.length; i++) units.push(toHex(ch.charCodeAt(i), 4));
  const utf16 = units.join(" ");

  // Escapes.
  let jsEscape;
  if (cp <= 0xffff) {
    jsEscape = "\\u" + toHex(cp, 4);
  } else {
    jsEscape = "\\u{" + hex + "}  (or " + units.map((u) => "\\u" + u).join("") + ")";
  }
  const cssEscape = "\\" + toHex(cp, 6);
  const pyEscape = cp <= 0xffff ? "\\u" + toHex(cp, 4) : "\\U" + toHex(cp, 8);

  // HTML entities.
  const htmlDec = "&#" + cp + ";";
  const htmlHex = "&#x" + hex + ";";
  const named = NAMED_ENTITIES[cp] ? "&" + NAMED_ENTITIES[cp] + ";" : "";

  const name = NAMED_CHARS[cp] || "";

  return {
    cp,
    char: ch,
    codePoint: "U+" + hex,
    decimal: String(cp),
    name,
    block: blockOf(cp),
    category: categoryOf(ch),
    script: scriptOf(ch),
    htmlDec,
    htmlHex,
    named,
    jsEscape,
    cssEscape,
    pyEscape,
    utf8,
    utf16,
    url,
  };
}

// Parse the "find by code point" input into a code point number, or null.
function parseCodePoint(raw) {
  let s = raw.trim();
  if (!s) return null;

  // HTML entities.
  let m = s.match(/^&#x([0-9a-f]+);?$/i);
  if (m) return parseInt(m[1], 16);
  m = s.match(/^&#(\d+);?$/);
  if (m) return parseInt(m[1], 10);

  // U+ / 0x / \u / \x prefixes -> hex.
  m = s.match(/^(?:u\+|0x|\\u\{?|\\x)([0-9a-f]+)\}?$/i);
  if (m) return parseInt(m[1], 16);

  // Bare token: hex if it contains a-f, otherwise decimal.
  if (/^[0-9a-f]+$/i.test(s)) {
    const base = /[a-f]/i.test(s) ? 16 : 10;
    return parseInt(s, base);
  }

  // A single literal character pasted in.
  const cps = Array.from(s);
  if (cps.length === 1) return cps[0].codePointAt(0);

  return null;
}

const MAX_CHARS = 200;

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="tool-result">
      <span className="tool-result-label">{label}</span>
      <span className="tool-result-value">{value}</span>
    </div>
  );
}

export default function UnicodeLookup() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("Hi 👋 café — ☕");
  const [cpInput, setCpInput] = useState("U+1F600");
  const [copied, setCopied] = useState("");

  // Mode 1: analyse every code point in the text.
  const chars = useMemo(() => {
    if (mode !== "text") return [];
    const cps = Array.from(text); // iterates by code point (astral-safe)
    return cps.slice(0, MAX_CHARS).map((c) => describe(c.codePointAt(0)));
  }, [text, mode]);

  const stats = useMemo(() => {
    if (mode !== "text") return null;
    const cps = Array.from(text);
    let bytes = 0;
    if (text) bytes = new TextEncoder().encode(text).length;
    return {
      codePoints: cps.length,
      utf16: text.length,
      bytes,
    };
  }, [text, mode]);

  // Mode 2: single code point lookup.
  const single = useMemo(() => {
    if (mode !== "codepoint") return null;
    const cp = parseCodePoint(cpInput);
    if (cp === null || Number.isNaN(cp)) return { error: "" };
    if (cp < 0 || cp > 0x10ffff) {
      return { error: "Code point out of range. Valid values are U+0000 to U+10FFFF." };
    }
    if (cp >= 0xd800 && cp <= 0xdfff) {
      return { error: "That is a surrogate code point (U+D800–U+DFFF) and is not a valid standalone character." };
    }
    return { data: describe(cp), error: "" };
  }, [cpInput, mode]);

  async function handleCopy(key, value) {
    if (!value) return;
    try {
      await copyText(value);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }

  function DetailRows({ d }) {
    return (
      <>
        <Row label="Character" value={d.char.trim() ? d.char : "(no visible glyph)"} />
        {d.name ? <Row label="Name" value={d.name} /> : null}
        <Row label="Code point" value={d.codePoint} />
        <Row label="Decimal" value={d.decimal} />
        {d.block ? <Row label="Block" value={d.block} /> : null}
        <Row label="General category" value={d.category} />
        {d.script ? <Row label="Script" value={d.script} /> : null}
        <Row label="HTML (decimal)" value={d.htmlDec} />
        <Row label="HTML (hex)" value={d.htmlHex} />
        {d.named ? <Row label="HTML (named)" value={d.named} /> : null}
        <Row label="CSS escape" value={d.cssEscape} />
        <Row label="JavaScript" value={d.jsEscape} />
        <Row label="Python" value={d.pyEscape} />
        <Row label="UTF-8 bytes" value={d.utf8} />
        <Row label="UTF-16 units" value={d.utf16} />
        <Row label="URL encoded" value={d.url} />
      </>
    );
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="uni-mode">
            Mode
          </label>
          <select
            id="uni-mode"
            className="tool-select"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setCopied("");
            }}
          >
            <option value="text">Look up characters in text</option>
            <option value="codepoint">Find a character by code point</option>
          </select>
        </div>

        {mode === "text" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="uni-text">
              Text to inspect
            </label>
            <textarea
              id="uni-text"
              className="tool-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste any text, emoji, or symbol…"
              rows={4}
              spellCheck={false}
            />
            <p className="tool-note">
              Each code point is broken out below. Handy for spotting invisible
              or look-alike characters. Astral characters (emoji, rare CJK) count
              as one code point but two UTF-16 units.
            </p>
          </div>
        ) : (
          <div className="tool-field">
            <label className="tool-label" htmlFor="uni-cp">
              Code point
            </label>
            <input
              id="uni-cp"
              className="tool-input"
              value={cpInput}
              onChange={(e) => setCpInput(e.target.value)}
              placeholder="e.g. U+1F600, 1F600, 128512, or &#128512;"
              spellCheck={false}
            />
            <p className="tool-note">
              Accepts U+ notation, bare hex, a decimal number, an HTML entity
              (&amp;#x1F600;), a \u escape, or a single pasted character.
            </p>
          </div>
        )}
      </div>

      {mode === "text" && stats ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.codePoints.toLocaleString("en-US")}</div>
            <div className="tool-stat-label">Code points</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.utf16.toLocaleString("en-US")}</div>
            <div className="tool-stat-label">UTF-16 units</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.bytes.toLocaleString("en-US")}</div>
            <div className="tool-stat-label">UTF-8 bytes</div>
          </div>
        </div>
      ) : null}

      {mode === "text" ? (
        chars.length === 0 ? (
          <p className="tool-note">
            Enter some text above to see a full Unicode breakdown of every
            character. Everything runs privately in your browser — nothing is
            uploaded.
          </p>
        ) : (
          <div role="status" aria-live="polite">
            {chars.map((d, i) => (
              <div key={i} className="tool-field">
                <div className="tool-actions">
                  <button
                    className={copied === "t" + i ? "btn btn-success" : "btn btn-primary"}
                    type="button"
                    onClick={() => handleCopy("t" + i, d.codePoint)}
                    title="Copy code point"
                  >
                    {copied === "t" + i ? "Copied!" : d.codePoint}
                  </button>
                  <span className="tool-result-value">
                    {d.char.trim() ? d.char : "(invisible)"}
                  </span>
                </div>
                <DetailRows d={d} />
              </div>
            ))}
            {Array.from(text).length > MAX_CHARS ? (
              <p className="tool-note">
                Showing the first {MAX_CHARS} characters of{" "}
                {Array.from(text).length.toLocaleString("en-US")}. Trim the input
                to inspect the rest.
              </p>
            ) : null}
          </div>
        )
      ) : null}

      {mode === "codepoint" ? (
        single && single.error ? (
          <p className="tool-error">{single.error}</p>
        ) : single && single.data ? (
          <div className="tool-field" role="status" aria-live="polite">
            <div className="tool-actions">
              <button
                className={copied === "big" ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={() => handleCopy("big", single.data.char)}
              >
                {copied === "big" ? "Copied!" : "Copy character"}
              </button>
              <button
                className={copied === "cpv" ? "btn btn-success" : "btn"}
                type="button"
                onClick={() => handleCopy("cpv", single.data.codePoint)}
              >
                {copied === "cpv" ? "Copied!" : "Copy " + single.data.codePoint}
              </button>
            </div>
            <label className="tool-label" htmlFor="uni-glyph">
              Character
            </label>
            <pre className="tool-output" id="uni-glyph">
              {single.data.char.trim() ? single.data.char : "(no visible glyph — invisible or control character)"}
            </pre>
            <DetailRows d={single.data} />
          </div>
        ) : (
          <p className="tool-note">
            Enter a code point above to see the character it maps to, along with
            its encodings and escapes. Everything runs privately in your browser.
          </p>
        )
      ) : null}
    </div>
  );
}
