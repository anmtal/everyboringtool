"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { copyText } from "../../lib/copyText";

const PRESETS = [
  { label: "Custom", w: 0, h: 0 },
  { label: "Square 600×600", w: 600, h: 600 },
  { label: "Square 1080×1080 (IG post)", w: 1080, h: 1080 },
  { label: "Landscape 1200×630 (OG / social)", w: 1200, h: 630 },
  { label: "Landscape 1280×720 (720p)", w: 1280, h: 720 },
  { label: "Landscape 1920×1080 (1080p)", w: 1920, h: 1080 },
  { label: "Portrait 1080×1350 (IG portrait)", w: 1080, h: 1350 },
  { label: "Portrait 1080×1920 (story / reel)", w: 1080, h: 1920 },
  { label: "Banner 728×90 (leaderboard)", w: 728, h: 90 },
  { label: "Banner 300×250 (medium rectangle)", w: 300, h: 250 },
  { label: "Banner 970×250 (billboard)", w: 970, h: 250 },
  { label: "Avatar 150×150", w: 150, h: 150 },
  { label: "Thumbnail 320×240", w: 320, h: 240 },
];

const PALETTES = [
  { label: "Gray", bg: "#cccccc", fg: "#333333" },
  { label: "Light gray", bg: "#eeeeee", fg: "#888888" },
  { label: "Dark", bg: "#222222", fg: "#dddddd" },
  { label: "Slate", bg: "#334155", fg: "#e2e8f0" },
  { label: "Indigo", bg: "#4f46e5", fg: "#ffffff" },
  { label: "Teal", bg: "#0f766e", fg: "#ffffff" },
  { label: "Amber", bg: "#f59e0b", fg: "#1f2937" },
  { label: "Rose", bg: "#e11d48", fg: "#ffffff" },
];

const clampInt = (v, min, max) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const escapeXml = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));

export default function PlaceholderImageGenerator() {
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(400);
  const [bg, setBg] = useState("#cccccc");
  const [fg, setFg] = useState("#333333");
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(0); // 0 = auto
  const [showGrid, setShowGrid] = useState(false);
  const [format, setFormat] = useState("png"); // png | jpeg | webp | svg
  const [copied, setCopied] = useState("");

  const canvasRef = useRef(null);

  // The label drawn on the image: user text, or the dimensions.
  const label = useMemo(() => {
    const t = text.trim();
    return t || `${width} × ${height}`;
  }, [text, width, height]);

  const autoFont = useMemo(() => {
    // Scale font to fit the shorter axis and the label length.
    const base = Math.max(10, Math.min(width, height) * 0.22);
    const byLen = (width * 0.9) / Math.max(1, label.length * 0.55);
    return Math.max(10, Math.round(Math.min(base, byLen)));
  }, [width, height, label]);

  const effFont = fontSize > 0 ? fontSize : autoFont;

  const drawCanvas = useCallback(
    (canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      // Background.
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      // Optional diagonal cross + border grid (classic placeholder look).
      if (showGrid) {
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = Math.max(1, Math.min(width, height) * 0.004);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.strokeRect(0, 0, width, height);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Label.
      ctx.fillStyle = fg;
      ctx.font = `bold ${effFont}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, width / 2, height / 2);
    },
    [width, height, bg, fg, showGrid, effFont, label]
  );

  // Keep the live preview in sync.
  useEffect(() => {
    drawCanvas(canvasRef.current);
  }, [drawCanvas]);

  const svgString = useMemo(() => {
    const stroke = showGrid
      ? `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${fg}" stroke-opacity="0.25" stroke-width="${Math.max(
          1,
          Math.min(width, height) * 0.004
        )}"/><line x1="${width}" y1="0" x2="0" y2="${height}" stroke="${fg}" stroke-opacity="0.25" stroke-width="${Math.max(
          1,
          Math.min(width, height) * 0.004
        )}"/><rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${fg}" stroke-opacity="0.25" stroke-width="${Math.max(
          1,
          Math.min(width, height) * 0.004
        )}"/>`
      : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="${width}" height="${height}" fill="${bg}"/>` +
      stroke +
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-weight="bold" font-size="${effFont}">${escapeXml(
        label
      )}</text></svg>`;
  }, [width, height, bg, fg, showGrid, effFont, label]);

  const download = useCallback(() => {
    const fname = `placeholder-${width}x${height}.${format === "jpeg" ? "jpg" : format}`;
    if (format === "svg") {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);
      },
      mime,
      format === "png" ? undefined : 0.92
    );
  }, [format, svgString, width, height]);

  const copyDataUri = useCallback(async () => {
    let uri;
    if (format === "svg") {
      uri = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      uri = canvas.toDataURL(mime, format === "png" ? undefined : 0.92);
    }
    try {
      await copyText(uri);
      setCopied("uri");
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }, [format, svgString]);

  const copyImgTag = useCallback(async () => {
    const alt = escapeXml(label);
    const tag = `<img src="placeholder-${width}x${height}.${
      format === "jpeg" ? "jpg" : format
    }" width="${width}" height="${height}" alt="${alt}" />`;
    try {
      await copyText(tag);
      setCopied("tag");
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }, [width, height, format, label]);

  const applyPreset = (i) => {
    const p = PRESETS[Number(i)];
    if (!p || !p.w) return;
    setWidth(p.w);
    setHeight(p.h);
  };

  const applyPalette = (i) => {
    const p = PALETTES[Number(i)];
    if (!p) return;
    setBg(p.bg);
    setFg(p.fg);
  };

  const swap = () => {
    setWidth(height);
    setHeight(width);
  };

  const previewMax = 460;
  const scale = Math.min(1, previewMax / Math.max(width, height));

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-preset">Size preset</label>
            <select id="ph-preset" className="tool-select" defaultValue="0" onChange={(e) => applyPreset(e.target.value)}>
              {PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-palette">Color preset</label>
            <select id="ph-palette" className="tool-select" defaultValue="" onChange={(e) => applyPalette(e.target.value)}>
              <option value="" disabled>Choose colors…</option>
              {PALETTES.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-width">Width (px)</label>
            <input id="ph-width" className="tool-input" type="number" min="1" max="6000" value={width}
              onChange={(e) => setWidth(clampInt(e.target.value, 1, 6000))} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-height">Height (px)</label>
            <input id="ph-height" className="tool-input" type="number" min="1" max="6000" value={height}
              onChange={(e) => setHeight(clampInt(e.target.value, 1, 6000))} />
          </div>
          <div className="tool-field" style={{ flex: "0 0 auto", justifyContent: "flex-end" }}>
            <label className="tool-label" htmlFor="ph-swap">&nbsp;</label>
            <button id="ph-swap" type="button" className="btn" onClick={swap}>⇄ Swap</button>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="ph-text">Label text (blank = show dimensions)</label>
          <input id="ph-text" className="tool-input" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={`${width} × ${height}`} spellCheck="false" />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-bg">Background color</label>
            <input id="ph-bg" className="tool-input" type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-fg">Text color</label>
            <input id="ph-fg" className="tool-input" type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-font">Font size (0 = auto)</label>
            <input id="ph-font" className="tool-input" type="number" min="0" max="600" value={fontSize}
              onChange={(e) => setFontSize(clampInt(e.target.value, 0, 600))} />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ph-format">Download format</label>
            <select id="ph-format" className="tool-select" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="png">PNG (lossless)</option>
              <option value="jpeg">JPG (smaller, no transparency)</option>
              <option value="webp">WebP (modern, small)</option>
              <option value="svg">SVG (vector, scales infinitely)</option>
            </select>
          </div>
          <div className="tool-field" style={{ justifyContent: "flex-end" }}>
            <label className="tool-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", margin: 0 }}>
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              Add diagonal cross & border
            </label>
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Preview — {width} × {height}px</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <canvas
            ref={canvasRef}
            aria-label={`Placeholder image, ${width} by ${height} pixels, labelled ${label}`}
            style={{
              width: Math.round(width * scale),
              height: Math.round(height * scale),
              maxWidth: "100%",
              borderRadius: 8,
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-success" onClick={download}>
          ↓ Download {format === "jpeg" ? "JPG" : format.toUpperCase()}
        </button>
        <button type="button" className="btn" onClick={copyDataUri}>
          {copied === "uri" ? "Copied!" : "Copy data URI"}
        </button>
        <button type="button" className="btn" onClick={copyImgTag}>
          {copied === "tag" ? "Copied!" : "Copy <img> tag"}
        </button>
      </div>

      <p className="tool-note">
        Everything is drawn in your browser with the Canvas API — no image is uploaded and nothing leaves your device.
        Pick a size (or a preset), set colors and a label, then download a PNG, JPG, WebP, or scalable SVG. The
        “Copy data URI” button gives you an inline <code>data:</code> string you can paste straight into HTML or CSS —
        handy for mockups, email templates, and wireframes with no external server.
      </p>
    </div>
  );
}
