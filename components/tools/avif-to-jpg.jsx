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

function baseName(name) {
  return String(name || "image").replace(/\.[^./\\]+$/, "") || "image";
}

// Draw an image onto a canvas over a solid background (JPG has no transparency)
// and encode as a JPEG blob at the given quality.
function encodeJpg(image, bg, quality) {
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
    // Flatten onto the chosen background so any transparency becomes a solid fill
    // instead of turning black in the JPEG.
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export a JPG from this image."));
          return;
        }
        resolve({ blob, width, height });
      },
      "image/jpeg",
      quality
    );
  });
}

function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "Could not decode this file as an image. Your browser may not support AVIF decoding — try updating it."
        )
      );
    };
    image.src = objectUrl;
  });
}

export default function AvifToJpg() {
  const [items, setItems] = useState([]); // { name, originalSize, outputSize, width, height, url, blob }
  const [quality, setQuality] = useState(92);
  const [bg, setBg] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const urlsRef = useRef([]);
  const filesRef = useRef([]); // keep raw files so quality/bg changes can re-encode

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => revokeAll();
  }, [revokeAll]);

  const convertFiles = useCallback(
    async (files, q, background) => {
      const list = Array.from(files || []).filter(
        (f) => f && (!f.type || f.type.startsWith("image/") || /\.avif$/i.test(f.name || ""))
      );
      if (!list.length) {
        setError("Please choose one or more image files. AVIF is expected; PNG, JPG, WebP also work.");
        return;
      }

      setBusy(true);
      setError("");
      revokeAll();

      const results = [];
      let anyFailed = false;
      for (const file of list) {
        try {
          const { image, objectUrl } = await decodeImage(file);
          try {
            const { blob, width, height } = await encodeJpg(image, background, q / 100);
            const url = URL.createObjectURL(blob);
            urlsRef.current.push(url);
            results.push({
              name: `${baseName(file.name)}.jpg`,
              originalSize: file.size || 0,
              outputSize: blob.size,
              width,
              height,
              url,
              blob,
            });
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        } catch (err) {
          anyFailed = true;
        }
      }

      if (!results.length) {
        setError(
          "None of the selected files could be converted. This browser may not support AVIF decoding — try the latest Chrome, Edge, Firefox, or Safari."
        );
        setItems([]);
      } else {
        if (anyFailed) {
          setError("Some files could not be decoded and were skipped. Converted files are shown below.");
        }
        setItems(results);
      }
      setBusy(false);
    },
    [revokeAll]
  );

  const handleFiles = useCallback(
    (files) => {
      filesRef.current = Array.from(files || []);
      convertFiles(filesRef.current, quality, bg);
    },
    [convertFiles, quality, bg]
  );

  // Re-encode existing files when quality or background changes.
  const reencode = useCallback(
    (q, background) => {
      if (filesRef.current.length) convertFiles(filesRef.current, q, background);
    },
    [convertFiles]
  );

  const onQualityChange = (e) => {
    const q = Number(e.target.value);
    setQuality(q);
  };
  const onQualityCommit = () => reencode(quality, bg);

  const onBgChange = (e) => {
    const v = e.target.value;
    setBg(v);
    reencode(quality, v);
  };

  const onInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length) handleFiles(files);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) handleFiles(files);
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
    if (!items.length) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      items.forEach((it) => zip.file(it.name, it.blob));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "avif-to-jpg.zip";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, [items]);

  const totalOriginal = items.reduce((s, it) => s + it.originalSize, 0);
  const totalOutput = items.reduce((s, it) => s + it.outputSize, 0);
  const diffPct =
    totalOriginal > 0 && totalOutput > 0
      ? Math.round(((totalOutput - totalOriginal) / totalOriginal) * 100)
      : 0;
  const changeLabel = diffPct > 0 ? `+${diffPct}%` : diffPct < 0 ? `${diffPct}%` : "—";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="avif-to-jpg-file">
              AVIF image(s) to convert
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
                {dragging ? "Drop your image(s) here" : "Drag & drop AVIF files, or click to choose"}
              </div>
              <div className="dropzone-sub">
                {items.length ? `${items.length} file(s) converted` : "Select one or many. AVIF, PNG, JPG, and WebP accepted"}
              </div>
            </div>
            <input
              id="avif-to-jpg-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept="image/avif,image/*"
              multiple
              onChange={onInputChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="avif-to-jpg-quality">
              JPG quality: {quality}
            </label>
            <input
              id="avif-to-jpg-quality"
              className="tool-input"
              type="range"
              min="30"
              max="100"
              step="1"
              value={quality}
              onChange={onQualityChange}
              onMouseUp={onQualityCommit}
              onTouchEnd={onQualityCommit}
              onKeyUp={onQualityCommit}
            />
            <p className="tool-note">Higher quality = larger file. 92 is a good balance for photos.</p>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="avif-to-jpg-bg">
              Background (fills any transparency)
            </label>
            <input
              id="avif-to-jpg-bg"
              className="tool-input"
              type="color"
              value={bg}
              onChange={onBgChange}
            />
            <p className="tool-note">JPG can't store transparency, so see-through areas get this color.</p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {items.length ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{items.length}</div>
              <div className="tool-stat-label">Files</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(totalOriginal)}</div>
              <div className="tool-stat-label">Original total</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(totalOutput)}</div>
              <div className="tool-stat-label">JPG total</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{changeLabel}</div>
              <div className="tool-stat-label">Size change</div>
            </div>
          </div>

          <div className="tool-actions">
            {items.length > 1 ? (
              <button type="button" className="btn btn-success" onClick={downloadZip} disabled={busy}>
                Download all as ZIP
              </button>
            ) : (
              <a className="btn btn-success" href={items[0].url} download={items[0].name} role="button">
                Download JPG
              </a>
            )}
            <button type="button" className="btn" onClick={openPicker}>
              Convert more
            </button>
          </div>

          {items.map((it, idx) => (
            <div className="tool-result" role="status" aria-live="polite" key={idx}>
              <div className="tool-result-label">
                {it.name} — {it.width} x {it.height}, {formatBytes(it.outputSize)}
              </div>
              <div className="tool-result-value">
                <div
                  style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(128,128,128,0.35)",
                  }}
                >
                  <img
                    src={it.url}
                    alt={`Converted JPG preview for ${it.name}`}
                    style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                  />
                </div>
              </div>
              {items.length > 1 ? (
                <div className="tool-actions">
                  <a className="btn" href={it.url} download={it.name} role="button">
                    Download this JPG
                  </a>
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      {busy && !items.length ? <p className="tool-note">Converting…</p> : null}

      {!items.length && !busy && !error ? (
        <p className="tool-note">
          Add one or more AVIF images above to convert them to JPG. Everything runs privately in your
          browser — nothing is uploaded.
        </p>
      ) : null}
    </div>
  );
}
