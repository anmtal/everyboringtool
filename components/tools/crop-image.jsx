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

// Parse an input string to a finite integer, or fall back.
function toInt(raw, fallback) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function CropImage() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);

  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [outDims, setOutDims] = useState(null); // { w, h }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const previewUrlRef = useRef("");
  const outUrlRef = useRef("");

  // Revoke object URLs on unmount.
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
    setOutDims(null);
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

    // Replace any previous preview URL.
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
      // Default crop = the full image.
      setX("0");
      setY("0");
      setWidth(String(img.naturalWidth));
      setHeight(String(img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = "";
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;

    e.target.value = "";
  }

  function onFieldChange(setter) {
    return (e) => {
      setter(e.target.value);
      resetOutput();
    };
  }

  // Derive clamped, image-bounded crop values used for the overlay, stats, and export.
  let crop = null;
  if (natural) {
    const nw = natural.w;
    const nh = natural.h;
    const cx = Math.min(Math.max(toInt(x, 0), 0), Math.max(0, nw - 1));
    const cy = Math.min(Math.max(toInt(y, 0), 0), Math.max(0, nh - 1));
    const cw = Math.min(Math.max(toInt(width, nw), 1), nw - cx);
    const ch = Math.min(Math.max(toInt(height, nh), 1), nh - cy);
    crop = { x: cx, y: cy, w: cw, h: ch };
  }

  const validCrop = crop && crop.w > 0 && crop.h > 0;

  function cropAndDownload() {
    if (!imgRef.current || !natural || !crop) {
      setError("Upload an image first.");
      return;
    }
    if (!validCrop) {
      setError("The crop region is empty — check your X, Y, width, and height values.");
      return;
    }
    setError("");
    setBusy(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = crop.w;
      canvas.height = crop.h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // Draw the chosen source region at natural resolution (no scaling).
      ctx.drawImage(
        imgRef.current,
        crop.x,
        crop.y,
        crop.w,
        crop.h,
        0,
        0,
        crop.w,
        crop.h
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            setError("Export failed — try a smaller crop.");
            return;
          }
          if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
          const url = URL.createObjectURL(blob);
          outUrlRef.current = url;
          setOutUrl(url);
          setOutSize(blob.size);
          setOutDims({ w: crop.w, h: crop.h });
          setBusy(false);
        },
        "image/png"
      );
    } catch {
      setBusy(false);
      setError("Something went wrong while cropping. Try a different image.");
    }
  }

  function resetCrop() {
    if (!natural) return;
    setX("0");
    setY("0");
    setWidth(String(natural.w));
    setHeight(String(natural.h));
    resetOutput();
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "image";
    const wPart = crop ? crop.w : "cropped";
    const hPart = crop ? crop.h : "";
    return `${base}-crop-${wPart}x${hPart}.png`;
  })();

  // Overlay is positioned as a percentage of natural dimensions so it scales
  // exactly with the responsively-displayed preview image.
  const overlayStyle = crop
    ? {
        position: "absolute",
        left: `${(crop.x / natural.w) * 100}%`,
        top: `${(crop.y / natural.h) * 100}%`,
        width: `${(crop.w / natural.w) * 100}%`,
        height: `${(crop.h / natural.h) * 100}%`,
        boxSizing: "border-box",
        border: "2px solid #2563eb",
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
        pointerEvents: "none",
      }
    : null;

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ci-file">
          Choose an image
        </label>
        <input
          id="ci-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Everything happens in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {previewUrl && (
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
            src={previewUrl}
            alt="Preview of the uploaded image with the crop region highlighted"
            style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, display: "block" }}
          />
          {overlayStyle && <div style={overlayStyle} aria-hidden="true" />}
        </div>
      )}

      {natural && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ci-x">
                  X (px)
                </label>
                <input
                  id="ci-x"
                  className="tool-input"
                  type="number"
                  min="0"
                  max={Math.max(0, natural.w - 1)}
                  inputMode="numeric"
                  value={x}
                  onChange={onFieldChange(setX)}
                  placeholder="0"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ci-y">
                  Y (px)
                </label>
                <input
                  id="ci-y"
                  className="tool-input"
                  type="number"
                  min="0"
                  max={Math.max(0, natural.h - 1)}
                  inputMode="numeric"
                  value={y}
                  onChange={onFieldChange(setY)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ci-width">
                  Width (px)
                </label>
                <input
                  id="ci-width"
                  className="tool-input"
                  type="number"
                  min="1"
                  max={natural.w}
                  inputMode="numeric"
                  value={width}
                  onChange={onFieldChange(setWidth)}
                  placeholder={String(natural.w)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ci-height">
                  Height (px)
                </label>
                <input
                  id="ci-height"
                  className="tool-input"
                  type="number"
                  min="1"
                  max={natural.h}
                  inputMode="numeric"
                  value={height}
                  onChange={onFieldChange(setHeight)}
                  placeholder={String(natural.h)}
                />
              </div>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural.w} × {natural.h}
              </div>
              <div className="tool-stat-label">Original size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {validCrop ? `${crop.w} × ${crop.h}` : "—"}
              </div>
              <div className="tool-stat-label">Crop size (px)</div>
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
            X, Y is the top-left corner of the crop. Values are automatically clamped to the
            image bounds.
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
            onClick={cropAndDownload}
            disabled={busy || !validCrop}
          >
            {busy ? "Cropping…" : "Crop & Download"}
          </button>
          <button type="button" className="btn" onClick={resetCrop} disabled={busy}>
            Reset to full image
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Download PNG{outDims ? ` (${outDims.w}×${outDims.h})` : ""}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
