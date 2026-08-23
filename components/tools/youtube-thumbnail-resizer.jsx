"use client";

import { useState, useEffect, useRef } from "react";

const TARGET_W = 1280;
const TARGET_H = 720;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Cover-fit: scale the source to fill the frame, then center it (crop overflow).
function drawCover(ctx, img, frameW, frameH, zoom) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) return;
  const base = Math.max(frameW / srcW, frameH / srcH);
  const scale = base * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const dx = (frameW - drawW) / 2;
  const dy = (frameH - drawH) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

export default function YoutubeThumbnailResizer() {
  const [fileName, setFileName] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [quality, setQuality] = useState(0.92);
  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const outUrlRef = useRef("");
  const previewCanvasRef = useRef(null);
  const inputRef = useRef(null);

  // Revoke output object URL on unmount.
  useEffect(() => {
    return () => {
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    };
  }, []);

  // Redraw the live preview whenever the image, zoom, or size changes.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current && natural) {
      drawCover(ctx, imgRef.current, canvas.width, canvas.height, zoom);
    }
  }, [natural, zoom]);

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

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setOrigSize(file.size);
      setFileName(file.name || "image");
      setZoom(1);
      // The <img> data now lives inside the Image element; free the blob URL.
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;

    e.target.value = "";
  }

  function onZoomChange(e) {
    const v = parseFloat(e.target.value);
    setZoom(Number.isFinite(v) && v > 0 ? v : 1);
    resetOutput();
  }

  function onQualityChange(e) {
    const v = parseFloat(e.target.value);
    setQuality(Number.isFinite(v) ? Math.min(1, Math.max(0.4, v)) : 0.92);
    resetOutput();
  }

  function generate() {
    if (!imgRef.current || !natural) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    setBusy(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext("2d");
      // JPEG has no alpha — fill black so any overflow gaps stay clean.
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, TARGET_W, TARGET_H);
      drawCover(ctx, imgRef.current, TARGET_W, TARGET_H, zoom);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            setError("Export failed — try a different image.");
            return;
          }
          if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
          const url = URL.createObjectURL(blob);
          outUrlRef.current = url;
          setOutUrl(url);
          setOutSize(blob.size);
          setBusy(false);
        },
        "image/jpeg",
        quality
      );
    } catch {
      setBusy(false);
      setError("Something went wrong while exporting. Try a different image.");
    }
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "thumbnail";
    return `${base}-youtube-1280x720.jpg`;
  })();

  const qualityPct = Math.round(quality * 100);
  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ytr-file">
          Choose an image
        </label>
        <input
          ref={inputRef}
          id="ytr-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Everything happens in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {natural && (
        <div style={{ margin: "0.5rem 0 1rem" }}>
          <canvas
            ref={previewCanvasRef}
            width={640}
            height={360}
            aria-label="YouTube thumbnail preview at 1280 by 720 (16:9)"
            style={{
              display: "block",
              width: "100%",
              maxWidth: 640,
              height: "auto",
              aspectRatio: "16 / 9",
              borderRadius: 8,
              border: "1px solid rgba(128,128,128,0.35)",
              background: "#000",
            }}
          />
          <p className="tool-note">
            Live preview at the exact 16:9 crop. The image is scaled to fill and
            center-cropped; adjust zoom below to reframe.
          </p>
        </div>
      )}

      {natural && (
        <div className="tool-fields">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ytr-zoom">
              Zoom — {zoomPct}%
            </label>
            <input
              id="ytr-zoom"
              className="tool-input"
              type="range"
              min="1"
              max="4"
              step="0.01"
              value={zoom}
              onChange={onZoomChange}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ytr-quality">
              JPG quality — {qualityPct}%
            </label>
            <input
              id="ytr-quality"
              className="tool-input"
              type="range"
              min="0.4"
              max="1"
              step="0.01"
              value={quality}
              onChange={onQualityChange}
            />
          </div>
        </div>
      )}

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">Output size (YouTube thumbnail spec)</p>
        <div className="tool-result-value">
          {TARGET_W} × {TARGET_H} px · 16:9
        </div>
      </div>

      {natural && (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">
              {natural.w} × {natural.h}
            </div>
            <div className="tool-stat-label">Original size (px)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {TARGET_W} × {TARGET_H}
            </div>
            <div className="tool-stat-label">New size (px)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{formatBytes(origSize)}</div>
            <div className="tool-stat-label">Original file</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
            <div className="tool-stat-label">Thumbnail JPG</div>
          </div>
        </div>
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
            onClick={generate}
            disabled={busy}
          >
            {busy ? "Exporting…" : "Export 1280×720 JPG"}
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Download JPG
            </a>
          )}
        </div>
      )}

      {!natural && (
        <p className="tool-note">
          Upload any image and it will be cropped and scaled to a perfect
          1280×720 YouTube thumbnail.
        </p>
      )}
    </div>
  );
}
