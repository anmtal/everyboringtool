"use client";

import { useMemo, useState } from "react";

// Build a character map for a Unicode "font" style by taking a base code point
// for A / a / 0 and adding the letter or digit offset, then applying overrides
// for the code points that are reserved holes in the Unicode block (mostly in
// the Mathematical Alphanumeric Symbols and Letterlike Symbols blocks).
function buildMap({ upper, lower, digit, overrides }) {
  const map = new Map();
  if (upper != null) {
    for (let i = 0; i < 26; i++) {
      map.set(String.fromCharCode(65 + i), String.fromCodePoint(upper + i));
    }
  }
  if (lower != null) {
    for (let i = 0; i < 26; i++) {
      map.set(String.fromCharCode(97 + i), String.fromCodePoint(lower + i));
    }
  }
  if (digit != null) {
    for (let i = 0; i < 10; i++) {
      map.set(String.fromCharCode(48 + i), String.fromCodePoint(digit + i));
    }
  }
  if (overrides) {
    for (const key of Object.keys(overrides)) {
      map.set(key, String.fromCodePoint(overrides[key]));
    }
  }
  return map;
}

// Each style either has a character `map`, or a `combine` combining code point
// that is appended after every visible character (Strikethrough).
const STYLES = [
  {
    id: "bold",
    label: "Bold",
    map: buildMap({ upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce }),
  },
  {
    id: "italic",
    label: "Italic",
    // Mathematical Italic has no digit range; the small "h" is reserved and
    // maps to U+210E (Planck constant).
    map: buildMap({ upper: 0x1d434, lower: 0x1d44e, overrides: { h: 0x210e } }),
  },
  {
    id: "bold-italic",
    label: "Bold Italic",
    map: buildMap({ upper: 0x1d468, lower: 0x1d482 }),
  },
  {
    id: "script",
    label: "Script",
    // Mathematical Script has many reserved holes filled from Letterlike Symbols.
    map: buildMap({
      upper: 0x1d49c,
      lower: 0x1d4b6,
      overrides: {
        B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110,
        L: 0x2112, M: 0x2133, R: 0x211b,
        e: 0x212f, g: 0x210a, o: 0x2134,
      },
    }),
  },
  {
    id: "monospace",
    label: "Monospace",
    map: buildMap({ upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 }),
  },
  {
    id: "circled",
    label: "Circled",
    // Enclosed Alphanumerics. Circled zero lives apart from 1-9.
    map: buildMap({
      upper: 0x24b6,
      lower: 0x24d0,
      overrides: {
        "0": 0x24ea, "1": 0x2460, "2": 0x2461, "3": 0x2462, "4": 0x2463,
        "5": 0x2464, "6": 0x2465, "7": 0x2466, "8": 0x2467, "9": 0x2468,
      },
    }),
  },
  {
    id: "fullwidth",
    label: "Fullwidth",
    map: buildMap({ upper: 0xff21, lower: 0xff41, digit: 0xff10 }),
  },
  {
    id: "strikethrough",
    label: "Strikethrough",
    combine: "̶", // combining long stroke overlay
  },
];

function styleText(text, style) {
  if (!text) return "";
  if (style.combine) {
    let out = "";
    for (const ch of text) {
      out += ch;
      // Don't strike through line breaks.
      if (ch !== "\n" && ch !== "\r") out += style.combine;
    }
    return out;
  }
  let out = "";
  for (const ch of text) {
    out += style.map.get(ch) || ch;
  }
  return out;
}

export default function FancyFontGenerator() {
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const results = useMemo(
    () => STYLES.map((s) => ({ id: s.id, label: s.label, value: styleText(text, s) })),
    [text]
  );

  const charCount = text.length;

  async function handleCopy(id, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 1500);
    } catch (e) {
      setCopiedId("");
    }
  }

  function handleClear() {
    setText("");
    setCopiedId("");
  }

  const hasText = text.length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ffg-input">
            Your text
          </label>
          <textarea
            id="ffg-input"
            className="tool-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopiedId("");
            }}
            placeholder="Type something to see it in fancy fonts…"
            rows={4}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{charCount.toLocaleString("en-US")}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{STYLES.length}</div>
          <div className="tool-stat-label">Font styles</div>
        </div>
      </div>

      {hasText ? (
        results.map((r) => (
          <div className="tool-result" role="status" aria-live="polite" key={r.id}>
            <p className="tool-result-label">{r.label}</p>
            <div
              className="tool-result-value"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {r.value}
            </div>
            <div className="tool-actions">
              <button
                className={copiedId === r.id ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={() => handleCopy(r.id, r.value)}
              >
                {copiedId === r.id ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="tool-note">
          Type or paste any text above and it will instantly appear in Bold,
          Italic, Script, Monospace, Circled, Fullwidth and more. Copy any style
          with one click and paste it into your bio, posts, or messages.
        </p>
      )}

      <p className="tool-note">
        These styles are made from real Unicode characters, so they work almost
        anywhere plain text does — social media bios, usernames, captions, and
        chats. Letters, numbers, and symbols that a style does not cover are left
        unchanged. Everything runs live in your browser and nothing you type is
        ever uploaded.
      </p>
    </div>
  );
}
