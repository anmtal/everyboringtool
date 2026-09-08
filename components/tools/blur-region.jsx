"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

function clamp(n, lo, hi) {
  return Math.min(Math.max(n, lo), hi);
}

// Normalise a raw drag (any corner order) into {x, y, w, h} in natural pixels,
// clamped to the image bounds. Returns null for a too-small drag.
function normalizeRect(a, b, nw, nh) {
  const x1 = clamp(Math.min(a.x, b.x), 0, nw);
  const y1 = clamp(Math.min(a.y, b.y), 0, nh);
  const x2 = clamp(Math.max(a.x, b.x), 0, nw);
  const y2 = clamp(Math.max(a.y, b.y), 0, nh);
  const w = Math.round(x2 - x1);
  const h = Math.round(y2 - y1);
  if (w < 3 || h < 3) return null;
  return { x: Math.round(x1), y: Math.round(y1), w, h };
}

export default function BlurRegion() {
  const [fileName, setFileName] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);

  const [regions, setRegions] = useState([]); // committed rects in natural px
  const [effect, setEffect] = useState("blur"); // "blur" | "pixelate"
  const [strength, setStrength] = useState(20);

  const [outSize, setOutSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const canvasRef = useRef(null); // visible canvas (natural sized, CSS scaled)
  const dragRef = useRef(null); // { start:{x,y}, cur:{x,y} } during a drag

  // Convert a pointer event to natural-image pixel coordinates.
  const eventToNatural = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !natural) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const sx = natural.w / rect.width;
    const sy = natural.h / rect.height;
    return { x: clamp(cx * sx, 0, natural.w), y: clamp(cy * sy, 0, natural.h) };
  }, [natural]);

  // Apply one region's blur/pixelate effect onto the given context.
  const applyEffect = useCallback((ctx, img, r) => {
    if (effect === "pixelate") {
      const block = Math.max(2, Math.round((strength / 100) * Math.min(r.w, r.h)) || 2);
      const smallW = Math.max(1, Math.round(r.w / block));
      const smallH = Math.max(1, Math.round(r.h / block));
      const tmp = document.createElement("canvas");
      tmp.width = smallW;
      tmp.height = smallH;
      const tctx = tmp.getContext("2d");
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, smallW, smallH);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, smallW, smallH, r.x, r.y, r.w, r.h);
      ctx.restore();
      return;
    }
    // Gaussian blur. Sample a padded source so the blur has neighbouring
    // pixels for a clean look, then clip the painted result to the region so
    // nothing outside the box is affected.
    const radius = Math.max(1, Math.round((strength / 100) * 60));
    const pad = Math.min(radius * 2, 200);
    const sx = clamp(r.x - pad, 0, natural.w);
    const sy = clamp(r.y - pad, 0, natural.h);
    const sw = clamp(r.x + r.w + pad, 0, natural.w) - sx;
    const sh = clamp(r.y + r.h + pad, 0, natural.h) - sy;
    const tmp = document.createElement("canvas");
    tmp.width = sw;
    tmp.height = sh;
    const tctx = tmp.getContext("2d");
    tctx.filter = `blur(${radius}px)`;
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.drawImage(tmp, sx, sy);
    ctx.restore();
  }, [effect, strength, natural]);

  // Render the image + all committed regions to a fresh natural-sized canvas.
  const renderResult = useCallback(() => {
    const img = imgRef.current;
    if (!img || !natural) return null;
    const canvas = document.createElement("canvas");
    canvas.width = natural.w;
    canvas.height = natural.h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    for (const r of regions) applyEffect(ctx, img, r);
    return canvas;
  }, [natural, regions, applyEffect]);

  // Draw to the visible canvas: result + region outlines + in-progress drag.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const result = renderResult();
    if (!canvas || !result) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(result, 0, 0);

    const line = Math.max(2, Math.round(natural.w / 400));
    ctx.lineWidth = line;
    ctx.strokeStyle = "#2563eb";
    for (const r of regions) ctx.strokeRect(r.x, r.y, r.w, r.h);

    const d = dragRef.current;
    if (d) {
      const rc = normalizeRect(d.start, d.cur, natural.w, natural.h) || {
        x: Math.min(d.start.x, d.cur.x),
        y: Math.min(d.start.y, d.cur.y),
        w: Math.abs(d.cur.x - d.start.x),
        h: Math.abs(d.cur.y - d.start.y),
      };
      ctx.setLineDash([line * 3, line * 2]);
      ctx.strokeStyle = "#dc2626";
      ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
      ctx.setLineDash([]);
    }
  }, [renderResult, regions, natural]);

  // Keep the visible canvas in sync whenever inputs change.
  useEffect(() => {
    if (natural) redraw();
  }, [natural, regions, effect, strength, redraw]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    setOutSize(0);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF, etc.).");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setOrigSize(file.size);
      setFileName(file.name || "image");
      setRegions([]);
      setOutSize(0);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;
    e.target.value = "";
  }

  function onPointerDown(e) {
    if (!natural) return;
    e.preventDefault();
    const p = eventToNatural(e);
    dragRef.current = { start: p, cur: p };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
    redraw();
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    dragRef.current.cur = eventToNatural(e);
    redraw();
  }

  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !natural) {
      redraw();
      return;
    }
    const rect = normalizeRect(d.start, d.cur, natural.w, natural.h);
    if (rect) {
      setOutSize(0);
      setRegions((prev) => [...prev, rect]);
    } else {
      redraw();
    }
  }

  function undoRegion() {
    setOutSize(0);
    setRegions((prev) => prev.slice(0, -1));
  }

  function clearRegions() {
    setOutSize(0);
    setRegions([]);
  }

  function download() {
    if (!natural) {
      setError("Upload an image first.");
      return;
    }
    if (regions.length === 0) {
      setError("Drag a box over the part of the image you want to hide first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const canvas = renderResult();
      if (!canvas) {
        setBusy(false);
        setError("Export failed — try re-uploading the image.");
        return;
      }
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            setError("Export failed — the image may be too large.");
            return;
          }
          const base = fileName.replace(/\.[^.]+$/, "") || "image";
          const name = `${base}-${effect}ed.png`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
          setOutSize(blob.size);
          setBusy(false);
        },
        "image/png"
      );
    } catch {
      setBusy(false);
      setError("Something went wrong while exporting. Try a different image.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="br-file">
          Choose an image
        </label>
        <input
          id="br-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Everything happens in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {!natural && (
        <p className="tool-note">
          Upload a photo or screenshot, then drag a box over any face, name, address,
          or other detail you want to blur or pixelate before saving.
        </p>
      )}

      {natural && (
        <>
          <div
            style={{
              margin: "0.5rem 0 1rem",
              maxWidth: "100%",
              lineHeight: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: 8,
                touchAction: "none",
                cursor: "crosshair",
                display: "block",
              }}
              aria-label="Image editor — drag to draw a box over the area to hide"
            />
          </div>

          <p className="tool-note">
            Drag on the image to draw a box. Add as many boxes as you need — each one gets
            hidden. Use Undo to remove the last box.
          </p>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="br-effect">
                  Effect
                </label>
                <select
                  id="br-effect"
                  className="tool-select"
                  value={effect}
                  onChange={(e) => {
                    setEffect(e.target.value);
                    setOutSize(0);
                  }}
                >
                  <option value="blur">Blur (soft, Gaussian)</option>
                  <option value="pixelate">Pixelate (mosaic blocks)</option>
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="br-strength">
                  Strength: {strength}
                </label>
                <input
                  id="br-strength"
                  className="tool-input"
                  type="range"
                  min="1"
                  max="100"
                  value={strength}
                  onChange={(e) => {
                    setStrength(Number(e.target.value));
                    setOutSize(0);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural.w} × {natural.h}
              </div>
              <div className="tool-stat-label">Image size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{regions.length}</div>
              <div className="tool-stat-label">Boxes drawn</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Saved PNG</div>
            </div>
          </div>

          <p className="tool-note">
            Tip: pixelate and a strong blur are hard to reverse, which makes them the safest
            choice for hiding faces, names, and account numbers.
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
            onClick={download}
            disabled={busy || regions.length === 0}
          >
            {busy ? "Saving…" : "Download PNG"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={undoRegion}
            disabled={busy || regions.length === 0}
          >
            Undo box
          </button>
          <button
            type="button"
            className="btn"
            onClick={clearRegions}
            disabled={busy || regions.length === 0}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
