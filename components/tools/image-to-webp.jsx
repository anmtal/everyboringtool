"use client";

import { useState, useRef, useEffect, useCallback } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return value.toFixed(value >= 10 ? 1 : 2) + " " + units[i];
}

export default function ImageToWebp() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [outputSize, setOutputSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [quality, setQuality] = useState(0.8);
  const [previewUrl, setPreviewUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const downloadUrlRef = useRef("");
  const qualityTimerRef = useRef(null);

  // Keep a ref of the current object URL so we can revoke it reliably.
  useEffect(() => {
    downloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
      if (qualityTimerRef.current) {
        clearTimeout(qualityTimerRef.current);
      }
    };
  }, []);

  const baseName = fileName
    ? fileName.replace(/\.[^./\\]+$/, "") || "image"
    : "image";

  const encode = useCallback((img, q) => {
    if (!img) return;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) {
      setError("Could not read the image dimensions.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Canvas is not supported in this browser.");
        setBusy(false);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError(
              "WebP export failed. This browser may not support WebP encoding."
            );
            setBusy(false);
            return;
          }
          // Browsers that can't encode WebP silently hand back a PNG instead —
          // don't let that get saved under a .webp name.
          if (blob.type !== "image/webp") {
            setError(
              "This browser can't encode WebP (Safari/iOS). Try Chrome, Firefox or Edge."
            );
            setBusy(false);
            return;
          }
          setOutputSize(blob.size);
          setDownloadUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
          setBusy(false);
        },
        "image/webp",
        q
      );
    } catch (err) {
      setError("Something went wrong while converting the image.");
      setBusy(false);
    }
  }, []);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, JPG, GIF, etc.).");
        return;
      }

      setError("");
      setFileName(file.name || "image");
      setOriginalSize(file.size || 0);
      setOutputSize(0);
      setDimensions(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target && e.target.result;
        if (!src) {
          setError("Could not read the selected file.");
          return;
        }
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
          setPreviewUrl(String(src));
          encode(img, quality);
        };
        img.onerror = () => {
          setError("That file could not be loaded as an image.");
        };
        img.src = String(src);
      };
      reader.onerror = () => {
        setError("Could not read the selected file.");
      };
      reader.readAsDataURL(file);
    },
    [encode, quality]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    // Allow re-selecting the same file later.
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  };

  const onQualityChange = (e) => {
    const raw = parseFloat(e.target.value);
    const q = Number.isFinite(raw) ? Math.min(1, Math.max(0.1, raw)) : 0.8;
    // The label updates immediately; the (expensive) re-encode is debounced so
    // dragging the slider doesn't queue up one encode per step.
    setQuality(q);
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    qualityTimerRef.current = setTimeout(() => {
      qualityTimerRef.current = null;
      if (imageRef.current) {
        encode(imageRef.current, q);
      }
    }, 150);
  };

  const percentSaved =
    originalSize > 0 && outputSize > 0
      ? ((originalSize - outputSize) / originalSize) * 100
      : 0;

  const hasResult = outputSize > 0 && !!downloadUrl;

  return (
    <div className="tool">
      <div
        className="dropzone"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current && fileInputRef.current.click();
          }
        }}
        style={
          dragActive
            ? { outline: "2px dashed currentColor", outlineOffset: "2px" }
            : undefined
        }
      >
        <div className="dropzone-title">
          {fileName ? fileName : "Drop an image here or click to browse"}
        </div>
        <div className="dropzone-sub">
          PNG, JPG, GIF, BMP, or WebP - converts to WebP right in your browser
        </div>
      </div>

      <label className="tool-label" htmlFor="itw-file" style={{ display: "none" }}>
        Choose image file
      </label>
      <input
        id="itw-file"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: "none" }}
      />

      {error ? <div className="tool-error">{error}</div> : null}

      {previewUrl ? (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="itw-quality">
                Quality: {Math.round(quality * 100)}%
              </label>
              <input
                id="itw-quality"
                className="tool-input"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={onQualityChange}
              />
              <div className="tool-note">
                Lower quality means a smaller file. 80% is a good balance for
                most photos.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0.5rem 0",
            }}
          >
            <img
              src={previewUrl}
              alt="Preview of the uploaded image"
              style={{
                maxWidth: "100%",
                maxHeight: "320px",
                borderRadius: "8px",
                border: "1px solid rgba(128,128,128,0.35)",
              }}
            />
          </div>
        </div>
      ) : null}

      {hasResult ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{formatBytes(originalSize)}</div>
            <div className="tool-stat-label">Original</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{formatBytes(outputSize)}</div>
            <div className="tool-stat-label">WebP output</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {Math.abs(Math.round(percentSaved)) + "%"}
            </div>
            <div className="tool-stat-label">
              {percentSaved >= 0 ? "Smaller" : "Larger"}
            </div>
          </div>
        </div>
      ) : null}

      {dimensions ? (
        <div className="tool-result" role="status" aria-live="polite">
          <span className="tool-result-label">Dimensions</span>
          <span className="tool-result-value">
            {dimensions.w} x {dimensions.h} px
          </span>
        </div>
      ) : null}

      {busy ? <div className="tool-note">Converting...</div> : null}

      <div className="tool-actions">
        <a
          className="btn btn-success"
          href={hasResult ? downloadUrl : undefined}
          download={hasResult ? baseName + ".webp" : undefined}
          aria-disabled={!hasResult}
          onClick={(e) => {
            if (!hasResult) e.preventDefault();
          }}
          style={
            !hasResult
              ? { opacity: 0.5, pointerEvents: "none" }
              : undefined
          }
        >
          Download .webp
        </a>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
            if (qualityTimerRef.current) {
              clearTimeout(qualityTimerRef.current);
              qualityTimerRef.current = null;
            }
            imageRef.current = null;
            setFileName("");
            setOriginalSize(0);
            setOutputSize(0);
            setDimensions(null);
            setQuality(0.8);
            setPreviewUrl("");
            setDownloadUrl("");
            setError("");
            setBusy(false);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
