"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// HCIRN color-blindness simulation matrices, applied directly in sRGB space.
// Each is a 3x3 matrix mapping [r,g,b] -> simulated [r,g,b]. These are the
// widely-used values from the Color Blind Simulation function (Wickline / HCIRN)
// and are the same matrices behind most online CVD simulators.
const MATRICES = {
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0, 0.242, 0.758],
  ],
  protanomaly: [
    [0.817, 0.183, 0.0],
    [0.333, 0.667, 0.0],
    [0.0, 0.125, 0.875],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  deuteranomaly: [
    [0.8, 0.2, 0.0],
    [0.258, 0.742, 0.0],
    [0.0, 0.142, 0.858],
  ],
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.433, 0.567],
    [0.0, 0.475, 0.525],
  ],
  tritanomaly: [
    [0.967, 0.033, 0.0],
    [0.0, 0.733, 0.267],
    [0.0, 0.183, 0.817],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
  achromatomaly: [
    [0.618, 0.32, 0.062],
    [0.163, 0.775, 0.062],
    [0.163, 0.32, 0.516],
  ],
};

const TYPES = [
  { value: "protanopia", label: "Protanopia — no red (1% of men)" },
  { value: "protanomaly", label: "Protanomaly — weak red (1% of men)" },
  { value: "deuteranopia", label: "Deuteranopia — no green (1% of men)" },
  {
    value: "deuteranomaly",
    label: "Deuteranomaly — weak green (most common, ~5% of men)",
  },
  { value: "tritanopia", label: "Tritanopia — no blue (very rare)" },
  { value: "tritanomaly", label: "Tritanomaly — weak blue (rare)" },
  {
    value: "achromatopsia",
    label: "Achromatopsia — total color blindness (very rare)",
  },
  {
    value: "achromatomaly",
    label: "Achromatomaly — partial color blindness (rare)",
  },
];

function clampByte(n) {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

// Apply a CVD matrix in place to an ImageData's pixel buffer.
function simulate(data, m) {
  const [r0, r1, r2] = m[0];
  const [g0, g1, g2] = m[1];
  const [b0, b1, b2] = m[2];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    data[i] = clampByte(r * r0 + g * r1 + b * r2);
    data[i + 1] = clampByte(r * g0 + g * g1 + b * g2);
    data[i + 2] = clampByte(r * b0 + g * b1 + b * b2);
    // alpha (i + 3) is left untouched
  }
}

// Draw a built-in test pattern so the tool shows a real result on first load.
// A hue spectrum plus a row of frequently-confused swatches (reds/greens/browns).
function drawTestPattern(canvas) {
  const W = 640;
  const H = 320;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Smooth hue spectrum across the top two-thirds.
  const specH = Math.round(H * 0.62);
  for (let x = 0; x < W; x++) {
    const hue = (x / W) * 360;
    ctx.fillStyle = `hsl(${hue}, 85%, 50%)`;
    ctx.fillRect(x, 0, 1, specH);
  }

  // Row of solid swatches that people with CVD commonly confuse.
  const swatches = [
    "#e02020", // red
    "#2fa02f", // green
    "#e07b1a", // orange
    "#8a5a2b", // brown
    "#d8c400", // yellow
    "#1f6fe0", // blue
    "#7a3ec8", // purple
    "#e85fae", // pink
  ];
  const sw = W / swatches.length;
  for (let i = 0; i < swatches.length; i++) {
    ctx.fillStyle = swatches[i];
    ctx.fillRect(Math.round(i * sw), specH, Math.ceil(sw), H - specH);
  }
}

export default function ColorBlindnessSimulator() {
  const [type, setType] = useState("deuteranomaly");
  const [fileName, setFileName] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [usingSample, setUsingSample] = useState(true);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const originalCanvasRef = useRef(null); // full-res original
  const simCanvasRef = useRef(null); // full-res simulated
  const downloadUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    };
  }, []);

  // Render the simulated canvas from the (already drawn) original canvas.
  const renderSimulation = useCallback((cvdType) => {
    const src = originalCanvasRef.current;
    const dst = simCanvasRef.current;
    if (!src || !dst || !src.width || !src.height) return;

    dst.width = src.width;
    dst.height = src.height;
    const sctx = src.getContext("2d");
    const dctx = dst.getContext("2d");

    let image;
    try {
      image = sctx.getImageData(0, 0, src.width, src.height);
    } catch {
      // getImageData can throw on tainted canvases; our sources are same-origin
      // (uploaded files / generated), so this should not happen in practice.
      setError("Could not read image pixels in this browser.");
      return;
    }

    const m = MATRICES[cvdType] || MATRICES.deuteranomaly;
    simulate(image.data, m);
    dctx.putImageData(image, 0, 0);

    // Refresh the downloadable PNG.
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = "";
    }
    dst.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      downloadUrlRef.current = url;
      setDownloadUrl(url);
    }, "image/png");
  }, []);

  // Load the built-in sample on first mount.
  useEffect(() => {
    const src = originalCanvasRef.current;
    if (!src) return;
    drawTestPattern(src);
    setHasImage(true);
    setUsingSample(true);
    renderSimulation(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-simulate whenever the CVD type changes.
  useEffect(() => {
    if (hasImage) renderSimulation(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF, etc.).");
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const src = originalCanvasRef.current;
      if (!src) return;
      // Cap very large images so simulation stays fast, keeping aspect ratio.
      const MAX = 1600;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const scale = Math.min(MAX / w, MAX / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      src.width = w;
      src.height = h;
      const ctx = src.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      setFileName(file.name || "image");
      setUsingSample(false);
      setHasImage(true);
      renderSimulation(type);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError(
        "Couldn't read that image — it may be corrupted or an unsupported format."
      );
    };
    img.src = url;
    e.target.value = "";
  }

  function loadSample() {
    const src = originalCanvasRef.current;
    if (!src) return;
    setError("");
    drawTestPattern(src);
    setFileName("");
    setUsingSample(true);
    setHasImage(true);
    renderSimulation(type);
  }

  const currentLabel =
    TYPES.find((t) => t.value === type)?.label || type;

  const downloadName = (() => {
    const base = (fileName || "sample").replace(/\.[^.]+$/, "") || "image";
    return `${base}-${type}.png`;
  })();

  const canvasStyle = {
    maxWidth: "100%",
    height: "auto",
    borderRadius: 8,
    border: "1px solid rgba(128,128,128,0.35)",
    display: "block",
    background:
      "repeating-conic-gradient(rgba(128,128,128,0.12) 0% 25%, transparent 0% 50%) 50% / 20px 20px",
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="cbs-file">
            Upload an image
          </label>
          <input
            id="cbs-file"
            className="tool-input"
            type="file"
            accept="image/*"
            onChange={onFile}
          />
          <p className="tool-note">
            Your image stays on your device — nothing is uploaded. A built-in
            test pattern is loaded so you can try it right away.
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="cbs-type">
            Color vision deficiency to simulate
          </label>
          <select
            id="cbs-type"
            className="tool-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      <div
        role="status"
        aria-live="polite"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        <div>
          <div className="tool-result-label">Original</div>
          <canvas
            ref={originalCanvasRef}
            style={canvasStyle}
            aria-label="Original image"
          />
        </div>
        <div>
          <div className="tool-result-label">
            Simulated: {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
          <canvas
            ref={simCanvasRef}
            style={canvasStyle}
            aria-label={`Image simulated as ${type}`}
          />
        </div>
      </div>

      <div className="tool-actions">
        {downloadUrl && (
          <a className="btn btn-success" href={downloadUrl} download={downloadName}>
            ↓ Download simulated PNG
          </a>
        )}
        {!usingSample && (
          <button type="button" className="btn" onClick={loadSample}>
            Use sample image
          </button>
        )}
      </div>

      <p className="tool-note">
        Showing how your image looks with <strong>{currentLabel}</strong>. This
        is an approximation using standard color-transform matrices — useful for
        checking whether charts, UI states, and designs stay readable, but not a
        medical or diagnostic tool. Deuteranomaly (weak green) is by far the most
        common form, affecting roughly 1 in 12 men and 1 in 200 women.
      </p>
    </div>
  );
}
