"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";

// Clamp any value into a 0-255 integer channel.
function clampByte(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
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

// Relative luminance (WCAG) used to pick a readable label color on a swatch.
function relativeLuminance({ r, g, b }) {
  const lin = [r, g, b].map((v) => {
    const c = clampByte(v) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function readableText(rgb) {
  return relativeLuminance(rgb) > 0.5 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
}

export default function ImageColorPicker() {
  const [fileName, setFileName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState(null); // { w, h }
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null); // { rgb, x, y }  live under cursor
  const [picked, setPicked] = useState(null); // { r,g,b } locked color
  const [history, setHistory] = useState([]); // array of {r,g,b}
  const [copied, setCopied] = useState("");

  const dataCanvasRef = useRef(null); // offscreen, natural resolution
  const dataCtxRef = useRef(null);
  const imgElRef = useRef(null); // displayed <img>
  const objectUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF, BMP, etc.).");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      // Build an offscreen canvas at natural resolution for accurate reads.
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setError("Your browser could not create a canvas to read pixels.");
        return;
      }
      ctx.drawImage(img, 0, 0);
      dataCanvasRef.current = canvas;
      dataCtxRef.current = ctx;

      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setFileName(file.name || "image");
      setLoaded(true);
      setHover(null);
      setPicked(null);
      setHistory([]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      objectUrlRef.current = "";
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;
  }

  // Read the pixel color under a mouse/touch event on the displayed image.
  function colorAtEvent(e) {
    const ctx = dataCtxRef.current;
    const imgEl = imgElRef.current;
    if (!ctx || !imgEl || !natural) return null;
    const rect = imgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const point = e.touches && e.touches[0] ? e.touches[0] : e;
    const relX = (point.clientX - rect.left) / rect.width;
    const relY = (point.clientY - rect.top) / rect.height;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;

    const px = Math.min(natural.w - 1, Math.max(0, Math.floor(relX * natural.w)));
    const py = Math.min(natural.h - 1, Math.max(0, Math.floor(relY * natural.h)));
    try {
      const d = ctx.getImageData(px, py, 1, 1).data;
      return { rgb: { r: d[0], g: d[1], b: d[2] }, x: px, y: py };
    } catch {
      return null;
    }
  }

  function onMove(e) {
    const c = colorAtEvent(e);
    if (c) setHover(c);
  }

  function onLeave() {
    setHover(null);
  }

  function onPick(e) {
    const c = colorAtEvent(e);
    if (!c) return;
    setPicked(c.rgb);
    setHistory((prev) => {
      const hex = rgbToHex(c.rgb);
      const next = [c.rgb, ...prev.filter((p) => rgbToHex(p) !== hex)];
      return next.slice(0, 12);
    });
  }

  async function copy(text, key) {
    try {
      await copyText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  const active = picked || (hover && hover.rgb) || null;
  const hex = active ? rgbToHex(active) : "";
  const hsl = active ? rgbToHsl(active) : null;
  const rgbString = active ? `rgb(${active.r}, ${active.g}, ${active.b})` : "";
  const hslString = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : "";

  const results = active
    ? [
        { key: "hex", label: "HEX", value: hex },
        { key: "rgb", label: "RGB", value: rgbString },
        { key: "hsl", label: "HSL", value: hslString },
      ]
    : [];

  const magnifierBg = hover ? rgbToHex(hover.rgb) : "transparent";

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="icp-file">
          Choose an image
        </label>
        <input
          id="icp-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Your image never leaves your device — it is read straight from your browser, with no
          upload.
        </p>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {!loaded && !error && (
        <p className="tool-note">
          Upload an image, then move your cursor over it to preview colors and click (or tap) any
          spot to lock in its exact HEX, RGB, and HSL values.
        </p>
      )}

      {loaded && (
        <>
          <div
            style={{
              position: "relative",
              display: "inline-block",
              maxWidth: "100%",
              margin: "0.5rem 0 1rem",
              lineHeight: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgElRef}
              src={objectUrlRef.current}
              alt="Uploaded image — move over it or click to pick a color"
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              onClick={onPick}
              onTouchStart={onPick}
              onTouchMove={(e) => {
                onMove(e);
              }}
              style={{
                maxWidth: "100%",
                maxHeight: 380,
                borderRadius: 8,
                display: "block",
                cursor: "crosshair",
                touchAction: "none",
              }}
            />
            {hover && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 74,
                  height: 74,
                  borderRadius: 10,
                  border: "2px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.4)",
                  background: magnifierBg,
                  color: readableText(hover.rgb),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  pointerEvents: "none",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                }}
              >
                {rgbToHex(hover.rgb)}
              </div>
            )}
          </div>

          <p className="tool-note">
            {picked
              ? "Locked to your clicked color. Move over the image and click again to pick a different pixel."
              : "Move over the image to preview, then click or tap a pixel to lock its color."}
          </p>
        </>
      )}

      {active && (
        <>
          <div
            aria-label="Selected color preview"
            style={{
              marginTop: 4,
              minHeight: 96,
              borderRadius: 12,
              border: "1px solid rgba(128,128,128,0.35)",
              background: hex,
              color: readableText(active),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          >
            {hex}
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
                <button type="button" className="btn" onClick={() => copy(row.value, row.key)}>
                  {copied === row.key ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}

          {hsl && (
            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">{active.r}</div>
                <div className="tool-stat-label">Red</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{active.g}</div>
                <div className="tool-stat-label">Green</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{active.b}</div>
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
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="tool-field">
          <div className="tool-result-label">Picked colors</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {history.map((c, i) => {
              const h = rgbToHex(c);
              return (
                <button
                  key={`${h}-${i}`}
                  type="button"
                  title={`${h} — click to copy`}
                  onClick={() => {
                    setPicked(c);
                    copy(h, `hist-${i}`);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    border: "1px solid rgba(128,128,128,0.4)",
                    background: h,
                    color: readableText(c),
                    cursor: "pointer",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: 2,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  }}
                >
                  {copied === `hist-${i}` ? "✓" : ""}
                </button>
              );
            })}
          </div>
          <p className="tool-note">
            Your last {history.length} picked color{history.length === 1 ? "" : "s"}. Click a swatch
            to re-select it and copy its hex.
          </p>
        </div>
      )}

      {loaded && (
        <div className="tool-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPicked(null);
              setHover(null);
            }}
            disabled={!picked}
          >
            Clear selection
          </button>
          {history.length > 0 && (
            <button type="button" className="btn" onClick={() => setHistory([])}>
              Clear history
            </button>
          )}
        </div>
      )}

      {natural && (
        <p className="tool-note">
          Image: {natural.w} × {natural.h}px{fileName ? ` — ${fileName}` : ""}. Colors are read at
          full resolution, so the value you get is the exact pixel you clicked.
        </p>
      )}
    </div>
  );
}
