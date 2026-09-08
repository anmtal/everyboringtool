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

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

// Load a File into an HTMLImageElement, resolving with the element + object URL.
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode-failed"));
    };
    img.src = url;
  });
}

export default function OverlayImages() {
  const [baseImg, setBaseImg] = useState(null); // { img, url, name, size, w, h }
  const [overImg, setOverImg] = useState(null);

  const [opacity, setOpacity] = useState(70); // 0–100
  const [scale, setScale] = useState(100); // % of overlay natural width
  const [posX, setPosX] = useState(50); // % (0 = left, 100 = right), of free space
  const [posY, setPosY] = useState(50); // %
  const [rotation, setRotation] = useState(0); // degrees
  const [blend, setBlend] = useState("normal");

  const [outSize, setOutSize] = useState(0);
  const [error, setError] = useState("");

  const canvasRef = useRef(null);
  const baseUrlRef = useRef("");
  const overUrlRef = useRef("");

  // Revoke object URLs on unmount.
  useEffect(() => {
    return () => {
      if (baseUrlRef.current) URL.revokeObjectURL(baseUrlRef.current);
      if (overUrlRef.current) URL.revokeObjectURL(overUrlRef.current);
    };
  }, []);

  async function onBaseFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the base (PNG, JPG, WebP, GIF).");
      return;
    }
    setError("");
    try {
      const { img, url } = await loadImageFile(file);
      if (baseUrlRef.current) URL.revokeObjectURL(baseUrlRef.current);
      baseUrlRef.current = url;
      setBaseImg({
        img,
        url,
        name: file.name || "base",
        size: file.size,
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    } catch {
      setError("Couldn't read that base image — it may be corrupted or unsupported.");
    }
  }

  async function onOverFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the overlay (PNG, JPG, WebP, GIF).");
      return;
    }
    setError("");
    try {
      const { img, url } = await loadImageFile(file);
      if (overUrlRef.current) URL.revokeObjectURL(overUrlRef.current);
      overUrlRef.current = url;
      setOverImg({
        img,
        url,
        name: file.name || "overlay",
        size: file.size,
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    } catch {
      setError("Couldn't read that overlay image — it may be corrupted or unsupported.");
    }
  }

  // Compute the overlay placement (in base-image pixels) from the controls.
  function computePlacement() {
    if (!baseImg || !overImg) return null;
    const targetW = overImg.w * (scale / 100);
    const aspect = overImg.h / overImg.w;
    const targetH = targetW * aspect;
    const freeX = baseImg.w - targetW;
    const freeY = baseImg.h - targetH;
    // Center point of the overlay, positioned across the free space.
    const cx = freeX * (posX / 100) + targetW / 2;
    const cy = freeY * (posY / 100) + targetH / 2;
    return { targetW, targetH, cx, cy };
  }

  // Draw the composite onto the canvas whenever inputs change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!baseImg) {
      const ctx = canvas.getContext("2d");
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    canvas.width = baseImg.w;
    canvas.height = baseImg.h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(baseImg.img, 0, 0, baseImg.w, baseImg.h);

    if (overImg) {
      const p = computePlacement();
      if (p) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, opacity / 100));
        ctx.globalCompositeOperation = blend === "normal" ? "source-over" : blend;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.translate(p.cx, p.cy);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(
          overImg.img,
          -p.targetW / 2,
          -p.targetH / 2,
          p.targetW,
          p.targetH
        );
        ctx.restore();
      }
    }
  }, [baseImg, overImg, opacity, scale, posX, posY, rotation, blend]);

  function download(type) {
    const canvas = canvasRef.current;
    if (!canvas || !baseImg) {
      setError("Add a base image first.");
      return;
    }
    setError("");
    const mime = type === "jpg" ? "image/jpeg" : "image/png";
    const quality = type === "jpg" ? 0.92 : undefined;
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Export failed — try smaller images.");
          return;
        }
        setOutSize(blob.size);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const base = (baseImg.name || "image").replace(/\.[^.]+$/, "");
        a.href = url;
        a.download = `${base}-overlay.${type}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      mime,
      quality
    );
  }

  function reset() {
    setOpacity(70);
    setScale(100);
    setPosX(50);
    setPosY(50);
    setRotation(0);
    setBlend("normal");
  }

  const ready = baseImg && overImg;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="oi-base">
              Base image (bottom layer)
            </label>
            <input
              id="oi-base"
              className="tool-input"
              type="file"
              accept="image/*"
              onChange={onBaseFile}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="oi-over">
              Overlay image (top layer)
            </label>
            <input
              id="oi-over"
              className="tool-input"
              type="file"
              accept="image/*"
              onChange={onOverFile}
            />
          </div>
        </div>
      </div>

      <p className="tool-note">
        Both images stay on your device — nothing is uploaded. The output canvas matches the
        base image&apos;s pixel dimensions. A transparent PNG overlay keeps its transparency.
      </p>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {!baseImg && (
        <p className="tool-note">
          Start by choosing a <strong>base image</strong> above, then add an{" "}
          <strong>overlay image</strong> to place on top of it.
        </p>
      )}

      {baseImg && !overImg && (
        <p className="tool-note">
          Base image loaded ({baseImg.w} × {baseImg.h}). Now add an <strong>overlay
          image</strong> to composite on top.
        </p>
      )}

      {/* Live preview */}
      <div
        style={{
          margin: "0.75rem 0 1rem",
          display: baseImg ? "block" : "none",
          textAlign: "center",
          overflow: "auto",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Live preview of the overlaid images"
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: 8,
            display: "inline-block",
          }}
        />
      </div>

      {ready && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="oi-opacity">
                  Overlay opacity: {opacity}%
                </label>
                <input
                  id="oi-opacity"
                  className="tool-input"
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="oi-scale">
                  Overlay size: {scale}%
                </label>
                <input
                  id="oi-scale"
                  className="tool-input"
                  type="range"
                  min="5"
                  max="200"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="oi-posx">
                  Horizontal position: {posX}%
                </label>
                <input
                  id="oi-posx"
                  className="tool-input"
                  type="range"
                  min="0"
                  max="100"
                  value={posX}
                  onChange={(e) => setPosX(Number(e.target.value))}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="oi-posy">
                  Vertical position: {posY}%
                </label>
                <input
                  id="oi-posy"
                  className="tool-input"
                  type="range"
                  min="0"
                  max="100"
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="oi-rotation">
                  Overlay rotation: {rotation}°
                </label>
                <input
                  id="oi-rotation"
                  className="tool-input"
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="oi-blend">
                  Blend mode
                </label>
                <select
                  id="oi-blend"
                  className="tool-select"
                  value={blend}
                  onChange={(e) => setBlend(e.target.value)}
                >
                  {BLEND_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {baseImg.w} × {baseImg.h}
              </div>
              <div className="tool-stat-label">Output size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {overImg.w} × {overImg.h}
              </div>
              <div className="tool-stat-label">Overlay source (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{opacity}%</div>
              <div className="tool-stat-label">Opacity</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Last export</div>
            </div>
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => download("png")}
            >
              ↓ Download PNG
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => download("jpg")}
            >
              ↓ Download JPG
            </button>
            <button type="button" className="btn" onClick={reset}>
              Reset settings
            </button>
          </div>

          <p className="tool-note">
            Position sliders move the overlay across the empty space in the base image, so at
            50% / 50% it stays centered no matter its size. Blend modes (multiply, screen,
            overlay, etc.) match how photo editors combine layers.
          </p>
        </>
      )}
    </div>
  );
}
