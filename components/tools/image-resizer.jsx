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

export default function ImageResizer() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [outDims, setOutDims] = useState(null); // { w, h }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const previewUrlRef = useRef("");
  const outUrlRef = useRef("");
  const inputRef = useRef(null);
  const aspectRef = useRef(1); // width / height

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
      aspectRef.current = img.naturalWidth / img.naturalHeight || 1;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setOrigSize(file.size);
      setFileName(file.name || "image");
      setPreviewUrl(url);
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

  function onWidthChange(e) {
    const raw = e.target.value;
    setWidth(raw);
    resetOutput();
    if (lock && natural && raw !== "") {
      const w = parseInt(raw, 10);
      if (Number.isFinite(w) && w > 0) {
        const h = Math.max(1, Math.round(w / aspectRef.current));
        setHeight(String(h));
      }
    }
  }

  function onHeightChange(e) {
    const raw = e.target.value;
    setHeight(raw);
    resetOutput();
    if (lock && natural && raw !== "") {
      const h = parseInt(raw, 10);
      if (Number.isFinite(h) && h > 0) {
        const w = Math.max(1, Math.round(h * aspectRef.current));
        setWidth(String(w));
      }
    }
  }

  function onLockChange(e) {
    const next = e.target.checked;
    setLock(next);
    // Re-sync height to the current width when re-locking.
    if (next && natural) {
      const w = parseInt(width, 10);
      if (Number.isFinite(w) && w > 0) {
        setHeight(String(Math.max(1, Math.round(w / aspectRef.current))));
        resetOutput();
      }
    }
  }

  const w = parseInt(width, 10);
  const h = parseInt(height, 10);
  const validTarget =
    Number.isFinite(w) && w > 0 && w <= 20000 && Number.isFinite(h) && h > 0 && h <= 20000;

  function resize() {
    if (!imgRef.current || !natural) {
      setError("Upload an image first.");
      return;
    }
    if (!validTarget) {
      setError("Enter a width and height between 1 and 20000 pixels.");
      return;
    }
    setError("");
    setBusy(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgRef.current, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            setError("Export failed — try a smaller size.");
            return;
          }
          if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
          const url = URL.createObjectURL(blob);
          outUrlRef.current = url;
          setOutUrl(url);
          setOutSize(blob.size);
          setOutDims({ w, h });
          setBusy(false);
        },
        "image/png"
      );
    } catch {
      setBusy(false);
      setError("Something went wrong while resizing. Try a different image.");
    }
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "image";
    return `${base}-${w || "resized"}x${h || ""}.png`;
  })();

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ir-file">
          Choose an image
        </label>
        <input
          ref={inputRef}
          id="ir-file"
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

      {natural && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ir-width">
                  Width (px)
                </label>
                <input
                  id="ir-width"
                  className="tool-input"
                  type="number"
                  min="1"
                  max="20000"
                  inputMode="numeric"
                  value={width}
                  onChange={onWidthChange}
                  placeholder="e.g. 800"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ir-height">
                  Height (px)
                </label>
                <input
                  id="ir-height"
                  className="tool-input"
                  type="number"
                  min="1"
                  max="20000"
                  inputMode="numeric"
                  value={height}
                  onChange={onHeightChange}
                  placeholder="e.g. 600"
                />
              </div>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="ir-lock" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  id="ir-lock"
                  type="checkbox"
                  checked={lock}
                  onChange={onLockChange}
                  style={{ width: "auto", margin: 0 }}
                />
                Lock aspect ratio
              </label>
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural.w} × {natural.h}
              </div>
              <div className="tool-stat-label">Original size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {validTarget ? `${w} × ${h}` : "—"}
              </div>
              <div className="tool-stat-label">New size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Resized PNG</div>
            </div>
          </div>
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
            onClick={resize}
            disabled={busy || !validTarget}
          >
            {busy ? "Resizing…" : "Resize to PNG"}
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
