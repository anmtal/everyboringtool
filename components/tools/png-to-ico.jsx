"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const SIZE_OPTIONS = [16, 24, 32, 48, 64, 128, 256];
const DEFAULT_SIZES = [16, 32, 48, 256];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

// Render the source image into a square canvas of the given size and return PNG bytes.
function renderPngBytes(image, size) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get a drawing context in this browser."));
      return;
    }
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fit the source into the square while preserving aspect ratio (contain).
    const sw = image.naturalWidth;
    const sh = image.naturalHeight;
    const scale = Math.min(size / sw, size / sh);
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));
    const dx = Math.round((size - dw) / 2);
    const dy = Math.round((size - dh) / 2);
    ctx.drawImage(image, 0, 0, sw, sh, dx, dy, dw, dh);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not render an icon layer from this image."));
          return;
        }
        blob.arrayBuffer().then(
          (buf) => resolve(new Uint8Array(buf)),
          () => reject(new Error("Could not read the rendered icon layer."))
        );
      },
      "image/png"
    );
  });
}

// Assemble an .ico file that embeds one PNG per size (Vista+ / modern browser format).
function buildIco(entries) {
  const count = entries.length;
  const headerSize = 6;
  const dirSize = 16 * count;
  let offset = headerSize + dirSize;

  const totalDataSize = entries.reduce((sum, e) => sum + e.bytes.length, 0);
  const total = headerSize + dirSize + totalDataSize;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  // ICONDIR
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type = icon
  view.setUint16(4, count, true); // number of images

  let dirPos = headerSize;
  for (const e of entries) {
    const dim = e.size >= 256 ? 0 : e.size; // 256 is stored as 0
    out[dirPos] = dim; // width
    out[dirPos + 1] = dim; // height
    out[dirPos + 2] = 0; // color palette count
    out[dirPos + 3] = 0; // reserved
    view.setUint16(dirPos + 4, 1, true); // color planes
    view.setUint16(dirPos + 6, 32, true); // bits per pixel
    view.setUint32(dirPos + 8, e.bytes.length, true); // size of image data
    view.setUint32(dirPos + 12, offset, true); // offset of image data

    out.set(e.bytes, offset);
    offset += e.bytes.length;
    dirPos += 16;
  }

  return new Blob([out], { type: "image/x-icon" });
}

export default function PngToIco() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [outputUrl, setOutputUrl] = useState("");
  const [outputSize, setOutputSize] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");

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

  const runBuild = useCallback(
    async (image, chosen, srcW, srcH) => {
      const list = SIZE_OPTIONS.filter((s) => chosen.includes(s));
      if (list.length === 0) {
        revokeOutput();
        setOutputUrl("");
        setOutputSize(0);
        setError("Select at least one icon size.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const entries = [];
        for (const size of list) {
          const bytes = await renderPngBytes(image, size);
          entries.push({ size, bytes });
        }
        const blob = buildIco(entries);
        revokeOutput();
        const url = URL.createObjectURL(blob);
        outputUrlRef.current = url;
        setOutputUrl(url);
        setOutputSize(blob.size);

        const biggest = list[list.length - 1];
        if (srcW && srcH && Math.min(srcW, srcH) < biggest) {
          setWarn(
            `Your source image is ${srcW}x${srcH}px. Sizes larger than that were scaled up and may look soft. For crisp icons, start from at least a ${biggest}x${biggest}px square PNG.`
          );
        } else {
          setWarn("");
        }
      } catch (err) {
        revokeOutput();
        setOutputUrl("");
        setOutputSize(0);
        setError(err && err.message ? err.message : "Something went wrong while building the icon.");
      } finally {
        setBusy(false);
      }
    },
    [revokeOutput]
  );

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, JPG, WebP, or similar).");
        return;
      }

      revokePreview();
      revokeOutput();
      setOutputUrl("");
      setOutputSize(0);
      setDimensions(null);
      setError("");
      setWarn("");
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
        runBuild(image, sizes, image.naturalWidth, image.naturalHeight);
      };
      image.onerror = () => {
        imgRef.current = null;
        setError("This file could not be read as an image. It may be corrupt or unsupported.");
      };
      image.src = objectUrl;
    },
    [sizes, revokePreview, revokeOutput, runBuild]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    e.target.value = "";
  };

  const toggleSize = (size) => {
    const next = sizes.includes(size)
      ? sizes.filter((s) => s !== size)
      : [...sizes, size].sort((a, b) => a - b);
    setSizes(next);
    if (imgRef.current && dimensions) {
      runBuild(imgRef.current, next, dimensions.width, dimensions.height);
    }
  };

  const downloadName = () => {
    const base = (fileName || "favicon").replace(/\.[^./\\]+$/, "");
    return `${base || "favicon"}.ico`;
  };

  const isSquare = dimensions && dimensions.width === dimensions.height;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="png-to-ico-file">
              Image to convert to .ico
            </label>
            <input
              id="png-to-ico-file"
              className="tool-input"
              type="file"
              accept="image/*"
              onChange={onInputChange}
            />
            <p className="tool-note">
              PNG, JPG, or WebP. For the sharpest favicon, use a square PNG that is at least
              256x256px.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <span className="tool-label">Icon sizes to include</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "4px" }}>
              {SIZE_OPTIONS.map((size) => {
                const id = `png-to-ico-size-${size}`;
                return (
                  <label
                    key={size}
                    htmlFor={id}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={sizes.includes(size)}
                      onChange={() => toggleSize(size)}
                    />
                    {size}px
                  </label>
                );
              })}
            </div>
            <p className="tool-note">
              A .ico can hold several sizes at once so Windows and browsers pick the right one. 16,
              32, 48 and 256 is a solid favicon set.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {dimensions && !isSquare && !error ? (
        <p className="tool-note">
          Heads up: your image is {dimensions.width}x{dimensions.height} (not square). It was fit
          inside each square icon with transparent padding so nothing gets stretched.
        </p>
      ) : null}

      {outputUrl && !error ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{sizes.length}</div>
              <div className="tool-stat-label">Sizes packed</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(outputSize)}</div>
              <div className="tool-stat-label">.ico size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(originalSize)}</div>
              <div className="tool-stat-label">Original</div>
            </div>
            {dimensions ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {dimensions.width} x {dimensions.height}
                </div>
                <div className="tool-stat-label">Source pixels</div>
              </div>
            ) : null}
          </div>

          {warn ? <p className="tool-note">{warn}</p> : null}

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Preview (from your source image)</div>
            <div className="tool-result-value">
              <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
                {[16, 32, 48].map((s) => (
                  <div key={s} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: `${s}px`,
                        height: `${s}px`,
                        margin: "0 auto",
                        border: "1px solid rgba(128,128,128,0.35)",
                        borderRadius: "4px",
                        backgroundImage:
                          "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
                        backgroundSize: "8px 8px",
                        backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
                      }}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={`${s} pixel icon preview`}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : null}
                    </div>
                    <div className="tool-stat-label" style={{ marginTop: "4px" }}>
                      {s}px
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={outputUrl} download={downloadName()} role="button">
              Download .ico
            </a>
          </div>
        </>
      ) : null}

      {busy && !error ? <p className="tool-note">Building your icon…</p> : null}

      {!outputUrl && !busy && !error ? (
        <p className="tool-note">
          Choose an image above to turn it into a multi-size .ico favicon. Everything runs in your
          browser — nothing is uploaded.
        </p>
      ) : null}
    </div>
  );
}
