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

// Checkerboard so any transparency carried into the PNG is visible in previews.
const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' width='10' height='10' fill='%23ffffff'/%3E%3Crect y='10' width='10' height='10' fill='%23ffffff'/%3E%3C/svg%3E\")";

// Decode common uncompressed BMP files (24-bit and 32-bit BGR/BGRA, bottom-up
// or top-down) by hand. This is a fallback for the rare browsers that will not
// decode a BMP through an <img> element. Returns ImageData or null if this
// decoder does not understand the file (compressed, palettized, etc.).
function decodeBmpManually(buffer) {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 54) return null;
    // "BM" signature
    if (view.getUint8(0) !== 0x42 || view.getUint8(1) !== 0x4d) return null;
    const pixelOffset = view.getUint32(10, true);
    const headerSize = view.getUint32(14, true);
    if (headerSize < 40) return null; // only BITMAPINFOHEADER and later
    const width = view.getInt32(18, true);
    let height = view.getInt32(22, true);
    const bpp = view.getUint16(28, true);
    const compression = view.getUint32(30, true);
    if (compression !== 0) return null; // BI_RGB only
    if (bpp !== 24 && bpp !== 32) return null;
    if (!width || !height) return null;

    const topDown = height < 0;
    height = Math.abs(height);
    if (width < 0 || width > 20000 || height > 20000) return null;

    const bytesPerPixel = bpp / 8;
    const rowSize = Math.floor((bpp * width + 31) / 32) * 4; // padded to 4 bytes
    const bytes = new Uint8Array(buffer);
    if (pixelOffset + rowSize * height > bytes.length) return null;

    const out = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const srcRow = topDown ? y : height - 1 - y;
      let src = pixelOffset + srcRow * rowSize;
      let dst = y * width * 4;
      for (let x = 0; x < width; x++) {
        const b = bytes[src];
        const g = bytes[src + 1];
        const r = bytes[src + 2];
        const a = bpp === 32 ? bytes[src + 3] : 255;
        out[dst] = r;
        out[dst + 1] = g;
        out[dst + 2] = b;
        // 32-bit BMPs often store 0 in the alpha byte even when opaque; treat an
        // all-zero alpha plane as fully opaque to avoid an invisible result.
        out[dst + 3] = a;
        src += bytesPerPixel;
        dst += 4;
      }
    }

    // If a 32-bit image had every alpha byte at 0, it is almost certainly meant
    // to be opaque rather than fully transparent.
    if (bpp === 32) {
      let anyAlpha = false;
      for (let i = 3; i < out.length; i += 4) {
        if (out[i] !== 0) {
          anyAlpha = true;
          break;
        }
      }
      if (!anyAlpha) {
        for (let i = 3; i < out.length; i += 4) out[i] = 255;
      }
    }

    return new ImageData(out, width, height);
  } catch {
    return null;
  }
}

let uid = 0;

export default function BmpToPng() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => {
        if (it.url) URL.revokeObjectURL(it.url);
      });
    };
  }, []);

  const canvasToPng = useCallback((source, width, height) => {
    return new Promise((resolve, reject) => {
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
      if (source instanceof ImageData) {
        ctx.putImageData(source, 0, 0);
      } else {
        ctx.drawImage(source, 0, 0, width, height);
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not export a PNG from this image."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }, []);

  // Convert one file to a PNG blob, trying the browser's native BMP decoder
  // first and falling back to the manual decoder for uncompressed BMPs.
  const convertFile = useCallback(
    (file) => {
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = async () => {
          try {
            const blob = await canvasToPng(image, image.naturalWidth, image.naturalHeight);
            resolve({ blob, width: image.naturalWidth, height: image.naturalHeight });
          } catch (err) {
            reject(err);
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        };
        image.onerror = async () => {
          URL.revokeObjectURL(objectUrl);
          // Native decode failed — try to parse the BMP ourselves.
          try {
            const buffer = await file.arrayBuffer();
            const imageData = decodeBmpManually(buffer);
            if (!imageData) {
              reject(
                new Error(
                  "This BMP uses a variant this browser cannot decode (it may be RLE-compressed or palettized)."
                )
              );
              return;
            }
            const blob = await canvasToPng(imageData, imageData.width, imageData.height);
            resolve({ blob, width: imageData.width, height: imageData.height });
          } catch (err) {
            reject(err && err.message ? err : new Error("This file could not be read as a BMP image."));
          }
        };
        image.src = objectUrl;
      });
    },
    [canvasToPng]
  );

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      // Clean up any previous run.
      itemsRef.current.forEach((it) => {
        if (it.url) URL.revokeObjectURL(it.url);
      });
      setItems([]);
      setError("");
      setBusy(true);

      const results = [];
      let hadError = false;

      for (const file of files) {
        const isBmp =
          (file.type && (file.type === "image/bmp" || file.type === "image/x-ms-bmp")) ||
          /\.(bmp|dib)$/i.test(file.name || "");
        if (!isBmp && !(file.type && file.type.startsWith("image/"))) {
          results.push({
            id: ++uid,
            name: file.name || "image",
            originalSize: file.size || 0,
            error: "Not an image file — skipped.",
          });
          hadError = true;
          continue;
        }
        try {
          const { blob, width, height } = await convertFile(file);
          const url = URL.createObjectURL(blob);
          results.push({
            id: ++uid,
            name: file.name || "image",
            originalSize: file.size || 0,
            outputSize: blob.size,
            width,
            height,
            url,
          });
        } catch (err) {
          results.push({
            id: ++uid,
            name: file.name || "image",
            originalSize: file.size || 0,
            error: err && err.message ? err.message : "Could not convert this file.",
          });
          hadError = true;
        }
      }

      setItems(results);
      setBusy(false);
      if (hadError && results.every((r) => r.error)) {
        setError("None of the selected files could be converted.");
      }
    },
    [convertFile]
  );

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer && e.dataTransfer.files);
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

  const pngName = (name) => {
    const base = (name || "image").replace(/\.[^./\\]+$/, "");
    return `${base || "image"}.png`;
  };

  const downloadOne = (item) => {
    if (!item.url) return;
    const a = document.createElement("a");
    a.href = item.url;
    a.download = pngName(item.name);
    a.click();
  };

  const downloadAll = () => {
    const ok = items.filter((it) => it.url);
    ok.forEach((it, i) => {
      // Stagger slightly so browsers do not drop rapid-fire downloads.
      setTimeout(() => downloadOne(it), i * 250);
    });
  };

  const converted = items.filter((it) => it.url);
  const failed = items.filter((it) => it.error);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bmp-to-png-file">
              BMP image(s) to convert
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
                {dragging ? "Drop your BMP files here" : "Drag & drop BMP files, or click to choose"}
              </div>
              <div className="dropzone-sub">
                {converted.length || failed.length
                  ? `${items.length} file${items.length === 1 ? "" : "s"} selected`
                  : "Select one or many .bmp files at once"}
              </div>
            </div>
            <input
              id="bmp-to-png-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept=".bmp,.dib,image/bmp,image/x-ms-bmp"
              multiple
              onChange={onInputChange}
              style={{ display: "none" }}
            />
            <p className="tool-note">
              Each BMP is redrawn and re-encoded as a lossless PNG. 32-bit BMPs keep their transparency.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {busy ? <p className="tool-note">Converting…</p> : null}

      {converted.length > 0 ? (
        <>
          <div className="tool-actions">
            {converted.length > 1 ? (
              <button type="button" className="btn btn-success" onClick={downloadAll}>
                Download all {converted.length} PNGs
              </button>
            ) : null}
            <button type="button" className="btn" onClick={openPicker}>
              Convert more
            </button>
          </div>

          <div role="status" aria-live="polite">
            {converted.map((item) => (
              <div className="tool-result" key={item.id}>
                <div className="tool-result-label">{pngName(item.name)}</div>
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
                      src={item.url}
                      alt={`Converted PNG preview of ${item.name}`}
                      style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                    />
                  </div>
                </div>
                <div className="tool-stat-grid">
                  <div className="tool-stat">
                    <div className="tool-stat-num">{formatBytes(item.originalSize)}</div>
                    <div className="tool-stat-label">BMP</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">{formatBytes(item.outputSize)}</div>
                    <div className="tool-stat-label">PNG</div>
                  </div>
                  {item.width ? (
                    <div className="tool-stat">
                      <div className="tool-stat-num">
                        {item.width} x {item.height}
                      </div>
                      <div className="tool-stat-label">Pixels</div>
                    </div>
                  ) : null}
                </div>
                <div className="tool-actions">
                  <button type="button" className="btn btn-success" onClick={() => downloadOne(item)}>
                    Download PNG
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {failed.length > 0 ? (
        <div className="tool-note">
          {failed.map((item) => (
            <div key={item.id}>
              {item.name}: {item.error}
            </div>
          ))}
        </div>
      ) : null}

      {!busy && items.length === 0 && !error ? (
        <p className="tool-note">
          Add one or more BMP images above to convert them to PNG. Everything runs in your browser — files are
          never uploaded.
        </p>
      ) : null}
    </div>
  );
}
