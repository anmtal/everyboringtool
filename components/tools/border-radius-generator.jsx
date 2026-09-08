"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Clamp a value into a non-negative pixel radius (0-500), never NaN.
function clampPx(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(500, Math.round(n)));
}

// Build the shortest correct border-radius shorthand from four corner values.
// CSS order is: top-left, top-right, bottom-right, bottom-left.
function shorthand(tl, tr, br, bl) {
  if (tl === tr && tr === br && br === bl) return `${tl}px`;
  if (tl === br && tr === bl) return `${tl}px ${tr}px`;
  if (tr === bl) return `${tl}px ${tr}px ${br}px`;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

const CORNERS = [
  { key: "tl", label: "Top-left" },
  { key: "tr", label: "Top-right" },
  { key: "br", label: "Bottom-right" },
  { key: "bl", label: "Bottom-left" },
];

export default function BorderRadiusGenerator() {
  // Four independent corner radii in pixels. Sensible defaults show a result on load.
  const [radii, setRadii] = useState({ tl: 24, tr: 24, br: 24, bl: 24 });
  const [linked, setLinked] = useState(true);
  const [copied, setCopied] = useState("");

  const css = useMemo(
    () => shorthand(radii.tl, radii.tr, radii.br, radii.bl),
    [radii]
  );

  const cssBlock = `border-radius: ${css};`;
  const longhand = [
    `border-top-left-radius: ${radii.tl}px;`,
    `border-top-right-radius: ${radii.tr}px;`,
    `border-bottom-right-radius: ${radii.br}px;`,
    `border-bottom-left-radius: ${radii.bl}px;`,
  ].join("\n");

  function setCorner(key, value) {
    const px = value === "" ? 0 : clampPx(Number(value));
    if (linked) {
      setRadii({ tl: px, tr: px, br: px, bl: px });
    } else {
      setRadii((prev) => ({ ...prev, [key]: px }));
    }
  }

  function applyPreset(px) {
    setRadii({ tl: px, tr: px, br: px, bl: px });
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

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="brg-linked">
            <input
              id="brg-linked"
              type="checkbox"
              checked={linked}
              onChange={(e) => setLinked(e.target.checked)}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Link all corners (move one, move all)
          </label>
        </div>

        {CORNERS.map((c) => (
          <div className="tool-field" key={c.key}>
            <label className="tool-label" htmlFor={`brg-${c.key}`}>
              {c.label}: {radii[c.key]}px
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <input
                id={`brg-${c.key}`}
                type="range"
                min={0}
                max={200}
                step={1}
                value={radii[c.key]}
                onChange={(e) => setCorner(c.key, e.target.value)}
                style={{ flex: "1 1 200px", cursor: "pointer" }}
              />
              <input
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={500}
                aria-label={`${c.label} radius in pixels`}
                value={radii[c.key]}
                onChange={(e) => setCorner(c.key, e.target.value)}
                style={{ width: 90 }}
              />
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button type="button" className="btn" onClick={() => applyPreset(0)}>
            Square (0)
          </button>
          <button type="button" className="btn" onClick={() => applyPreset(8)}>
            Subtle (8)
          </button>
          <button type="button" className="btn" onClick={() => applyPreset(16)}>
            Rounded (16)
          </button>
          <button type="button" className="btn" onClick={() => applyPreset(500)}>
            Pill / Circle
          </button>
        </div>
      </div>

      <div
        aria-label="Border radius preview"
        style={{
          marginTop: 8,
          minHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          border: "1px solid rgba(128,128,128,0.25)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            width: 220,
            height: 180,
            background:
              "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
            borderRadius: `${radii.tl}px ${radii.tr}px ${radii.br}px ${radii.bl}px`,
          }}
        />
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">CSS (shorthand)</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="tool-result-value">{cssBlock}</div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => copy(cssBlock, "short")}
          >
            {copied === "short" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">CSS (longhand, per corner)</div>
        <pre className="tool-output">{longhand}</pre>
        <div className="tool-actions">
          <button
            type="button"
            className="btn"
            onClick={() => copy(longhand, "long")}
          >
            {copied === "long" ? "Copied!" : "Copy longhand"}
          </button>
        </div>
      </div>

      <p className="tool-note">
        Drag the sliders or type an exact pixel value for each corner. The
        preview and CSS update instantly, and the shorthand is collapsed to the
        shortest correct form. A very large radius (like the Pill / Circle
        preset) rounds each corner as far as the box allows, giving a pill on
        wide boxes and a circle on square ones. Everything runs privately in
        your browser.
      </p>
    </div>
  );
}
