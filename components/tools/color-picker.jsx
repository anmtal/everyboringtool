"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

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

// The complementary color is the one 180 degrees opposite on the hue wheel.
// Rotating the RGB channels through HSL keeps saturation/lightness intact.
function complementRgb({ r, g, b }) {
  const { h, s, l } = rgbToHsl({ r, g, b });
  return hslToRgb((h + 180) % 360, s, l);
}

// Convert {h(0-360), s(0-100), l(0-100)} back to {r,g,b} (0-255).
function hslToRgb(h, s, l) {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = ln - c / 2;
  return {
    r: clampByte((r1 + m) * 255),
    g: clampByte((g1 + m) * 255),
    b: clampByte((b1 + m) * 255),
  };
}

// Relative luminance (WCAG) used to pick a readable label color on a swatch.
function relativeLuminance({ r, g, b }) {
  const lin = [r, g, b].map((v) => {
    const c = clampByte(v) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function readableTextOn(rgb) {
  return relativeLuminance(rgb) > 0.5
    ? "rgba(0,0,0,0.85)"
    : "rgba(255,255,255,0.95)";
}

export default function ColorPicker() {
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [hexInput, setHexInput] = useState("#3B82F6");
  const [copied, setCopied] = useState("");

  // Canonical derived values, always computed from the valid {r,g,b} state.
  const hexNormalized = useMemo(() => rgbToHex(rgb), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const comp = useMemo(() => complementRgb(rgb), [rgb]);
  const compHex = useMemo(() => rgbToHex(comp), [comp]);
  const compHsl = useMemo(() => rgbToHsl(comp), [comp]);

  // Palette: a strip of tints/shades at the same hue, plus harmony colors.
  const shades = useMemo(
    () => [92, 82, 72, 62, 50, 40, 30, 20, 12].map((l) => rgbToHex(hslToRgb(hsl.h, hsl.s, l))),
    [hsl.h, hsl.s]
  );
  const harmonies = useMemo(() => ([
    { name: "Complementary", hex: rgbToHex(hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l)) },
    { name: "Analogous −30°", hex: rgbToHex(hslToRgb((hsl.h + 330) % 360, hsl.s, hsl.l)) },
    { name: "Analogous +30°", hex: rgbToHex(hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l)) },
    { name: "Triadic +120°", hex: rgbToHex(hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l)) },
    { name: "Triadic +240°", hex: rgbToHex(hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)) },
  ]), [hsl.h, hsl.s, hsl.l]);

  // Gradient generator: current color -> a second color (defaults to complement).
  const [gradTo, setGradTo] = useState("");
  const [gradDir, setGradDir] = useState("to right");
  const effGradTo = gradTo || compHex;
  const gradientCss = `linear-gradient(${gradDir}, ${hexNormalized}, ${effGradTo})`;

  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const compRgbString = `rgb(${comp.r}, ${comp.g}, ${comp.b})`;
  const compHslString = `hsl(${compHsl.h}, ${compHsl.s}%, ${compHsl.l}%)`;

  const swatchTextColor = readableTextOn(rgb);
  const compTextColor = readableTextOn(comp);

  const hexIsInvalid = hexInput.trim() !== "" && parseHex(hexInput) === null;

  // Editable HEX field: update text immediately, sync color only when valid.
  function handleHexChange(value) {
    setHexInput(value);
    const parsed = parseHex(value);
    if (parsed) setRgb(parsed);
  }

  // Native color input always yields a valid #rrggbb value.
  function handlePickerChange(value) {
    const parsed = parseHex(value);
    if (parsed) {
      setRgb(parsed);
      setHexInput(value.toUpperCase());
    }
  }

  async function copy(text, key) {
    try {
      await copyText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be unavailable (permissions / insecure context); ignore.
    }
  }

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
            <label className="tool-label" htmlFor="cp-picker">
              Pick a color
            </label>
            <input
              id="cp-picker"
              className="tool-input"
              type="color"
              value={hexNormalized}
              onChange={(e) => handlePickerChange(e.target.value)}
              style={{ height: 44, padding: 4, cursor: "pointer" }}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cp-hex">
              HEX code
            </label>
            <input
              id="cp-hex"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="#3B82F6 or 3b82f6 or #abc"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              }}
            />
          </div>
        </div>
      </div>

      {hexIsInvalid && (
        <p className="tool-error">
          Enter a valid hex color: 3 or 6 digits (0-9, A-F), like #abc or
          #3B82F6.
        </p>
      )}

      <div
        aria-label="Selected color preview"
        style={{
          marginTop: 4,
          minHeight: 170,
          borderRadius: 12,
          border: "1px solid rgba(128,128,128,0.35)",
          background: hexNormalized,
          color: swatchTextColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>
          {hexNormalized}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{rgbString}</div>
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

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Complementary color</div>
        <div
          aria-label="Complementary color preview"
          style={{
            marginTop: 8,
            minHeight: 90,
            borderRadius: 12,
            border: "1px solid rgba(128,128,128,0.35)",
            background: compHex,
            color: compTextColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          }}
        >
          {compHex}
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="tool-result-value">
            {compHex} · {compRgbString} · {compHslString}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => copy(compHex, "comp")}
          >
            {copied === "comp" ? "Copied!" : "Copy HEX"}
          </button>
        </div>
      </div>

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
          <div className="tool-stat-num">{hsl.h}&deg;</div>
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

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Shades &amp; tints</div>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
          {shades.map((hex) => (
            <button key={hex} type="button" onClick={() => copy(hex, "sh-" + hex)} title={`Copy ${hex}`}
              style={{ flex: 1, height: 40, background: hex, border: "none", cursor: "pointer" }} aria-label={`Copy ${hex}`} />
          ))}
        </div>
        <div className="tool-result-label" style={{ marginTop: 14 }}>Color harmonies</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {harmonies.map((h) => (
            <button key={h.name} type="button" onClick={() => copy(h.hex, "hm-" + h.hex)} title={`Copy ${h.hex}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: 20, border: "1px solid var(--border, rgba(128,128,128,0.3))", background: "var(--surface-2, rgba(127,127,127,0.06))", cursor: "pointer", fontSize: 12.5 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: h.hex, display: "inline-block" }} />
              {copied === "hm-" + h.hex ? "Copied!" : `${h.name} · ${h.hex}`}
            </button>
          ))}
        </div>
        <p className="tool-note" style={{ marginTop: 8 }}>Click any swatch to copy its hex.</p>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">CSS gradient</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>To
            <input type="color" value={effGradTo} onChange={(e) => setGradTo(e.target.value.toUpperCase())} style={{ width: 40, height: 32, padding: 2 }} />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>Direction
            <select className="tool-select" value={gradDir} onChange={(e) => setGradDir(e.target.value)} style={{ width: "auto" }}>
              <option value="to right">→ right</option>
              <option value="to bottom">↓ bottom</option>
              <option value="to bottom right">↘ diagonal</option>
              <option value="45deg">45°</option>
              <option value="135deg">135°</option>
            </select>
          </label>
        </div>
        <div style={{ height: 60, borderRadius: 10, marginTop: 10, background: gradientCss, border: "1px solid rgba(128,128,128,0.3)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
          <code style={{ fontSize: 12.5, wordBreak: "break-all" }}>background: {gradientCss};</code>
          <button type="button" className="btn" onClick={() => copy(`background: ${gradientCss};`, "grad")}>{copied === "grad" ? "Copied!" : "Copy CSS"}</button>
        </div>
      </div>

      <p className="tool-note">
        Drag the picker or type a hex code and every value updates instantly. The
        two fields stay in sync, short 3-digit hex (like #abc) and codes without a
        # are accepted, and the complementary color is the exact opposite hue.
        Everything runs in your browser.
      </p>
    </div>
  );
}
