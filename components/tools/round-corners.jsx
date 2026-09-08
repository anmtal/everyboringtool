"use client";

import { useState, useEffect, useRef, useMemo } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Parse an input string to a finite non-negative number, or fall back.
function toNum(raw, fallback) {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Draw a rounded rectangle path with independent corner radii.
function roundedRectPath(ctx, x, y, w, h, r) {
  const max = Math.min(w, h) / 2;
  const tl = Math.min(r.tl, max);
  const tr = Math.min(r.tr, max);
  const br = Math.min(r.br, max);
  const bl = Math.min(r.bl, max);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

export default function RoundImageCorners() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);

  const [unit, setUnit] = useState("percent"); // "percent" | "px"
  const [radius, setRadius] = useState("25"); // value in chosen unit (uniform)
  const [linked, setLinked] = useState(true);
  const [corners, setCorners] = useState({ tl: "25", tr: "25", br: "25", bl: "25" });

  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const previewCanvasRef = useRef(null);
  const previewUrlRef = useRef("");
  const outUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    };
  }, []);

  function resetOutput() {
    if (outUrlRef.current) {
      URL.revokeObjectURL(outUrlRef.current);
      outUrlRef.current = "";
    }
    setOutUrl("");
    setOutSize(0);
  }

  // Convert the chosen unit + value into pixel radii (relative to natural size).
  const radiiPx = useMemo(() => {
    if (!natural) return null;
    const shorter = Math.min(natural.w, natural.h);
    const conv = (v) => {
      const n = toNum(v, 0);
      if (unit === "percent") return (n / 100) * (shorter / 2);
      return n;
    };
    if (linked) {
      const r = conv(radius);
      return { tl: r, tr: r, br: r, bl: r };
    }
    return {
      tl: conv(corners.tl),
      tr: conv(corners.tr),
      br: conv(corners.br),
      bl: conv(corners.bl),
    };
  }, [natural, unit, radius, linked, corners]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    resetOutput();

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF, etc.).");
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setOrigSize(file.size);
      setFileName(file.name || "image");
      setPreviewUrl(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = "";
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;

    e.target.value = "";
  }

  // Render a live preview onto the canvas whenever the image or radii change.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imgRef.current || !natural || !radiiPx) return;
    canvas.width = natural.w;
    canvas.height = natural.h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, natural.w, natural.h);
    ctx.save();
    roundedRectPath(ctx, 0, 0, natural.w, natural.h, radiiPx);
    ctx.clip();
    ctx.drawImage(imgRef.current, 0, 0, natural.w, natural.h);
    ctx.restore();
    resetOutput();
  }, [natural, radiiPx]);

  function onRadiusChange(e) {
    const v = e.target.value;
    setRadius(v);
    if (linked) setCorners({ tl: v, tr: v, br: v, bl: v });
  }

  function onCornerChange(key) {
    return (e) => setCorners((c) => ({ ...c, [key]: e.target.value }));
  }

  function onUnitChange(e) {
    const next = e.target.value;
    // Keep a sensible default when switching units.
    if (next === "percent") {
      setRadius("25");
      setCorners({ tl: "25", tr: "25", br: "25", bl: "25" });
    } else {
      setRadius("40");
      setCorners({ tl: "40", tr: "40", br: "40", bl: "40" });
    }
    setUnit(next);
  }

  function exportPng() {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imgRef.current || !natural) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            setError("Export failed — try a smaller image.");
            return;
          }
          if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
          const url = URL.createObjectURL(blob);
          outUrlRef.current = url;
          setOutUrl(url);
          setOutSize(blob.size);
          setBusy(false);
        },
        "image/png"
      );
    } catch {
      setBusy(false);
      setError("Something went wrong while rounding corners. Try a different image.");
    }
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "image";
    return `${base}-rounded.png`;
  })();

  const maxRadiusPx = natural ? Math.round(Math.min(natural.w, natural.h) / 2) : 0;

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="rc-file">
          Choose an image
        </label>
        <input
          id="rc-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Rounds the corners and exports a PNG with transparency around them. Everything runs
          in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {!natural && !error && (
        <p className="tool-note">
          Upload an image to round its corners. You can set one radius for all corners or
          control each corner independently, in pixels or as a percentage.
        </p>
      )}

      {previewUrl && natural && (
        <div
          style={{
            display: "inline-block",
            maxWidth: "100%",
            margin: "0.5rem 0 1rem",
            lineHeight: 0,
            backgroundImage:
              "linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            borderRadius: 8,
          }}
        >
          <canvas
            ref={previewCanvasRef}
            aria-label="Live preview of the image with rounded corners"
            style={{ maxWidth: "100%", maxHeight: 320, display: "block", width: "auto" }}
          />
        </div>
      )}

      {natural && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="rc-unit">
                  Radius unit
                </label>
                <select
                  id="rc-unit"
                  className="tool-select"
                  value={unit}
                  onChange={onUnitChange}
                >
                  <option value="percent">Percent of shorter side</option>
                  <option value="px">Pixels</option>
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="rc-mode">
                  Corners
                </label>
                <select
                  id="rc-mode"
                  className="tool-select"
                  value={linked ? "all" : "each"}
                  onChange={(e) => {
                    const next = e.target.value === "all";
                    setLinked(next);
                    if (next) setCorners({ tl: radius, tr: radius, br: radius, bl: radius });
                  }}
                >
                  <option value="all">Same radius for all four</option>
                  <option value="each">Control each corner</option>
                </select>
              </div>
            </div>

            {linked ? (
              <div className="tool-field">
                <label className="tool-label" htmlFor="rc-radius">
                  Corner radius ({unit === "percent" ? "%" : "px"})
                </label>
                <input
                  id="rc-radius"
                  className="tool-input"
                  type="number"
                  min="0"
                  max={unit === "percent" ? 100 : maxRadiusPx}
                  step={unit === "percent" ? 1 : 1}
                  inputMode="decimal"
                  value={radius}
                  onChange={onRadiusChange}
                />
                <p className="tool-note">
                  {unit === "percent"
                    ? "100% makes a full circle/pill (fully rounded)."
                    : `Max useful radius for this image is about ${maxRadiusPx}px.`}
                </p>
              </div>
            ) : (
              <>
                <div className="tool-row">
                  <div className="tool-field">
                    <label className="tool-label" htmlFor="rc-tl">
                      Top-left ({unit === "percent" ? "%" : "px"})
                    </label>
                    <input
                      id="rc-tl"
                      className="tool-input"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={corners.tl}
                      onChange={onCornerChange("tl")}
                    />
                  </div>
                  <div className="tool-field">
                    <label className="tool-label" htmlFor="rc-tr">
                      Top-right ({unit === "percent" ? "%" : "px"})
                    </label>
                    <input
                      id="rc-tr"
                      className="tool-input"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={corners.tr}
                      onChange={onCornerChange("tr")}
                    />
                  </div>
                </div>
                <div className="tool-row">
                  <div className="tool-field">
                    <label className="tool-label" htmlFor="rc-bl">
                      Bottom-left ({unit === "percent" ? "%" : "px"})
                    </label>
                    <input
                      id="rc-bl"
                      className="tool-input"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={corners.bl}
                      onChange={onCornerChange("bl")}
                    />
                  </div>
                  <div className="tool-field">
                    <label className="tool-label" htmlFor="rc-br">
                      Bottom-right ({unit === "percent" ? "%" : "px"})
                    </label>
                    <input
                      id="rc-br"
                      className="tool-input"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={corners.br}
                      onChange={onCornerChange("br")}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural.w} × {natural.h}
              </div>
              <div className="tool-stat-label">Image size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {radiiPx
                  ? `${Math.round(radiiPx.tl)} / ${Math.round(radiiPx.tr)} / ${Math.round(
                      radiiPx.br
                    )} / ${Math.round(radiiPx.bl)}`
                  : "—"}
              </div>
              <div className="tool-stat-label">Radius px (TL/TR/BR/BL)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Rounded PNG</div>
            </div>
          </div>

          <p className="tool-note">
            The corners are cut out transparently, so save as PNG to keep the see-through
            edges. Saving as JPG would fill them with a solid color instead.
          </p>
        </>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {natural && (
        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportPng}
            disabled={busy}
          >
            {busy ? "Rounding…" : "Round Corners & Download PNG"}
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Download PNG
            </a>
          )}
        </div>
      )}
    </div>
  );
}
