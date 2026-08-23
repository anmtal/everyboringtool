"use client";

import { useMemo, useState } from "react";

// Clamp any value into a 0-255 integer channel; never returns NaN.
function clampByte(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

// Parse a 3- or 6-digit hex string (with or without leading #) to {r,g,b}.
// Returns null when the input is not a valid hex color.
function parseHex(str) {
  if (typeof str !== "string") return null;
  const s = str.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return {
      r: parseInt(s[0] + s[0], 16),
      g: parseInt(s[1] + s[1], 16),
      b: parseInt(s[2] + s[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
    };
  }
  return null;
}

// Format {r,g,b} as an uppercase #RRGGBB string.
function rgbToHex({ r, g, b }) {
  const h = (n) => clampByte(n).toString(16).padStart(2, "0");
  return ("#" + h(r) + h(g) + h(b)).toUpperCase();
}

// Convert {r,g,b} (0-255) to {h,s,l} with h in degrees, s/l in percent.
function rgbToHsl({ r, g, b }) {
  const rn = clampByte(r) / 255;
  const gn = clampByte(g) / 255;
  const bn = clampByte(b) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Relative luminance (WCAG) used to pick a readable label color on the swatch.
function relativeLuminance({ r, g, b }) {
  const lin = [r, g, b].map((v) => {
    const c = clampByte(v) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export default function ColorConverter() {
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [hexInput, setHexInput] = useState("#3B82F6");
  const [copied, setCopied] = useState("");

  // Canonical derived values, always computed from the valid {r,g,b} state.
  const hexNormalized = useMemo(() => rgbToHex(rgb), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const swatchTextColor =
    relativeLuminance(rgb) > 0.5 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";

  const hexIsInvalid = hexInput.trim() !== "" && parseHex(hexInput) === null;

  function handleHexChange(value) {
    setHexInput(value);
    const parsed = parseHex(value);
    if (parsed) setRgb(parsed);
  }

  function handlePickerChange(value) {
    // Native color input always yields a valid #rrggbb value.
    const parsed = parseHex(value);
    if (parsed) {
      setRgb(parsed);
      setHexInput(value.toUpperCase());
    }
  }

  function handleChannelChange(channel, value) {
    const next = { ...rgb, [channel]: value === "" ? 0 : clampByte(Number(value)) };
    setRgb(next);
    setHexInput(rgbToHex(next));
  }

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be unavailable (permissions / insecure context); ignore.
    }
  }

  const channels = [
    { key: "r", label: "Red" },
    { key: "g", label: "Green" },
    { key: "b", label: "Blue" },
  ];

  const results = [
    { key: "hex", label: "HEX", value: hexNormalized },
    { key: "rgb", label: "RGB", value: rgbString },
    { key: "hsl", label: "HSL", value: hslString },
  ];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cc-hex">
              HEX color
            </label>
            <input
              id="cc-hex"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="#3B82F6 or 3b82f6 or #abc"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cc-picker">
              Pick a color
            </label>
            <input
              id="cc-picker"
              className="tool-input"
              type="color"
              value={hexNormalized}
              onChange={(e) => handlePickerChange(e.target.value)}
              style={{ height: 44, padding: 4, cursor: "pointer" }}
            />
          </div>
        </div>

        <div className="tool-row">
          {channels.map((c) => (
            <div className="tool-field" key={c.key}>
              <label className="tool-label" htmlFor={`cc-${c.key}`}>
                {c.label} (0-255)
              </label>
              <input
                id={`cc-${c.key}`}
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={255}
                value={rgb[c.key]}
                onChange={(e) => handleChannelChange(c.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {hexIsInvalid && (
        <p className="tool-error">
          Enter a valid hex color: 3 or 6 digits (0-9, A-F), like #abc or
          #3B82F6.
        </p>
      )}

      <div
        aria-label="Color preview"
        style={{
          marginTop: 4,
          minHeight: 150,
          borderRadius: 12,
          border: "1px solid rgba(128,128,128,0.35)",
          background: hexNormalized,
          color: swatchTextColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 1,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
      >
        {hexNormalized}
      </div>

      {results.map((row) => (
        <div className="tool-result" role="status" aria-live="polite" key={row.key}>
          <div className="tool-result-label">{row.label}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div className="tool-result-value">{row.value}</div>
            <button
              type="button"
              className="btn"
              onClick={() => copy(row.value, row.key)}
            >
              {copied === row.key ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      ))}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{rgb.r}</div>
          <div className="tool-stat-label">Red</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{rgb.g}</div>
          <div className="tool-stat-label">Green</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{rgb.b}</div>
          <div className="tool-stat-label">Blue</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{hsl.h}°</div>
          <div className="tool-stat-label">Hue</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{hsl.s}%</div>
          <div className="tool-stat-label">Saturation</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{hsl.l}%</div>
          <div className="tool-stat-label">Lightness</div>
        </div>
      </div>

      <p className="tool-note">
        Type a hex code, drag the picker, or edit the R/G/B fields, and every
        value updates instantly. Short 3-digit hex (like #abc) and codes without
        a # are accepted. Everything runs in your browser.
      </p>
    </div>
  );
}
