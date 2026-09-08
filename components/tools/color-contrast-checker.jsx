"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Parse a 3-, 4-, 6-, or 8-digit hex color (with or without leading #).
// Returns {r,g,b,a} with r/g/b 0-255 and a 0-1, or null when invalid.
function parseHex(str) {
  if (typeof str !== "string") return null;
  const s = str.trim().replace(/^#/, "");
  const hx = (h) => parseInt(h, 16);
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return { r: hx(s[0] + s[0]), g: hx(s[1] + s[1]), b: hx(s[2] + s[2]), a: 1 };
  }
  if (/^[0-9a-fA-F]{4}$/.test(s)) {
    return {
      r: hx(s[0] + s[0]),
      g: hx(s[1] + s[1]),
      b: hx(s[2] + s[2]),
      a: hx(s[3] + s[3]) / 255,
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return { r: hx(s.slice(0, 2)), g: hx(s.slice(2, 4)), b: hx(s.slice(4, 6)), a: 1 };
  }
  if (/^[0-9a-fA-F]{8}$/.test(s)) {
    return {
      r: hx(s.slice(0, 2)),
      g: hx(s.slice(2, 4)),
      b: hx(s.slice(4, 6)),
      a: hx(s.slice(6, 8)) / 255,
    };
  }
  return null;
}

// Parse rgb()/rgba() functional notation, e.g. "rgb(255, 0, 0)" or
// "rgba(0,0,0,0.5)". Returns {r,g,b,a} or null.
function parseRgbFunc(str) {
  if (typeof str !== "string") return null;
  const m = str
    .trim()
    .match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i
    );
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (r > 255 || g > 255 || b > 255 || a > 1) return null;
  return { r, g, b, a };
}

// A small set of common CSS named colors so people can type "white".
const NAMED = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  navy: "#000080",
  orange: "#ffa500",
  yellow: "#ffff00",
  purple: "#800080",
  teal: "#008080",
};

// Accept hex, rgb()/rgba(), or a named color. Returns {r,g,b,a} or null.
function parseColor(str) {
  if (typeof str !== "string") return null;
  const t = str.trim().toLowerCase();
  if (NAMED[t]) return parseHex(NAMED[t]);
  return parseHex(str) || parseRgbFunc(str);
}

// Composite a possibly-translucent foreground over an opaque background,
// per the standard "over" alpha-compositing formula. Returns opaque {r,g,b}.
function flatten(fg, bgOpaque) {
  const a = fg.a;
  return {
    r: fg.r * a + bgOpaque.r * (1 - a),
    g: fg.g * a + bgOpaque.g * (1 - a),
    b: fg.b * a + bgOpaque.b * (1 - a),
  };
}

// WCAG relative luminance from linearized sRGB channels (0-255 input).
function relativeLuminance({ r, g, b }) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

// WCAG contrast ratio between two opaque colors: (L1+0.05)/(L2+0.05).
function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex({ r, g, b }) {
  const h = (n) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return ("#" + h(r) + h(g) + h(b)).toUpperCase();
}

export default function ColorContrastChecker() {
  const [fgInput, setFgInput] = useState("#1A1A1A");
  const [bgInput, setBgInput] = useState("#FFFFFF");
  const [copied, setCopied] = useState(false);

  const fg = useMemo(() => parseColor(fgInput), [fgInput]);
  const bg = useMemo(() => parseColor(bgInput), [bgInput]);

  const fgInvalid = fgInput.trim() !== "" && fg === null;
  const bgInvalid = bgInput.trim() !== "" && bg === null;

  // The background is treated as opaque (drop any alpha); the foreground is
  // composited over it so translucent text is scored correctly.
  const result = useMemo(() => {
    if (!fg || !bg) return null;
    const bgOpaque = { r: bg.r, g: bg.g, b: bg.b };
    const fgOpaque = fg.a < 1 ? flatten(fg, bgOpaque) : { r: fg.r, g: fg.g, b: fg.b };
    const ratio = contrastRatio(fgOpaque, bgOpaque);
    return { ratio, bgOpaque, fgOpaque };
  }, [fg, bg]);

  const ratio = result ? result.ratio : 0;
  const ratioText = result ? ratio.toFixed(2) + ":1" : "--";

  // WCAG 2.x thresholds:
  // Normal text: AA >= 4.5, AAA >= 7
  // Large text (>= 18.66px bold, or >= 24px): AA >= 3, AAA >= 4.5
  // UI components / graphics (non-text): >= 3
  const checks = result
    ? [
        { label: "Normal text - AA", need: 4.5, pass: ratio >= 4.5 },
        { label: "Normal text - AAA", need: 7, pass: ratio >= 7 },
        { label: "Large text - AA", need: 3, pass: ratio >= 3 },
        { label: "Large text - AAA", need: 4.5, pass: ratio >= 4.5 },
        { label: "UI & graphics - AA", need: 3, pass: ratio >= 3 },
      ]
    : [];

  const previewFg = result ? toHex(result.fgOpaque) : "#000000";
  const previewBg = result ? toHex(result.bgOpaque) : "#FFFFFF";

  function swap() {
    setFgInput(bgInput);
    setBgInput(fgInput);
  }

  async function copySummary() {
    if (!result) return;
    const summary =
      `Contrast ratio: ${ratioText}\n` +
      `Foreground: ${fgInput}  Background: ${bgInput}\n` +
      checks
        .map((c) => `${c.label}: ${c.pass ? "PASS" : "FAIL"} (needs ${c.need}:1)`)
        .join("\n");
    try {
      await copyText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ccc-fg">
              Foreground (text) color
            </label>
            <input
              id="ccc-fg"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="#1A1A1A, rgb(26,26,26), or black"
              value={fgInput}
              onChange={(e) => setFgInput(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ccc-fg-pick">
              Pick text color
            </label>
            <input
              id="ccc-fg-pick"
              className="tool-input"
              type="color"
              value={fg ? previewFg : "#000000"}
              onChange={(e) => setFgInput(e.target.value.toUpperCase())}
              style={{ height: 44, padding: 4, cursor: "pointer" }}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ccc-bg">
              Background color
            </label>
            <input
              id="ccc-bg"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="#FFFFFF, rgb(255,255,255), or white"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ccc-bg-pick">
              Pick background color
            </label>
            <input
              id="ccc-bg-pick"
              className="tool-input"
              type="color"
              value={bg ? previewBg : "#FFFFFF"}
              onChange={(e) => setBgInput(e.target.value.toUpperCase())}
              style={{ height: 44, padding: 4, cursor: "pointer" }}
            />
          </div>
        </div>

        <div className="tool-actions">
          <button type="button" className="btn" onClick={swap}>
            Swap colors
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={copySummary}
            disabled={!result}
          >
            {copied ? "Copied!" : "Copy report"}
          </button>
        </div>
      </div>

      {fgInvalid && (
        <p className="tool-error">
          Foreground is not a valid color. Try a hex code (#1A1A1A), rgb() /
          rgba(), or a name like black.
        </p>
      )}
      {bgInvalid && (
        <p className="tool-error">
          Background is not a valid color. Try a hex code (#FFFFFF), rgb() /
          rgba(), or a name like white.
        </p>
      )}

      {result ? (
        <>
          <div
            aria-label="Contrast preview"
            style={{
              marginTop: 4,
              borderRadius: 12,
              border: "1px solid rgba(128,128,128,0.35)",
              background: previewBg,
              color: previewFg,
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 700 }}>
              Large text sample
            </span>
            <span style={{ fontSize: 15 }}>
              Normal body text sample: the quick brown fox jumps over the lazy
              dog. 0123456789.
            </span>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Contrast ratio</div>
            <div className="tool-result-value">{ratioText}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            {checks.map((c) => (
              <div className="tool-stat" key={c.label}>
                <div className="tool-stat-num">{c.pass ? "Pass" : "Fail"}</div>
                <div className="tool-stat-label">
                  {c.label} ({"≥"}
                  {c.need}:1)
                </div>
              </div>
            ))}
          </div>

          <p className="tool-note">
            Large text means at least 18.66px bold or 24px regular. The UI &
            graphics rule (WCAG 1.4.11) applies to icons, form borders, focus
            rings, and chart elements. A translucent foreground is composited
            over the background before scoring; the background is treated as
            opaque.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a foreground and background color above to see the WCAG contrast
          ratio and whether it passes AA and AAA for normal text, large text,
          and UI elements.
        </p>
      )}

      <p className="tool-note">
        Contrast is calculated with the official WCAG 2.x formula using sRGB
        relative luminance. Everything runs privately in your browser - no
        uploads, no sign-up.
      </p>
    </div>
  );
}
