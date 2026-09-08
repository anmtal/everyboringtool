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

// The circle is inscribed in a square canvas of SIZE px. We fit the image so
// the SHORT side covers the circle at zoom = 1, then let the user zoom in and
// nudge the centre. This mirrors how avatar croppers behave.
export default function CircleCrop() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);

  const [size, setSize] = useState("512"); // output diameter in px
  const [zoom, setZoom] = useState(1); // 1..4
  const [offX, setOffX] = useState(0); // -1..1 (fraction of spare width)
  const [offY, setOffY] = useState(0); // -1..1 (fraction of spare height)
  const [bg, setBg] = useState("transparent"); // transparent | white | black | custom
  const [customBg, setCustomBg] = useState("#ffffff");
  const [ring, setRing] = useState(0); // border ring width in px (0 = none)
  const [ringColor, setRingColor] = useState("#ffffff");

  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [error, setError] = useState("");

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const previewUrlRef = useRef("");
  const outUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    };
  }, []);

  const diameter = useMemo(() => {
    const n = parseInt(size, 10);
    if (!Number.isFinite(n)) return 512;
    return Math.min(Math.max(n, 16), 2000);
  }, [size]);

  const fillColor = useMemo(() => {
    if (bg === "white") return "#ffffff";
    if (bg === "black") return "#000000";
    if (bg === "custom") return customBg;
    return null; // transparent
  }, [bg, customBg]);

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
      setZoom(1);
      setOffX(0);
      setOffY(0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = "";
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;

    e.target.value = "";
  }

  // Compute the source rectangle (in natural pixels) that maps onto the circle
  // square. Returns null when no image is loaded.
  function computeSourceRect() {
    const img = imgRef.current;
    if (!img || !natural) return null;
    const nw = natural.w;
    const nh = natural.h;
    // "cover" fit: base source square side = short image side, then zoom shrinks it.
    const baseSide = Math.min(nw, nh);
    const side = baseSide / zoom; // source square side in natural px
    const spareX = nw - side; // horizontal slack we can pan across
    const spareY = nh - side;
    // offX/offY in -1..1 → 0..spare
    const sx = (spareX / 2) * (1 + offX);
    const sy = (spareY / 2) * (1 + offY);
    return {
      sx: Math.min(Math.max(sx, 0), Math.max(0, nw - side)),
      sy: Math.min(Math.max(sy, 0), Math.max(0, nh - side)),
      side,
    };
  }

  // Draw onto a canvas of `d` px. If forExport, uses full diameter; the live
  // preview reuses the same routine at preview scale for a true WYSIWYG result.
  function render(canvas, d) {
    const img = imgRef.current;
    const rect = computeSourceRect();
    if (!canvas || !img || !rect) return;
    canvas.width = d;
    canvas.height = d;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, d, d);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const r = d / 2;
    const ringPx = ring > 0 ? (ring / diameter) * d : 0; // scale ring to canvas
    const innerR = Math.max(0, r - ringPx);

    ctx.save();
    // Clip to the inner circle (inside the ring).
    ctx.beginPath();
    ctx.arc(r, r, innerR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, d, d);
    }
    // Map the source square onto the inner-circle bounding box.
    const dest = innerR * 2;
    const destOff = r - innerR;
    ctx.drawImage(img, rect.sx, rect.sy, rect.side, rect.side, destOff, destOff, dest, dest);
    ctx.restore();

    // Draw the ring on top.
    if (ringPx > 0) {
      ctx.beginPath();
      ctx.arc(r, r, r - ringPx / 2, 0, Math.PI * 2);
      ctx.lineWidth = ringPx;
      ctx.strokeStyle = ringColor;
      ctx.stroke();
    }
  }

  // Live preview redraw whenever any control changes.
  useEffect(() => {
    if (canvasRef.current && imgRef.current) {
      render(canvasRef.current, 320);
    }
    resetOutput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, zoom, offX, offY, diameter, bg, customBg, ring, ringColor]);

  function exportPng() {
    if (!imgRef.current || !natural) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    try {
      const canvas = document.createElement("canvas");
      render(canvas, diameter);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError("Export failed — try a smaller output size.");
            return;
          }
          if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
          const url = URL.createObjectURL(blob);
          outUrlRef.current = url;
          setOutUrl(url);
          setOutSize(blob.size);
          const a = document.createElement("a");
          a.href = url;
          a.download = downloadName;
          a.click();
        },
        "image/png"
      );
    } catch {
      setError("Something went wrong while cropping. Try a different image.");
    }
  }

  function resetControls() {
    setZoom(1);
    setOffX(0);
    setOffY(0);
    resetOutput();
  }

  const downloadName = useMemo(() => {
    const base = (fileName || "image").replace(/\.[^.]+$/, "") || "image";
    return `${base}-circle-${diameter}.png`;
  }, [fileName, diameter]);

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="cc-file">
          Choose an image
        </label>
        <input
          id="cc-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Everything runs in your browser — your photo is never uploaded to a server.
        </p>
      </div>

      {!previewUrl && (
        <p className="tool-note">
          Upload a photo to crop it into a perfect circle. Great for profile pictures,
          avatars, logos and Discord / Slack / Zoom icons. The result is a transparent PNG.
        </p>
      )}

      {previewUrl && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "0.5rem 0 1rem",
            }}
          >
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              aria-label="Live preview of the circular crop"
              style={{
                width: 320,
                maxWidth: "100%",
                height: "auto",
                borderRadius: 8,
                backgroundImage:
                  "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="cc-zoom">
                Zoom ({zoom.toFixed(2)}×)
              </label>
              <input
                id="cc-zoom"
                className="tool-input"
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="cc-offx">
                  Horizontal position
                </label>
                <input
                  id="cc-offx"
                  className="tool-input"
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={offX}
                  onChange={(e) => setOffX(parseFloat(e.target.value))}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="cc-offy">
                  Vertical position
                </label>
                <input
                  id="cc-offy"
                  className="tool-input"
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={offY}
                  onChange={(e) => setOffY(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="cc-size">
                  Output size (px)
                </label>
                <select
                  id="cc-size"
                  className="tool-select"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                >
                  <option value="128">128 × 128</option>
                  <option value="256">256 × 256</option>
                  <option value="400">400 × 400</option>
                  <option value="512">512 × 512</option>
                  <option value="800">800 × 800</option>
                  <option value="1000">1000 × 1000</option>
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="cc-bg">
                  Background
                </label>
                <select
                  id="cc-bg"
                  className="tool-select"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                >
                  <option value="transparent">Transparent</option>
                  <option value="white">White</option>
                  <option value="black">Black</option>
                  <option value="custom">Custom color…</option>
                </select>
              </div>
            </div>

            {bg === "custom" && (
              <div className="tool-field">
                <label className="tool-label" htmlFor="cc-bgcolor">
                  Background color
                </label>
                <input
                  id="cc-bgcolor"
                  className="tool-input"
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                />
              </div>
            )}

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="cc-ring">
                  Border ring ({ring} px)
                </label>
                <input
                  id="cc-ring"
                  className="tool-input"
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={ring}
                  onChange={(e) => setRing(parseInt(e.target.value, 10))}
                />
              </div>
              {ring > 0 && (
                <div className="tool-field">
                  <label className="tool-label" htmlFor="cc-ringcolor">
                    Ring color
                  </label>
                  <input
                    id="cc-ringcolor"
                    className="tool-input"
                    type="color"
                    value={ringColor}
                    onChange={(e) => setRingColor(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural ? `${natural.w} × ${natural.h}` : "—"}
              </div>
              <div className="tool-stat-label">Original size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {diameter} × {diameter}
              </div>
              <div className="tool-stat-label">Circle output (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Cropped PNG</div>
            </div>
          </div>

          <p className="tool-note">
            The circle is cut from the centre of the square preview. Use zoom and the
            position sliders to frame the subject, then download a PNG.
          </p>
        </>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {previewUrl && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={exportPng}>
            Crop & Download PNG
          </button>
          <button type="button" className="btn" onClick={resetControls}>
            Reset framing
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Save again
            </a>
          )}
        </div>
      )}
    </div>
  );
}
