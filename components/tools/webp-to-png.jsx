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

// Small checkerboard so any transparency in the PNG is visible in the preview.
const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' width='10' height='10' fill='%23ffffff'/%3E%3Crect y='10' width='10' height='10' fill='%23ffffff'/%3E%3C/svg%3E\")";

export default function WebpToPng() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [outputSize, setOutputSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [outputUrl, setOutputUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const outputUrlRef = useRef("");

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeOutput();
    };
  }, [revokeOutput]);

  const encode = useCallback((image) => {
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
      // Draw directly with no background fill so the WebP's transparency is
      // carried through into the lossless PNG output.
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not export a PNG from this image."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }, []);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please choose an image file. WebP is expected, but PNG, JPG, GIF, and BMP also work.");
        return;
      }

      revokeOutput();
      setOutputUrl("");
      setOutputSize(0);
      setDimensions(null);
      setError("");
      setFileName(file.name || "image");
      setOriginalSize(file.size || 0);
      setBusy(true);

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = async () => {
        try {
          const blob = await encode(image);
          revokeOutput();
          const url = URL.createObjectURL(blob);
          outputUrlRef.current = url;
          setOutputUrl(url);
          setOutputSize(blob.size);
          setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
          setError("");
        } catch (err) {
          revokeOutput();
          setOutputUrl("");
          setOutputSize(0);
          setError(err && err.message ? err.message : "Something went wrong while converting.");
        } finally {
          URL.revokeObjectURL(objectUrl);
          setBusy(false);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setBusy(false);
        setError("This file could not be read as an image. It may be corrupt or an unsupported format.");
      };
      image.src = objectUrl;
    },
    [encode, revokeOutput]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    // Allow re-selecting the same file.
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    if (!dragging) setDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const openPicker = () => {
    if (inputRef.current) inputRef.current.click();
  };

  const onDropzoneKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const downloadName = () => {
    const base = (fileName || "image").replace(/\.[^./\\]+$/, "");
    return `${base || "image"}.png`;
  };

  // PNG is lossless and often larger than a compressed WebP source; report the
  // change honestly in either direction.
  const diffPct =
    originalSize > 0 && outputSize > 0
      ? Math.round(((outputSize - originalSize) / originalSize) * 100)
      : 0;
  const changeLabel = diffPct > 0 ? `+${diffPct}%` : diffPct < 0 ? `${diffPct}%` : "—";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="webp-to-png-file">
              WebP image to convert
            </label>
            <div
              className="dropzone"
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={onDropzoneKeyDown}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              style={
                dragging
                  ? { borderColor: "currentColor", outline: "2px dashed currentColor", outlineOffset: "2px" }
                  : undefined
              }
            >
              <div className="dropzone-title">
                {dragging ? "Drop your image here" : "Drag & drop a WebP, or click to choose"}
              </div>
              <div className="dropzone-sub">
                {fileName ? fileName : "WebP, PNG, JPG, GIF, and BMP are all accepted"}
              </div>
            </div>
            <input
              id="webp-to-png-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept="image/*"
              onChange={onInputChange}
              style={{ display: "none" }}
            />
            <p className="tool-note">
              Your WebP is converted to a lossless PNG. Any transparency is preserved.
            </p>
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
              <div className="tool-stat-label">PNG output</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{changeLabel}</div>
              <div className="tool-stat-label">Size change</div>
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
                  backgroundColor: "#ffffff",
                  backgroundImage: CHECKER,
                }}
              >
                <img
                  src={outputUrl}
                  alt="Converted PNG preview"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={outputUrl} download={downloadName()} role="button">
              Download PNG
            </a>
            <button type="button" className="btn" onClick={openPicker}>
              Convert another
            </button>
          </div>
        </>
      ) : null}

      {busy && !error ? <p className="tool-note">Converting…</p> : null}

      {!outputUrl && !busy && !error ? (
        <p className="tool-note">
          Add a WebP image above to convert it to a PNG. Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
