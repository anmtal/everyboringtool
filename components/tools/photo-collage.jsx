"use client";

import { useState, useEffect, useRef, useMemo } from "react";

// Aspect-ratio presets for each collage cell (width / height).
const CELL_RATIOS = {
  square: { label: "Square (1:1)", ratio: 1 },
  landscape: { label: "Landscape (4:3)", ratio: 4 / 3 },
  portrait: { label: "Portrait (3:4)", ratio: 3 / 4 },
  wide: { label: "Wide (16:9)", ratio: 16 / 9 },
};

// Draw a rounded rectangle path on a 2D context.
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Cover-fit: return source crop rect so the image fills the cell without distortion.
function coverRect(imgW, imgH, cellW, cellH) {
  const scale = Math.max(cellW / imgW, cellH / imgH);
  const drawW = cellW / scale;
  const drawH = cellH / scale;
  const sx = (imgW - drawW) / 2;
  const sy = (imgH - drawH) / 2;
  return { sx, sy, sw: drawW, sh: drawH };
}

// Build a small gradient placeholder image so the tool shows a working collage on first load.
function makePlaceholder(from, to, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return c.toDataURL("image/png");
}

let idCounter = 0;

export default function PhotoCollage() {
  const [images, setImages] = useState([]); // { id, name, el, w, h }
  const [columns, setColumns] = useState(2);
  const [cellShape, setCellShape] = useState("square");
  const [gap, setGap] = useState(12);
  const [padding, setPadding] = useState(16);
  const [radius, setRadius] = useState(12);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [outputWidth, setOutputWidth] = useState(1200);
  const [format, setFormat] = useState("image/png");
  const [error, setError] = useState("");
  const [seeded, setSeeded] = useState(false);

  const canvasRef = useRef(null);
  const objectUrlsRef = useRef([]);

  // Seed a few placeholder tiles once so first render is a real, downloadable collage.
  useEffect(() => {
    const seeds = [
      ["#60a5fa", "#2563eb"],
      ["#f472b6", "#db2777"],
      ["#34d399", "#059669"],
      ["#fbbf24", "#d97706"],
    ];
    let cancelled = false;
    let loaded = 0;
    const built = [];
    seeds.forEach(([a, b], i) => {
      const el = new Image();
      el.onload = () => {
        if (cancelled) return;
        built[i] = { id: `seed-${i}`, name: `example-${i + 1}.png`, el, w: el.naturalWidth, h: el.naturalHeight };
        loaded += 1;
        if (loaded === seeds.length) {
          setImages(built.filter(Boolean));
          setSeeded(true);
        }
      };
      el.src = makePlaceholder(a, b, 800, 800);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke any created object URLs on unmount.
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  function onFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");

    const pics = files.filter((f) => f.type.startsWith("image/"));
    if (!pics.length) {
      setError("Please choose image files (PNG, JPG, WebP, GIF, etc.).");
      e.target.value = "";
      return;
    }

    // First real upload replaces the example tiles.
    const replaceSeeds = seeded && images.length > 0 && images[0].id.startsWith("seed-");

    let pending = pics.length;
    const loadedItems = [];

    pics.forEach((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      const el = new Image();
      el.onload = () => {
        loadedItems.push({
          id: `img-${idCounter++}`,
          name: file.name || "photo",
          el,
          w: el.naturalWidth,
          h: el.naturalHeight,
        });
        pending -= 1;
        if (pending === 0) finish();
      };
      el.onerror = () => {
        pending -= 1;
        if (pending === 0) finish();
      };
      el.src = url;
    });

    function finish() {
      if (!loadedItems.length) {
        setError("None of those files could be read as images.");
        return;
      }
      setSeeded(false);
      setImages((prev) => (replaceSeeds ? loadedItems : [...prev, ...loadedItems]));
    }

    e.target.value = "";
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((im) => im.id !== id));
  }

  function move(id, dir) {
    setImages((prev) => {
      const idx = prev.findIndex((im) => im.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = prev.slice();
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  function clearAll() {
    setImages([]);
    setSeeded(false);
    setError("");
  }

  // Compute layout geometry from current settings.
  const layout = useMemo(() => {
    const n = images.length;
    if (!n) return null;
    const cols = Math.max(1, Math.min(columns, n === 1 ? 1 : columns));
    const rows = Math.ceil(n / cols);
    const ow = Math.max(200, Math.min(4000, Math.round(outputWidth) || 1200));
    const g = Math.max(0, Math.min(200, Math.round(gap) || 0));
    const pad = Math.max(0, Math.min(400, Math.round(padding) || 0));
    const rad = Math.max(0, Math.min(200, Math.round(radius) || 0));
    const cellW = (ow - pad * 2 - g * (cols - 1)) / cols;
    if (cellW <= 0) return null;
    const ratio = (CELL_RATIOS[cellShape] || CELL_RATIOS.square).ratio;
    const cellH = cellW / ratio;
    const oh = Math.round(pad * 2 + rows * cellH + g * (rows - 1));
    return { cols, rows, ow, oh: Math.max(1, oh), g, pad, rad, cellW, cellH };
  }, [images.length, columns, outputWidth, gap, padding, radius, cellShape]);

  // Render the collage to the preview canvas whenever inputs change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    canvas.width = layout.ow;
    canvas.height = layout.oh;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Background (also fills gaps and padding).
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, layout.ow, layout.oh);

    images.forEach((im, i) => {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);
      const x = layout.pad + col * (layout.cellW + layout.g);
      const y = layout.pad + row * (layout.cellH + layout.g);

      ctx.save();
      roundRectPath(ctx, x, y, layout.cellW, layout.cellH, layout.rad);
      ctx.clip();
      const { sx, sy, sw, sh } = coverRect(im.w, im.h, layout.cellW, layout.cellH);
      ctx.drawImage(im.el, sx, sy, sw, sh, x, y, layout.cellW, layout.cellH);
      ctx.restore();
    });
  }, [images, layout, bgColor]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !layout) {
      setError("Add at least one photo first.");
      return;
    }
    setError("");
    const isJpeg = format === "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Export failed — try a smaller output width.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `collage-${layout.ow}x${layout.oh}.${isJpeg ? "jpg" : "png"}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      format,
      isJpeg ? 0.92 : undefined
    );
  }

  const hasImages = images.length > 0;

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="pc-files">
          Add photos
        </label>
        <input
          id="pc-files"
          className="tool-input"
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
        />
        <p className="tool-note">
          Pick several images at once (or add more later). The tool starts with example tiles so
          you can see how it works — your first upload replaces them. Everything runs in your
          browser; no photo is ever uploaded to a server.
        </p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-cols">
              Columns
            </label>
            <select
              id="pc-cols"
              className="tool-select"
              value={columns}
              onChange={(e) => setColumns(parseInt(e.target.value, 10))}
            >
              {[1, 2, 3, 4, 5, 6].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-shape">
              Cell shape
            </label>
            <select
              id="pc-shape"
              className="tool-select"
              value={cellShape}
              onChange={(e) => setCellShape(e.target.value)}
            >
              {Object.entries(CELL_RATIOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-gap">
              Spacing between photos (px)
            </label>
            <input
              id="pc-gap"
              className="tool-input"
              type="number"
              min="0"
              max="200"
              inputMode="numeric"
              value={gap}
              onChange={(e) => setGap(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-pad">
              Outer border (px)
            </label>
            <input
              id="pc-pad"
              className="tool-input"
              type="number"
              min="0"
              max="400"
              inputMode="numeric"
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-radius">
              Corner rounding (px)
            </label>
            <input
              id="pc-radius"
              className="tool-input"
              type="number"
              min="0"
              max="200"
              inputMode="numeric"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-bg">
              Background color
            </label>
            <input
              id="pc-bg"
              className="tool-input"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-width">
              Output width (px)
            </label>
            <input
              id="pc-width"
              className="tool-input"
              type="number"
              min="200"
              max="4000"
              inputMode="numeric"
              value={outputWidth}
              onChange={(e) => setOutputWidth(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-format">
              Download format
            </label>
            <select
              id="pc-format"
              className="tool-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="image/png">PNG (lossless)</option>
              <option value="image/jpeg">JPG (smaller file)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {!hasImages && (
        <p className="tool-note">
          No photos yet — use “Add photos” above to build your collage.
        </p>
      )}

      {hasImages && layout && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">
            Live preview — {images.length} photo{images.length === 1 ? "" : "s"},{" "}
            {layout.cols} × {layout.rows} grid, {layout.ow} × {layout.oh}px
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              justifyContent: "center",
              background:
                "repeating-conic-gradient(rgba(128,128,128,0.12) 0% 25%, transparent 0% 50%) 50% / 20px 20px",
              borderRadius: 8,
              padding: 8,
              overflow: "auto",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ maxWidth: "100%", height: "auto", borderRadius: 4 }}
              aria-label="Collage preview"
            />
          </div>
        </div>
      )}

      {hasImages && (
        <div className="tool-fields" style={{ marginTop: "0.75rem" }}>
          <div className="tool-result-label">Photos (drag order with the arrows)</div>
          {images.map((im, i) => (
            <div
              key={im.id}
              className="tool-row"
              style={{ alignItems: "center", gap: "0.5rem" }}
            >
              <span className="tool-note" style={{ minWidth: 24 }}>
                {i + 1}.
              </span>
              <span
                className="tool-note"
                style={{
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={im.name}
              >
                {im.name} ({im.w}×{im.h})
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => move(im.id, -1)}
                disabled={i === 0}
                aria-label={`Move ${im.name} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => move(im.id, 1)}
                disabled={i === images.length - 1}
                aria-label={`Move ${im.name} later`}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => removeImage(im.id)}
                aria-label={`Remove ${im.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={download}
          disabled={!hasImages}
        >
          Download collage
        </button>
        <button type="button" className="btn" onClick={clearAll} disabled={!hasImages}>
          Clear all
        </button>
      </div>
    </div>
  );
}
