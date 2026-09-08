"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Parse an input to a positive integer within [min, max], falling back safely.
function toCount(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Distribute `total` pixels across `parts` cells as evenly as possible so every
// pixel is used exactly once (early cells get the +1 remainder). Returns an
// array of { start, size } in source-pixel coordinates.
function sliceSpans(total, parts) {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  const spans = [];
  let start = 0;
  for (let i = 0; i < parts; i++) {
    const size = base + (i < remainder ? 1 : 0);
    spans.push({ start, size });
    start += size;
  }
  return spans;
}

export default function SplitImageGrid() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [origSize, setOrigSize] = useState(0);

  const [rows, setRows] = useState("2");
  const [cols, setCols] = useState("2");
  const [format, setFormat] = useState("png");

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const previewUrlRef = useRef("");

  // Revoke the preview object URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    setDone("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF, etc.).");
      return;
    }

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

  function onCountChange(setter) {
    return (e) => {
      setter(e.target.value);
      setDone("");
    };
  }

  const nRows = toCount(rows, 2, 1, 20);
  const nCols = toCount(cols, 2, 1, 20);
  const tileCount = nRows * nCols;

  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const ext = format === "jpg" ? "jpg" : "png";

  // Compute per-cell pixel spans for the current grid, used for both preview and export.
  let colSpans = null;
  let rowSpans = null;
  if (natural) {
    colSpans = sliceSpans(natural.w, nCols);
    rowSpans = sliceSpans(natural.h, nRows);
  }

  async function splitAndDownload() {
    if (!imgRef.current || !natural || !colSpans || !rowSpans) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    setDone("");
    setBusy(true);

    try {
      const zip = new JSZip();
      const base = (fileName.replace(/\.[^.]+$/, "") || "image").replace(/[^\w.-]+/g, "_");
      const pad = String(tileCount).length;

      let index = 0;
      for (let r = 0; r < nRows; r++) {
        const rs = rowSpans[r];
        for (let c = 0; c < nCols; c++) {
          const cs = colSpans[c];
          if (rs.size < 1 || cs.size < 1) continue;

          const canvas = document.createElement("canvas");
          canvas.width = cs.size;
          canvas.height = rs.size;
          const ctx = canvas.getContext("2d");
          if (format === "jpg") {
            // JPEG has no alpha — fill white so transparent areas don't turn black.
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, cs.size, rs.size);
          }
          ctx.drawImage(
            imgRef.current,
            cs.start,
            rs.start,
            cs.size,
            rs.size,
            0,
            0,
            cs.size,
            rs.size
          );

          // eslint-disable-next-line no-await-in-loop
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, mime, format === "jpg" ? 0.92 : undefined)
          );
          if (!blob) continue;

          index++;
          const num = String(index).padStart(pad, "0");
          const rr = String(r + 1).padStart(2, "0");
          const cc = String(c + 1).padStart(2, "0");
          // eslint-disable-next-line no-await-in-loop
          const buf = await blob.arrayBuffer();
          zip.file(`${base}_r${rr}_c${cc}_${num}.${ext}`, buf);
        }
      }

      if (index === 0) {
        setBusy(false);
        setError("Nothing to export — check your rows and columns.");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}-grid-${nRows}x${nCols}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setDone(`Exported ${index} tile${index === 1 ? "" : "s"} to a ZIP (${formatBytes(zipBlob.size)}).`);
      setBusy(false);
    } catch {
      setBusy(false);
      setError("Something went wrong while splitting. Try a smaller grid or a different image.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="sig-file">
          Choose an image
        </label>
        <input
          id="sig-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onFile}
        />
        <p className="tool-note">
          Everything happens in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {previewUrl && natural && (
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
            alt="Preview of the uploaded image with the grid overlay"
            style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8, display: "block" }}
          />
          {/* Grid lines drawn as an overlay, positioned by percentage so they
              scale with the responsively-sized preview. */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {colSpans.slice(1).map((s, i) => (
              <div
                key={`v${i}`}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${(s.start / natural.w) * 100}%`,
                  borderLeft: "2px solid currentColor",
                  opacity: 0.7,
                }}
              />
            ))}
            {rowSpans.slice(1).map((s, i) => (
              <div
                key={`h${i}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${(s.start / natural.h) * 100}%`,
                  borderTop: "2px solid currentColor",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {natural && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sig-rows">
                  Rows
                </label>
                <input
                  id="sig-rows"
                  className="tool-input"
                  type="number"
                  min="1"
                  max="20"
                  inputMode="numeric"
                  value={rows}
                  onChange={onCountChange(setRows)}
                  placeholder="2"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sig-cols">
                  Columns
                </label>
                <input
                  id="sig-cols"
                  className="tool-input"
                  type="number"
                  min="1"
                  max="20"
                  inputMode="numeric"
                  value={cols}
                  onChange={onCountChange(setCols)}
                  placeholder="2"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sig-format">
                  Output format
                </label>
                <select
                  id="sig-format"
                  className="tool-select"
                  value={format}
                  onChange={(e) => {
                    setFormat(e.target.value);
                    setDone("");
                  }}
                >
                  <option value="png">PNG (lossless, keeps transparency)</option>
                  <option value="jpg">JPG (smaller, white background)</option>
                </select>
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
                {nRows} × {nCols}
              </div>
              <div className="tool-stat-label">Grid (rows × cols)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{tileCount}</div>
              <div className="tool-stat-label">Tiles</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {colSpans[0].size} × {rowSpans[0].size}
              </div>
              <div className="tool-stat-label">Tile size (px)</div>
            </div>
          </div>

          <p className="tool-note">
            Pixels are divided as evenly as possible; when a dimension does not divide
            exactly, the leftmost and topmost tiles are 1px larger so no pixels are lost.
          </p>
        </>
      )}

      {!natural && !error && (
        <p className="tool-note">
          Upload an image, then choose how many rows and columns to slice it into. You will
          get every tile in a single ZIP download.
        </p>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {done && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">Done</div>
          <div className="tool-result-value">{done}</div>
        </div>
      )}

      {natural && (
        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={splitAndDownload}
            disabled={busy}
          >
            {busy ? "Splitting…" : `Split & Download ZIP (${tileCount} tiles)`}
          </button>
        </div>
      )}
    </div>
  );
}
