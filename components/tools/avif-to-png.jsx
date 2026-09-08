"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

// Checkerboard so any transparency in the PNG output is visible in the preview.
const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' width='10' height='10' fill='%23ffffff'/%3E%3Crect y='10' width='10' height='10' fill='%23ffffff'/%3E%3C/svg%3E\")";

function pngName(name) {
  const base = (name || "image").replace(/\.[^./\\]+$/, "");
  return `${base || "image"}.png`;
}

// Decode one image file and re-encode it to a lossless PNG blob using canvas.
function convertFile(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) {
        URL.revokeObjectURL(objectUrl);
        resolve({ ok: false, name: file.name, error: "No readable dimensions." });
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve({ ok: false, name: file.name, error: "No canvas context in this browser." });
        return;
      }
      // Draw with no background fill so any transparency carries into the PNG.
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          resolve({ ok: false, name: file.name, error: "Could not export a PNG." });
          return;
        }
        resolve({
          ok: true,
          name: file.name,
          outName: pngName(file.name),
          originalSize: file.size || 0,
          outputSize: blob.size,
          width,
          height,
          blob,
          url: URL.createObjectURL(blob),
        });
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        ok: false,
        name: file.name,
        error: "This browser could not decode this file as an image.",
      });
    };
    image.src = objectUrl;
  });
}

export default function AvifToPng() {
  const [results, setResults] = useState([]);
  const [failures, setFailures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const urlsRef = useRef([]);

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {
        /* ignore */
      }
    });
    urlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, [revokeAll]);

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      revokeAll();
      setResults([]);
      setFailures([]);
      setError("");
      setBusy(true);

      const okResults = [];
      const failResults = [];
      for (const file of files) {
        const r = await convertFile(file);
        if (r.ok) {
          urlsRef.current.push(r.url);
          okResults.push(r);
        } else {
          failResults.push(r);
        }
      }

      setResults(okResults);
      setFailures(failResults);
      setBusy(false);
      if (okResults.length === 0 && failResults.length > 0) {
        setError(
          "None of these files could be decoded. AVIF decoding needs an up-to-date browser (Chrome, Edge, Firefox, or Safari 16+)."
        );
      }
    },
    [revokeAll]
  );

  const onInputChange = (e) => {
    const files = e.target.files;
    handleFiles(files);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer && e.dataTransfer.files;
    handleFiles(files);
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

  const downloadZip = useCallback(async () => {
    if (results.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const used = {};
      results.forEach((r) => {
        let name = r.outName;
        // Avoid name collisions inside the zip.
        if (used[name]) {
          const dot = name.lastIndexOf(".");
          const base = dot >= 0 ? name.slice(0, dot) : name;
          const ext = dot >= 0 ? name.slice(dot) : "";
          name = `${base}-${used[r.outName]}${ext}`;
        }
        used[r.outName] = (used[r.outName] || 0) + 1;
        zip.file(name, r.blob);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "avif-to-png.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Could not build the ZIP file in this browser.");
    } finally {
      setZipping(false);
    }
  }, [results]);

  const totalIn = results.reduce((s, r) => s + (r.originalSize || 0), 0);
  const totalOut = results.reduce((s, r) => s + (r.outputSize || 0), 0);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="avif-to-png-file">
              AVIF images to convert
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
                {dragging ? "Drop your images here" : "Drag & drop AVIF files, or click to choose"}
              </div>
              <div className="dropzone-sub">
                {results.length || failures.length
                  ? `${results.length} converted${failures.length ? `, ${failures.length} failed` : ""}`
                  : "Convert one file or a whole batch at once"}
              </div>
            </div>
            <input
              id="avif-to-png-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept="image/avif,.avif,image/*"
              multiple
              onChange={onInputChange}
              style={{ display: "none" }}
            />
            <p className="tool-note">
              Each AVIF is decoded by your browser and re-saved as a lossless PNG. Transparency is
              preserved. Everything runs on your device — no files are uploaded.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {busy ? <p className="tool-note">Converting…</p> : null}

      {results.length > 0 && !busy ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{results.length}</div>
              <div className="tool-stat-label">PNGs ready</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(totalIn)}</div>
              <div className="tool-stat-label">AVIF in</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(totalOut)}</div>
              <div className="tool-stat-label">PNG out</div>
            </div>
          </div>

          {results.length > 1 ? (
            <div className="tool-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={downloadZip}
                disabled={zipping}
              >
                {zipping ? "Zipping…" : `Download all ${results.length} as ZIP`}
              </button>
              <button type="button" className="btn" onClick={openPicker}>
                Convert more
              </button>
            </div>
          ) : null}

          {results.map((r, i) => (
            <div className="tool-result" role="status" aria-live="polite" key={i}>
              <div className="tool-result-label">
                {r.outName} · {r.width} x {r.height} · {formatBytes(r.outputSize)}
              </div>
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
                    src={r.url}
                    alt={`Converted PNG preview for ${r.name}`}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "260px",
                      height: "auto",
                      width: "auto",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
              <div className="tool-actions">
                <a className="btn btn-success" href={r.url} download={r.outName} role="button">
                  Download PNG
                </a>
              </div>
            </div>
          ))}

          {results.length === 1 ? (
            <div className="tool-actions">
              <button type="button" className="btn" onClick={openPicker}>
                Convert another
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {failures.length > 0 && !busy ? (
        <p className="tool-note">
          Could not convert: {failures.map((f) => f.name).join(", ")}. These may be corrupt, or your
          browser may not support AVIF decoding.
        </p>
      ) : null}

      {results.length === 0 && failures.length === 0 && !busy && !error ? (
        <p className="tool-note">
          Add one or more AVIF images above to convert them to PNG. You can select a whole folder of
          files at once.
        </p>
      ) : null}
    </div>
  );
}
