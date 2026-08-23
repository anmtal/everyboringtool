"use client";

import { useState, useEffect, useRef } from "react";

const PRESETS = [
  { id: "square", label: "Square — Post (1:1)", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait — Post (4:5)", w: 1080, h: 1350 },
  { id: "landscape", label: "Landscape — Post (1.91:1)", w: 1080, h: 566 },
  { id: "story", label: "Story / Reel (9:16)", w: 1080, h: 1920 },
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export default function InstagramImageResizer() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);
  const [presetId, setPresetId] = useState("square");
  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const previewUrlRef = useRef("");
  const outUrlRef = useRef("");

  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];

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
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = "";
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;

    e.target.value = "";
  }

  function onPresetChange(e) {
    setPresetId(e.target.value);
    resetOutput();
  }

  function resize() {
    if (!imgRef.current || !natural) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    setBusy(true);

    try {
      const targetW = preset.w;
      const targetH = preset.h;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // White backdrop in case of any transparency (JPEG has no alpha).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);

      // Cover-fit: scale the source to fill the target, then center-crop.
      const srcW = imgRef.current.naturalWidth;
      const srcH = imgRef.current.naturalHeight;
      const scale = Math.max(targetW / srcW, targetH / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const dx = (targetW - drawW) / 2;
      const dy = (targetH - drawH) / 2;
      ctx.drawImage(imgRef.current, dx, dy, drawW, drawH);

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
        0.92
      );
    } catch {
      setBusy(false);
      setError("Something went wrong while resizing. Try a different image.");
    }
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "image";
    return `${base}-instagram-${preset.w}x${preset.h}.jpg`;
  })();

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="igr-file">
          Choose an image
        </label>
        <input
          id="igr-file"
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
        <div style={{ margin: "0.5rem 0 1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview of the uploaded image"
            style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 8, display: "block" }}
          />
        </div>
      )}

      <div className="tool-field">
        <label className="tool-label" htmlFor="igr-preset">
          Instagram size
        </label>
        <select
          id="igr-preset"
          className="tool-select"
          value={presetId}
          onChange={onPresetChange}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.w} × {p.h}
            </option>
          ))}
        </select>
        <p className="tool-note">
          The image is scaled to fill the frame and center-cropped, then exported as a JPEG.
        </p>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">Output dimensions</p>
        <div className="tool-result-value">
          {preset.w} × {preset.h} px
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
              {preset.w} × {preset.h}
            </div>
            <div className="tool-stat-label">New size (px)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{formatBytes(origSize)}</div>
            <div className="tool-stat-label">Original file</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
            <div className="tool-stat-label">Resized JPEG</div>
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
            onClick={resize}
            disabled={busy}
          >
            {busy ? "Resizing…" : "Resize to JPEG"}
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Download JPEG
            </a>
          )}
        </div>
      )}
    </div>
  );
}
