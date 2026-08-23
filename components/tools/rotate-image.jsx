"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Human-friendly byte formatting for the stat grid.
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export default function RotateImage() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // original { w, h }
  const [current, setCurrent] = useState(null); // current { w, h }
  const [origSize, setOrigSize] = useState(0);
  const [outSize, setOutSize] = useState(0);
  const [edits, setEdits] = useState(0);
  const [rotation, setRotation] = useState(0); // 0 / 90 / 180 / 270, informational
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const imgRef = useRef(null); // pristine original HTMLImageElement
  const canvasRef = useRef(null); // current working canvas
  const outUrlRef = useRef(""); // current object URL (used for preview + download)

  // Revoke the object URL on unmount.
  useEffect(() => {
    return () => {
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    };
  }, []);

  // Push a canvas as the new current state: update preview, dims, and size.
  const commitCanvas = useCallback((canvas) => {
    canvasRef.current = canvas;
    setCurrent({ w: canvas.width, h: canvas.height });
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Couldn't render the image — it may be too large for this browser.");
        return;
      }
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
      const url = URL.createObjectURL(blob);
      outUrlRef.current = url;
      setPreviewUrl(url);
      setOutSize(blob.size);
    }, "image/png");
  }, []);

  // Draw the pristine original into a fresh canvas and make it current.
  const drawOriginal = useCallback(
    (img) => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Your browser doesn't support the canvas needed to rotate images.");
        return;
      }
      ctx.drawImage(img, 0, 0);
      commitCanvas(canvas);
    },
    [commitCanvas]
  );

  const loadFile = useCallback(
    (file) => {
      if (!file) return;
      setError("");
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, JPG, WebP, GIF, etc.).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          imgRef.current = img;
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          setOrigSize(file.size);
          setFileName(file.name || "image");
          setEdits(0);
          setRotation(0);
          setFlipH(false);
          setFlipV(false);
          drawOriginal(img);
        };
        img.onerror = () => {
          setError("Couldn't read that image — it may be corrupted or an unsupported format.");
        };
        img.src = reader.result;
      };
      reader.onerror = () => {
        setError("Couldn't read that file. Please try another image.");
      };
      reader.readAsDataURL(file);
    },
    [drawOriginal]
  );

  function onInput(e) {
    const file = e.target.files && e.target.files[0];
    loadFile(file);
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  }

  // Apply a single 90° rotation to the current canvas. dir = 1 (right/CW) or -1 (left/CCW).
  function rotate(dir) {
    const src = canvasRef.current;
    if (!src) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      // 90°/270° rotations swap width and height.
      out.width = src.height;
      out.height = src.width;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      // Move origin to the centre of the destination, rotate, then draw the
      // source centred on the new origin.
      ctx.translate(out.width / 2, out.height / 2);
      ctx.rotate((dir * 90 * Math.PI) / 180);
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      commitCanvas(out);
      setEdits((n) => n + 1);
      setRotation((r) => (((r + dir * 90) % 360) + 360) % 360);
    } catch {
      setError("Something went wrong while rotating. Try a different image.");
    } finally {
      setBusy(false);
    }
  }

  // Mirror the current canvas. axis = "h" (horizontal) or "v" (vertical).
  function flip(axis) {
    const src = canvasRef.current;
    if (!src) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      if (axis === "h") {
        ctx.translate(out.width, 0);
        ctx.scale(-1, 1);
        setFlipH((v) => !v);
      } else {
        ctx.translate(0, out.height);
        ctx.scale(1, -1);
        setFlipV((v) => !v);
      }
      ctx.drawImage(src, 0, 0);
      commitCanvas(out);
      setEdits((n) => n + 1);
    } catch {
      setError("Something went wrong while flipping. Try a different image.");
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    if (!imgRef.current) return;
    setError("");
    setEdits(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    drawOriginal(imgRef.current);
  }

  const hasImage = !!current;

  const downloadName = (() => {
    const base = (fileName || "image").replace(/\.[^.]+$/, "") || "image";
    return `${base}-rotated.png`;
  })();

  const orientationLabel = (() => {
    const parts = [`${rotation}°`];
    if (flipH) parts.push("flip-H");
    if (flipV) parts.push("flip-V");
    return parts.join(" · ");
  })();

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => document.getElementById("rotate-image-input")?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          (e.preventDefault(), document.getElementById("rotate-image-input")?.click())
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <label className="tool-label" htmlFor="rotate-image-input" style={{ cursor: "pointer" }}>
          Choose an image
        </label>
        <input
          id="rotate-image-input"
          type="file"
          accept="image/*"
          onChange={onInput}
          hidden
        />
        <p className="dropzone-title">Drop an image here, or click to choose</p>
        <p className="dropzone-sub">
          Everything happens in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {previewUrl && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "0.5rem 0 1rem",
            padding: "1rem",
            border: "1px solid rgba(128,128,128,0.25)",
            borderRadius: 10,
            background:
              "repeating-conic-gradient(rgba(128,128,128,0.12) 0% 25%, transparent 0% 50%) 50% / 20px 20px",
            lineHeight: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Live preview of the rotated image"
            style={{
              maxWidth: "100%",
              maxHeight: 340,
              borderRadius: 6,
              display: "block",
              boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      )}

      {hasImage && (
        <>
          <div className="tool-actions">
            <button type="button" className="btn" onClick={() => rotate(-1)} disabled={busy}>
              ⟲ Rotate left 90°
            </button>
            <button type="button" className="btn" onClick={() => rotate(1)} disabled={busy}>
              ⟳ Rotate right 90°
            </button>
            <button type="button" className="btn" onClick={() => flip("h")} disabled={busy}>
              ⇋ Flip horizontal
            </button>
            <button type="button" className="btn" onClick={() => flip("v")} disabled={busy}>
              ⇅ Flip vertical
            </button>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural ? `${natural.w} × ${natural.h}` : "—"}
              </div>
              <div className="tool-stat-label">Original size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {current ? `${current.w} × ${current.h}` : "—"}
              </div>
              <div className="tool-stat-label">Current size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{orientationLabel}</div>
              <div className="tool-stat-label">Orientation</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">PNG size</div>
            </div>
          </div>

          <p className="tool-note">
            Rotations and flips are lossless — pixels are re-mapped, never resampled. The
            download is always a PNG. Original file: {formatBytes(origSize)} · Edits applied:{" "}
            {edits}.
          </p>
        </>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {hasImage && (
        <div className="tool-actions">
          {previewUrl && (
            <a className="btn btn-success" href={previewUrl} download={downloadName}>
              ↓ Download PNG
            </a>
          )}
          <button type="button" className="btn" onClick={resetAll} disabled={busy}>
            Reset to original
          </button>
        </div>
      )}
    </div>
  );
}
