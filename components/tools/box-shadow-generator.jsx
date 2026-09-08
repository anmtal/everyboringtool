"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Clamp a number into a range, tolerating empty/NaN input.
function clampNum(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

// Parse "#RRGGBB" (or #RGB) into {r,g,b}; returns black on bad input.
function hexToRgb(hex) {
  const s = String(hex).trim().replace(/^#/, "");
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
  return { r: 0, g: 0, b: 0 };
}

// Build the CSS value for one shadow layer.
function layerToCss(layer) {
  const { r, g, b } = hexToRgb(layer.color);
  const a = clampNum(layer.opacity, 0, 100) / 100;
  const alpha = Math.round(a * 1000) / 1000;
  const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  const parts = [
    `${layer.x}px`,
    `${layer.y}px`,
    `${layer.blur}px`,
    `${layer.spread}px`,
    rgba,
  ];
  return `${layer.inset ? "inset " : ""}${parts.join(" ")}`;
}

let nextId = 1;
function makeLayer(overrides = {}) {
  return {
    id: nextId++,
    x: 0,
    y: 10,
    blur: 20,
    spread: 0,
    color: "#000000",
    opacity: 20,
    inset: false,
    ...overrides,
  };
}

const CONTROLS = [
  { key: "x", label: "Offset X", min: -100, max: 100, unit: "px" },
  { key: "y", label: "Offset Y", min: -100, max: 100, unit: "px" },
  { key: "blur", label: "Blur", min: 0, max: 200, unit: "px" },
  { key: "spread", label: "Spread", min: -100, max: 100, unit: "px" },
];

export default function BoxShadowGenerator() {
  const [layers, setLayers] = useState(() => [
    makeLayer({ x: 0, y: 10, blur: 20, spread: 0, color: "#000000", opacity: 20 }),
  ]);
  const [activeId, setActiveId] = useState(() => layers[0].id);
  const [boxColor, setBoxColor] = useState("#3b82f6");
  const [bgColor, setBgColor] = useState("#f3f4f6");
  const [radius, setRadius] = useState(12);
  const [copied, setCopied] = useState(false);

  const active =
    layers.find((l) => l.id === activeId) || layers[0] || null;

  const cssValue = useMemo(
    () => (layers.length ? layers.map(layerToCss).join(",\n            ") : "none"),
    [layers]
  );

  const previewShadow = useMemo(
    () => (layers.length ? layers.map(layerToCss).join(", ") : "none"),
    [layers]
  );

  const cssBlock = `box-shadow: ${cssValue};`;

  function updateActive(patch) {
    if (!active) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === active.id ? { ...l, ...patch } : l))
    );
  }

  function addLayer() {
    const nl = makeLayer({
      x: 0,
      y: 4,
      blur: 12,
      spread: -2,
      color: "#000000",
      opacity: 15,
    });
    setLayers((prev) => [...prev, nl]);
    setActiveId(nl.id);
  }

  function removeLayer(id) {
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (id === activeId && next.length) setActiveId(next[0].id);
      return next;
    });
  }

  async function copyCss() {
    try {
      await copyText(cssBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard unavailable (permissions / insecure context); ignore.
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bsg-boxcolor">
              Box color
            </label>
            <input
              id="bsg-boxcolor"
              className="tool-input"
              type="color"
              value={boxColor}
              onChange={(e) => setBoxColor(e.target.value)}
              style={{ height: 44, padding: 4, cursor: "pointer" }}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bsg-bgcolor">
              Preview background
            </label>
            <input
              id="bsg-bgcolor"
              className="tool-input"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ height: 44, padding: 4, cursor: "pointer" }}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bsg-radius">
              Corner radius ({radius}px)
            </label>
            <input
              id="bsg-radius"
              className="tool-input"
              type="range"
              min={0}
              max={80}
              value={radius}
              onChange={(e) => setRadius(clampNum(e.target.value, 0, 80))}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div
        aria-label="Box shadow preview"
        style={{
          marginTop: 4,
          minHeight: 220,
          borderRadius: 12,
          border: "1px solid rgba(128,128,128,0.35)",
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            background: boxColor,
            borderRadius: radius,
            boxShadow: previewShadow,
          }}
        />
      </div>

      {/* Layer selector */}
      <div className="tool-actions" style={{ flexWrap: "wrap" }}>
        {layers.map((l, i) => (
          <button
            key={l.id}
            type="button"
            className={l.id === activeId ? "btn btn-primary" : "btn"}
            onClick={() => setActiveId(l.id)}
          >
            Layer {i + 1}
          </button>
        ))}
        <button type="button" className="btn btn-success" onClick={addLayer}>
          + Add shadow
        </button>
        {layers.length > 1 && active && (
          <button
            type="button"
            className="btn"
            onClick={() => removeLayer(active.id)}
          >
            Remove Layer
          </button>
        )}
      </div>

      {active ? (
        <div className="tool-fields">
          <div className="tool-row">
            {CONTROLS.map((c) => (
              <div className="tool-field" key={c.key}>
                <label className="tool-label" htmlFor={`bsg-${c.key}`}>
                  {c.label} ({active[c.key]}
                  {c.unit})
                </label>
                <input
                  id={`bsg-${c.key}`}
                  className="tool-input"
                  type="range"
                  min={c.min}
                  max={c.max}
                  value={active[c.key]}
                  onChange={(e) =>
                    updateActive({ [c.key]: clampNum(e.target.value, c.min, c.max) })
                  }
                />
              </div>
            ))}
          </div>

          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="bsg-color">
                Shadow color
              </label>
              <input
                id="bsg-color"
                className="tool-input"
                type="color"
                value={active.color}
                onChange={(e) => updateActive({ color: e.target.value })}
                style={{ height: 44, padding: 4, cursor: "pointer" }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bsg-opacity">
                Opacity ({active.opacity}%)
              </label>
              <input
                id="bsg-opacity"
                className="tool-input"
                type="range"
                min={0}
                max={100}
                value={active.opacity}
                onChange={(e) =>
                  updateActive({ opacity: clampNum(e.target.value, 0, 100) })
                }
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bsg-inset">
                Type
              </label>
              <select
                id="bsg-inset"
                className="tool-select"
                value={active.inset ? "inset" : "outset"}
                onChange={(e) =>
                  updateActive({ inset: e.target.value === "inset" })
                }
              >
                <option value="outset">Outset (default)</option>
                <option value="inset">Inset</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <p className="tool-note">
          No shadow layers. Click &quot;+ Add shadow&quot; to start building a
          box-shadow.
        </p>
      )}

      <div className="tool-result" role="status" aria-live="polite">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="tool-result-label">CSS</div>
          <button type="button" className="btn btn-primary" onClick={copyCss}>
            {copied ? "Copied!" : "Copy CSS"}
          </button>
        </div>
        <pre className="tool-output">{cssBlock}</pre>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{layers.length}</div>
          <div className="tool-stat-label">
            {layers.length === 1 ? "Layer" : "Layers"}
          </div>
        </div>
        {active && (
          <>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {active.x}/{active.y}
              </div>
              <div className="tool-stat-label">X / Y px</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{active.blur}px</div>
              <div className="tool-stat-label">Blur</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{active.spread}px</div>
              <div className="tool-stat-label">Spread</div>
            </div>
          </>
        )}
      </div>

      <p className="tool-note">
        Stack multiple shadow layers for realistic depth, then copy the
        <code> box-shadow </code> rule straight into your stylesheet. Inset
        shadows draw inside the box; negative spread shrinks the shadow. Nothing
        is uploaded &mdash; the preview and CSS are generated entirely in your
        browser.
      </p>
    </div>
  );
}
