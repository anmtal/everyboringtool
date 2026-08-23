"use client";

import { useState, useRef, useCallback, useEffect } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

export default function PngToJpg() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [outputSize, setOutputSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [quality, setQuality] = useState(92);
  const [outputUrl, setOutputUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null);
  const previewUrlRef = useRef("");
  const outputUrlRef = useRef("");

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }, []);

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePreview();
      revokeOutput();
    };
  }, [revokePreview, revokeOutput]);

  const encode = useCallback((image, q) => {
    return new Promise((resolve, reject) => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) {
        reject(new Error("This image has no readable dimensions."));
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get a drawing context in this browser."));
        return;
      }
      // JPEG has no transparency, so paint a white background first.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not export a JPEG from this image."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        Math.min(Math.max(q, 1), 100) / 100
      );
    });
  }, []);

  const runEncode = useCallback(
    async (image, q) => {
      setBusy(true);
      try {
        const blob = await encode(image, q);
        revokeOutput();
        const url = URL.createObjectURL(blob);
        outputUrlRef.current = url;
        setOutputUrl(url);
        setOutputSize(blob.size);
        setError("");
      } catch (err) {
        revokeOutput();
        setOutputUrl("");
        setOutputSize(0);
        setError(err && err.message ? err.message : "Something went wrong while converting.");
      } finally {
        setBusy(false);
      }
    },
    [encode, revokeOutput]
  );

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, WebP, GIF, BMP, or similar).");
        return;
      }

      revokePreview();
      revokeOutput();
      setOutputUrl("");
      setOutputSize(0);
      setDimensions(null);
      setError("");
      imgRef.current = null;

      setFileName(file.name || "image");
      setOriginalSize(file.size || 0);

      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);

      const image = new Image();
      image.onload = () => {
        imgRef.current = image;
        setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
        runEncode(image, quality);
      };
      image.onerror = () => {
        imgRef.current = null;
        setError("This file could not be read as an image. It may be corrupt or unsupported.");
      };
      image.src = objectUrl;
    },
    [quality, revokePreview, revokeOutput, runEncode]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    // Allow re-selecting the same file.
    e.target.value = "";
  };

  const onQualityChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    const q = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 100) : 92;
    setQuality(q);
    if (imgRef.current) {
      runEncode(imgRef.current, q);
    }
  };

  const downloadName = () => {
    const base = (fileName || "image").replace(/\.[^./\\]+$/, "");
    return `${base || "image"}.jpg`;
  };

  const savings =
    originalSize > 0 && outputSize > 0
      ? Math.round(((originalSize - outputSize) / originalSize) * 100)
      : 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="png-to-jpg-file">
              Image to convert
            </label>
            <input
              id="png-to-jpg-file"
              className="tool-input"
              type="file"
              accept="image/*"
              onChange={onInputChange}
            />
            <p className="tool-note">
              PNG, WebP, GIF, BMP, and other images are converted to JPEG. Transparent areas become
              white.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="png-to-jpg-quality">
              JPEG quality: {quality}%
            </label>
            <input
              id="png-to-jpg-quality"
              className="tool-input"
              type="range"
              min="1"
              max="100"
              step="1"
              value={quality}
              onChange={onQualityChange}
            />
            <p className="tool-note">Higher quality means a larger file. 92% is a good default.</p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {outputUrl && !error ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(originalSize)}</div>
              <div className="tool-stat-label">Original</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(outputSize)}</div>
              <div className="tool-stat-label">JPEG output</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{savings > 0 ? `${savings}%` : "—"}</div>
              <div className="tool-stat-label">Smaller</div>
            </div>
            {dimensions ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {dimensions.width} x {dimensions.height}
                </div>
                <div className="tool-stat-label">Pixels</div>
              </div>
            ) : null}
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Preview</div>
            <div className="tool-result-value">
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(128,128,128,0.35)",
                  background: "#ffffff",
                }}
              >
                <img
                  src={outputUrl}
                  alt="Converted JPEG preview"
                  style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                />
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <a
              className="btn btn-success"
              href={outputUrl}
              download={downloadName()}
              role="button"
            >
              Download JPEG
            </a>
          </div>
        </>
      ) : null}

      {busy && !error ? <p className="tool-note">Converting…</p> : null}

      {!outputUrl && !busy && !error ? (
        <p className="tool-note">
          Choose an image above to convert it to a JPEG. Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
