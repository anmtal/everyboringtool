"use client";

import { useState, useEffect, useRef } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Normalise a drag (which can go in any direction) into a positive-size rect.
function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h };
}

export default function BlurRegion() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);

  const [regions, setRegions] = useState([]); // [{ x, y, w, h }] in natural px
  const [drag, setDrag] = useState(null); // { start:{x,y}, current:{x,y} } in natural px

  const [mode, setMode] = useState("blur"); // "blur" | "pixelate"
  const [strength, setStrength] = useState(20); // 1..60

  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const boxRef = useRef(null); // the preview wrapper element
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

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    resetOutput();
    setRegions([]);
    setDrag(null);

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

  // Convert a pointer event to natural-image coordinates.
  function pointToNatural(clientX, clientY) {
    if (!boxRef.current || !natural) return null;
    const rect = boxRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const x = Math.min(Math.max(px, 0), 1) * natural.w;
    const y = Math.min(Math.max(py, 0), 1) * natural.h;
    return { x, y };
  }

  function getClient(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0])
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onDragStart(e) {
    if (!natural) return;
    if (e.cancelable) e.preventDefault();
    const c = getClient(e);
    const p = pointToNatural(c.x, c.y);
    if (!p) return;
    setDrag({ start: p, current: p });
  }

  function onDragMove(e) {
    if (!drag) return;
    if (e.cancelable) e.preventDefault();
    const c = getClient(e);
    const p = pointToNatural(c.x, c.y);
    if (!p) return;
    setDrag((d) => (d ? { ...d, current: p } : d));
  }

  function onDragEnd() {
    if (!drag) return;
    const r = normalizeRect(drag.start, drag.current);
    setDrag(null);
    // Ignore tiny/accidental drags (less than 4px in either dimension).
    if (r.w < 4 || r.h < 4) return;
    const rounded = {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.w),
      h: Math.round(r.h),
    };
    setRegions((rs) => [...rs, rounded]);
    resetOutput();
  }

  function removeRegion(idx) {
    setRegions((rs) => rs.filter((_, i) => i !== idx));
    resetOutput();
  }

  function clearRegions() {
    setRegions([]);
    setDrag(null);
    resetOutput();
  }

  // Apply the blur/pixelate to each region on a full-resolution canvas.
  function applyAndDownload() {
    if (!imgRef.current || !natural) {
      setError("Upload an image first.");
      return;
    }
    if (regions.length === 0) {
      setError("Drag a rectangle over the image to mark at least one area to hide.");
      return;
    }
    setError("");
    setBusy(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = natural.w;
      canvas.height = natural.h;
      const ctx = canvas.getContext("2d");

      // Base image at full resolution.
      ctx.drawImage(imgRef.current, 0, 0, natural.w, natural.h);

      for (const r0 of regions) {
        // Clamp region to image bounds.
        const x = Math.min(Math.max(r0.x, 0), natural.w - 1);
        const y = Math.min(Math.max(r0.y, 0), natural.h - 1);
        const w = Math.min(r0.w, natural.w - x);
        const h = Math.min(r0.h, natural.h - y);
        if (w <= 0 || h <= 0) continue;

        if (mode === "blur") {
          // Scale blur radius to region size so it always looks blurred,
          // even for large selections; strength is a percentage-ish dial.
          const radius = Math.max(2, Math.round((Math.min(w, h) * strength) / 100));
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          if (ctx.filter !== undefined) {
            ctx.filter = `blur(${radius}px)`;
            // Redraw the whole image blurred; the clip keeps it inside the region.
            ctx.drawImage(imgRef.current, 0, 0, natural.w, natural.h);
            ctx.filter = "none";
          } else {
            // Fallback for browsers without canvas filter: pixelate instead.
            pixelateRegion(ctx, imgRef.current, x, y, w, h, strength, natural);
          }
          ctx.restore();
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          pixelateRegion(ctx, imgRef.current, x, y, w, h, strength, natural);
          ctx.restore();
        }
      }

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
      setError("Something went wrong while processing. Try a different image.");
    }
  }

  // Draw a pixelated (mosaic) version of a region by downscaling then upscaling.
  function pixelateRegion(ctx, img, x, y, w, h, str, nat) {
    // Larger strength => bigger blocks => smaller downscale target.
    const blocks = Math.max(3, Math.round(60 - (str / 60) * 55)); // ~3..60 cells
    const tw = Math.max(1, Math.min(Math.round(blocks * (w / Math.max(w, h))), w));
    const th = Math.max(1, Math.min(Math.round(blocks * (h / Math.max(w, h))), h));
    const tmp = document.createElement("canvas");
    tmp.width = tw;
    tmp.height = th;
    const tctx = tmp.getContext("2d");
    tctx.imageSmoothingEnabled = true;
    // Draw just the region, shrunk down.
    tctx.drawImage(img, x, y, w, h, 0, 0, tw, th);
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false; // blocky upscale
    ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
    ctx.imageSmoothingEnabled = prev;
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "image";
    return `${base}-blurred.png`;
  })();

  // Build the list of overlay rectangles (committed regions + the live drag).
  const overlays = [];
  if (natural) {
    regions.forEach((r, i) => {
      overlays.push({ key: `r${i}`, rect: r, live: false, idx: i });
    });
    if (drag) {
      overlays.push({
        key: "drag",
        rect: normalizeRect(drag.start, drag.current),
        live: true,
        idx: -1,
      });
    }
  }

  function overlayStyle(rect, live) {
    return {
      position: "absolute",
      left: `${(rect.x / natural.w) * 100}%`,
      top: `${(rect.y / natural.h) * 100}%`,
      width: `${(rect.w / natural.w) * 100}%`,
      height: `${(rect.h / natural.h) * 100}%`,
      boxSizing: "border-box",
      border: live ? "2px dashed #2563eb" : "2px solid #2563eb",
      background: "rgba(37, 99, 235, 0.18)",
      pointerEvents: "none",
    };
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

      {!previewUrl && (
        <p className="tool-note">
          Upload a photo, then drag a box over any face, license plate, address, or other
          detail you want to hide. You can mark several areas.
        </p>
      )}

      {previewUrl && (
        <>
          <div
            ref={boxRef}
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
            style={{
              position: "relative",
              display: "inline-block",
              maxWidth: "100%",
              margin: "0.5rem 0 0.75rem",
              lineHeight: 0,
              cursor: "crosshair",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Uploaded image — drag to mark areas to blur"
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: 360,
                borderRadius: 8,
                display: "block",
              }}
            />
            {overlays.map((o) => (
              <div key={o.key} style={overlayStyle(o.rect, o.live)} aria-hidden="true" />
            ))}
          </div>

          <p className="tool-note">
            Drag on the image to draw a rectangle over each area you want to hide.
          </p>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="br-mode">
                  Effect
                </label>
                <select
                  id="br-mode"
                  className="tool-select"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    resetOutput();
                  }}
                >
                  <option value="blur">Blur (smooth)</option>
                  <option value="pixelate">Pixelate (mosaic)</option>
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
                  max="60"
                  value={strength}
                  onChange={(e) => {
                    setStrength(Number(e.target.value));
                    resetOutput();
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
              <div className="tool-stat-label">Areas marked</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Output PNG</div>
            </div>
          </div>

          {regions.length > 0 && (
            <div className="tool-result">
              <div className="tool-result-label">Marked areas</div>
              <div className="tool-result-value">
                {regions.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn"
                    onClick={() => removeRegion(i)}
                    style={{ margin: "0 0.4rem 0.4rem 0" }}
                    title="Click to remove this area"
                  >
                    Area {i + 1}: {r.w}×{r.h} ✕
                  </button>
                ))}
              </div>
              <p className="tool-note">Click an area to remove it.</p>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {previewUrl && (
        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={applyAndDownload}
            disabled={busy || regions.length === 0}
          >
            {busy ? "Processing…" : "Apply & Download PNG"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={clearRegions}
            disabled={busy || (regions.length === 0 && !drag)}
          >
            Clear areas
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Download blurred PNG
            </a>
          )}
        </div>
      )}
    </div>
  );
}
