"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Named entities we decode (and use for named-mode encoding of the essentials).
const NAMED_TO_CHAR = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  deg: "°",
  plusmn: "±",
  times: "×",
  divide: "÷",
  micro: "µ",
  para: "¶",
  sect: "§",
  bull: "•",
  dagger: "†",
  Dagger: "‡",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
  spades: "♠",
  clubs: "♣",
  hearts: "♥",
  diams: "♦",
};

// The 5 characters that must be escaped in HTML, plus their named entities.
const BASIC_NAMED = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;", // &apos; is not valid in HTML4, &#39; is universally safe
};

// Build a reverse map char -> name for named encoding mode.
const CHAR_TO_NAMED = Object.entries(NAMED_TO_CHAR).reduce((acc, [name, ch]) => {
  // prefer the first (canonical) name we encounter for a given char
  if (!(ch in acc)) acc[ch] = name;
  return acc;
}, {});

// Iterate code points of a string safely (handles astral chars / emoji).
function codePoints(str) {
  return Array.from(str);
}

function isBasicAscii(cp) {
  const c = cp.codePointAt(0);
  return c >= 0x20 && c <= 0x7e;
}

function encodeEntities(input, { mode, scope }) {
  let out = "";
  for (const cp of codePoints(input)) {
    const c = cp.codePointAt(0);

    // Decide whether this char should be encoded.
    const isSpecial = cp in BASIC_NAMED;
    let shouldEncode;
    if (scope === "minimal") {
      shouldEncode = isSpecial;
    } else {
      // "all-nonascii": encode the 5 specials AND anything outside printable ASCII
      shouldEncode = isSpecial || !isBasicAscii(cp);
    }

    if (!shouldEncode) {
      out += cp;
      continue;
    }

    if (mode === "named" && cp in CHAR_TO_NAMED) {
      out += "&" + CHAR_TO_NAMED[cp] + ";";
    } else if (mode === "named" && isSpecial) {
      out += BASIC_NAMED[cp];
    } else if (mode === "hex") {
      out += "&#x" + c.toString(16).toUpperCase() + ";";
    } else {
      // decimal (default numeric)
      out += "&#" + c + ";";
    }
  }
  return out;
}

// Decode numeric (&#123; and &#x1F600;) plus known named entities.
function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === "#") {
      let cp;
      if (body[1] === "x" || body[1] === "X") {
        cp = parseInt(body.slice(2), 16);
      } else {
        cp = parseInt(body.slice(1), 10);
      }
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return match;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return match;
      }
    }
    // named
    if (body in NAMED_TO_CHAR) return NAMED_TO_CHAR[body];
    return match; // leave unknown entities untouched
  });
}

const EXAMPLE = 'Café "Ñandú" & Co. — 5 < 10, 100% © 2026 <script>alert(1)</script>';

export default function HtmlEntityEncoder() {
  const [text, setText] = useState(EXAMPLE);
  const [direction, setDirection] = useState("encode"); // encode | decode
  const [mode, setMode] = useState("named"); // named | decimal | hex
  const [scope, setScope] = useState("minimal"); // minimal | all-nonascii
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!text) return "";
    if (direction === "decode") return decodeEntities(text);
    return encodeEntities(text, { mode, scope });
  }, [text, direction, mode, scope]);

  const stats = useMemo(() => {
    const inChars = codePoints(text).length;
    const outChars = codePoints(output).length;
    let entityCount = 0;
    if (direction === "encode") {
      const m = output.match(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g);
      entityCount = m ? m.length : 0;
    } else {
      const m = text.match(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g);
      entityCount = m ? m.length : 0;
    }
    return { inChars, outChars, entityCount };
  }, [text, output, direction]);

  async function handleCopy() {
    if (!output) return;
    await copyText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSwap() {
    // Swap direction and move output into input for round-tripping.
    setText(output);
    setDirection((d) => (d === "encode" ? "decode" : "encode"));
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hee-direction">
              Mode
            </label>
            <select
              id="hee-direction"
              className="tool-select"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="encode">Encode (text → entities)</option>
              <option value="decode">Decode (entities → text)</option>
            </select>
          </div>

          {direction === "encode" && (
            <>
              <div className="tool-field">
                <label className="tool-label" htmlFor="hee-entmode">
                  Entity type
                </label>
                <select
                  id="hee-entmode"
                  className="tool-select"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="named">Named (&amp;amp; &amp;copy;)</option>
                  <option value="decimal">Decimal (&amp;#38;)</option>
                  <option value="hex">Hex (&amp;#x26;)</option>
                </select>
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="hee-scope">
                  What to encode
                </label>
                <select
                  id="hee-scope"
                  className="tool-select"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="minimal">Only HTML-unsafe (&amp; &lt; &gt; " ')</option>
                  <option value="all-nonascii">All non-ASCII too</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="hee-input">
            {direction === "encode" ? "Text to encode" : "Entities to decode"}
          </label>
          <textarea
            id="hee-input"
            className="tool-textarea"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              direction === "encode"
                ? "Paste plain text or HTML here…"
                : "Paste text containing HTML entities like &amp;amp; or &amp;#169;…"
            }
          />
        </div>

        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={handleCopy} disabled={!output}>
            {copied ? "Copied!" : "Copy output"}
          </button>
          <button type="button" className="btn" onClick={handleSwap} disabled={!output}>
            {direction === "encode" ? "↔ Decode the result" : "↔ Encode the result"}
          </button>
        </div>
      </div>

      {output ? (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">
            {direction === "encode" ? "Encoded output" : "Decoded output"}
          </div>
          <pre className="tool-output">{output}</pre>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{stats.inChars}</div>
              <div className="tool-stat-label">Input chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{stats.outChars}</div>
              <div className="tool-stat-label">Output chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{stats.entityCount}</div>
              <div className="tool-stat-label">
                {direction === "encode" ? "Entities written" : "Entities found"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="tool-note">
          Type or paste something above to see the {direction === "encode" ? "encoded" : "decoded"}{" "}
          result. Nothing is uploaded — it all runs in your browser.
        </p>
      )}

      <p className="tool-note">
        Encoding always escapes the five HTML-unsafe characters (&amp; &lt; &gt; &quot; and
        apostrophe). Choose "All non-ASCII too" to also escape accented letters, symbols and emoji so
        your markup is safe in any character encoding. Decoding understands numeric entities
        (decimal and hex) plus common named entities.
      </p>
    </div>
  );
}
