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

// Checkerboard so transparency in the PNG output is visible in previews.
const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' width='10' height='10' fill='%23ffffff'/%3E%3Crect y='10' width='10' height='10' fill='%23ffffff'/%3E%3C/svg%3E\")";

// --- GIF decoding (self-contained, no external libraries) -----------------
// Standard GIF87a/89a LZW decoder. Returns raw index rows for a frame.
function lzwDecode(minCodeSize, data, pixelCount) {
  const MAX = 4096;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const prefix = new Int32Array(MAX);
  const suffix = new Int32Array(MAX);
  const pixelStack = new Uint8Array(MAX + 1);
  const output = new Uint8Array(pixelCount);

  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;
  let available = clearCode + 2;

  for (let i = 0; i < clearCode; i++) {
    prefix[i] = 0;
    suffix[i] = i;
  }

  let datum = 0;
  let bits = 0;
  let first = 0;
  let top = 0;
  let oldCode = -1;
  let dataIdx = 0;
  let outIdx = 0;
  let i = 0;

  while (i < pixelCount) {
    if (top === 0) {
      if (bits < codeSize) {
        if (dataIdx >= data.length) break;
        datum += data[dataIdx] << bits;
        bits += 8;
        dataIdx++;
        continue;
      }
      let code = datum & codeMask;
      datum >>= codeSize;
      bits -= codeSize;

      if (code > available || code === eoiCode) break;
      if (code === clearCode) {
        codeSize = minCodeSize + 1;
        codeMask = (1 << codeSize) - 1;
        available = clearCode + 2;
        oldCode = -1;
        continue;
      }
      if (oldCode === -1) {
        pixelStack[top++] = suffix[code];
        oldCode = code;
        first = code;
        continue;
      }
      const inCode = code;
      if (code === available) {
        pixelStack[top++] = first;
        code = oldCode;
      }
      while (code > clearCode) {
        pixelStack[top++] = suffix[code];
        code = prefix[code];
      }
      first = suffix[code] & 0xff;
      pixelStack[top++] = first;

      if (available < MAX) {
        prefix[available] = oldCode;
        suffix[available] = first;
        available++;
        if ((available & codeMask) === 0 && available < MAX) {
          codeSize++;
          codeMask += available;
        }
      }
      oldCode = inCode;
    }
    top--;
    output[outIdx++] = pixelStack[top];
    i++;
  }
  // Any remaining pixels stay 0 (transparent-friendly default).
  return output;
}

function deinterlace(indices, width, height) {
  const out = new Uint8Array(indices.length);
  const passes = [
    { start: 0, step: 8 },
    { start: 4, step: 8 },
    { start: 2, step: 4 },
    { start: 1, step: 2 },
  ];
  let srcRow = 0;
  for (const pass of passes) {
    for (let y = pass.start; y < height; y += pass.step) {
      out.set(indices.subarray(srcRow * width, srcRow * width + width), y * width);
      srcRow++;
    }
  }
  return out;
}

// Decode a GIF into an array of fully-composited RGBA frames.
function decodeGif(buffer) {
  const bytes = new Uint8Array(buffer);
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (sig !== "GIF") throw new Error("This file is not a GIF. Please choose a .gif image.");

  let pos = 6;
  const readU16 = () => {
    const v = bytes[pos] | (bytes[pos + 1] << 8);
    pos += 2;
    return v;
  };

  const width = readU16();
  const height = readU16();
  if (!width || !height) throw new Error("This GIF reports no size and cannot be read.");
  const packed = bytes[pos++];
  pos++; // background color index
  pos++; // pixel aspect ratio

  let globalPalette = null;
  if (packed & 0x80) {
    const size = 1 << ((packed & 0x07) + 1);
    globalPalette = bytes.subarray(pos, pos + size * 3);
    pos += size * 3;
  }

  const skipSubBlocks = () => {
    while (pos < bytes.length && bytes[pos] !== 0) pos += bytes[pos] + 1;
    pos++; // block terminator
  };

  const frames = [];
  // Persistent canvas buffer (RGBA), starts fully transparent.
  let canvasData = new Uint8ClampedArray(width * height * 4);

  // Graphic control state applied to the next image.
  let disposal = 0;
  let transparentIndex = -1;
  let delay = 0;

  let safety = 0;
  while (pos < bytes.length) {
    if (safety++ > 100000) break;
    const block = bytes[pos++];

    if (block === 0x3b) break; // trailer

    if (block === 0x21) {
      // extension
      const label = bytes[pos++];
      if (label === 0xf9) {
        const size = bytes[pos++]; // 4
        const gce = bytes[pos];
        disposal = (gce >> 2) & 0x07;
        const hasTransparency = gce & 0x01;
        delay = (bytes[pos + 1] | (bytes[pos + 2] << 8)) * 10; // centiseconds -> ms
        transparentIndex = hasTransparency ? bytes[pos + 3] : -1;
        pos += size;
        skipSubBlocks();
      } else {
        skipSubBlocks();
      }
      continue;
    }

    if (block === 0x2c) {
      // image descriptor
      const left = readU16();
      const top = readU16();
      const fw = readU16();
      const fh = readU16();
      const idPacked = bytes[pos++];

      let palette = globalPalette;
      if (idPacked & 0x80) {
        const size = 1 << ((idPacked & 0x07) + 1);
        palette = bytes.subarray(pos, pos + size * 3);
        pos += size * 3;
      }
      const interlaced = !!(idPacked & 0x40);

      const minCodeSize = bytes[pos++];
      // Gather LZW sub-blocks.
      const chunks = [];
      let total = 0;
      while (pos < bytes.length && bytes[pos] !== 0) {
        const len = bytes[pos++];
        chunks.push(bytes.subarray(pos, pos + len));
        total += len;
        pos += len;
      }
      pos++; // terminator
      const lzwData = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        lzwData.set(c, off);
        off += c.length;
      }

      let indices = lzwDecode(minCodeSize, lzwData, fw * fh);
      if (interlaced) indices = deinterlace(indices, fw, fh);

      if (!palette) {
        // No color table available; skip drawing but keep prior canvas.
        frames.push({ rgba: canvasData.slice(0), delay: delay || 100 });
        disposal = 0;
        transparentIndex = -1;
        delay = 0;
        continue;
      }

      // Save current canvas for "restore to previous" disposal.
      const previous = disposal === 3 ? canvasData.slice(0) : null;

      // Composite this frame's patch onto the canvas.
      for (let y = 0; y < fh; y++) {
        const py = top + y;
        if (py < 0 || py >= height) continue;
        for (let x = 0; x < fw; x++) {
          const px = left + x;
          if (px < 0 || px >= width) continue;
          const idx = indices[y * fw + x];
          if (idx === transparentIndex) continue;
          const p = idx * 3;
          const o = (py * width + px) * 4;
          canvasData[o] = palette[p];
          canvasData[o + 1] = palette[p + 1];
          canvasData[o + 2] = palette[p + 2];
          canvasData[o + 3] = 255;
        }
      }

      // Capture the composited frame.
      frames.push({ rgba: canvasData.slice(0), delay: delay || 100 });

      // Apply disposal to prepare the canvas for the next frame.
      if (disposal === 2) {
        for (let y = 0; y < fh; y++) {
          const py = top + y;
          if (py < 0 || py >= height) continue;
          for (let x = 0; x < fw; x++) {
            const px = left + x;
            if (px < 0 || px >= width) continue;
            const o = (py * width + px) * 4;
            canvasData[o] = 0;
            canvasData[o + 1] = 0;
            canvasData[o + 2] = 0;
            canvasData[o + 3] = 0;
          }
        }
      } else if (disposal === 3 && previous) {
        canvasData = previous;
      }

      // Reset graphic-control state for the next image.
      disposal = 0;
      transparentIndex = -1;
      delay = 0;
      continue;
    }

    // Unknown block byte; stop to avoid runaway parsing.
    break;
  }

  if (!frames.length) throw new Error("No image frames could be read from this GIF.");
  return { width, height, frames };
}

function rgbaToPngBlob(rgba, width, height) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get a canvas context in this browser."));
      return;
    }
    ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not export a PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export default function GifToPng() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [frames, setFrames] = useState([]); // { url, blob, name }
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const framesRef = useRef([]);

  const revokeFrames = useCallback(() => {
    for (const f of framesRef.current) {
      if (f.url) URL.revokeObjectURL(f.url);
    }
    framesRef.current = [];
  }, []);

  useEffect(() => {
    return () => revokeFrames();
  }, [revokeFrames]);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const isGif =
        (file.type && file.type === "image/gif") || /\.gif$/i.test(file.name || "");
      if (!isGif) {
        setError("Please choose a GIF file (.gif).");
        return;
      }

      revokeFrames();
      setFrames([]);
      setDimensions(null);
      setError("");
      setFileName(file.name || "image.gif");
      setOriginalSize(file.size || 0);
      setBusy(true);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const { width, height, frames: decoded } = decodeGif(reader.result);
          const base = (file.name || "image.gif").replace(/\.[^./\\]+$/, "") || "image";
          const pad = String(decoded.length).length;
          const out = [];
          for (let i = 0; i < decoded.length; i++) {
            const blob = await rgbaToPngBlob(decoded[i].rgba, width, height);
            const url = URL.createObjectURL(blob);
            const name =
              decoded.length === 1
                ? `${base}.png`
                : `${base}-frame-${String(i + 1).padStart(pad, "0")}.png`;
            out.push({ url, blob, name });
          }
          framesRef.current = out;
          setFrames(out);
          setDimensions({ width, height });
          setError("");
        } catch (err) {
          revokeFrames();
          setFrames([]);
          setError(err && err.message ? err.message : "Could not convert this GIF.");
        } finally {
          setBusy(false);
        }
      };
      reader.onerror = () => {
        setBusy(false);
        setError("This file could not be read.");
      };
      reader.readAsArrayBuffer(file);
    },
    [revokeFrames]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
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

  const downloadZip = async () => {
    if (!frames.length) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const f of frames) zip.file(f.name, f.blob);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const base = (fileName || "image.gif").replace(/\.[^./\\]+$/, "") || "gif";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}-frames.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Could not build the ZIP file.");
    } finally {
      setBusy(false);
    }
  };

  const isAnimated = frames.length > 1;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="gif-to-png-file">
              GIF image to convert
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
                {dragging ? "Drop your GIF here" : "Drag & drop a GIF, or click to choose"}
              </div>
              <div className="dropzone-sub">{fileName ? fileName : "Only .gif files are accepted"}</div>
            </div>
            <input
              id="gif-to-png-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept="image/gif,.gif"
              onChange={onInputChange}
              style={{ display: "none" }}
            />
            <p className="tool-note">
              Static GIFs convert to a single PNG. Animated GIFs are split into one PNG per frame, with
              transparency preserved.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {busy && !frames.length && !error ? <p className="tool-note">Decoding GIF…</p> : null}

      {frames.length && !error ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(originalSize)}</div>
              <div className="tool-stat-label">Original GIF</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{frames.length}</div>
              <div className="tool-stat-label">{isAnimated ? "Frames" : "Frame"}</div>
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

          <div className="tool-actions">
            {isAnimated ? (
              <button type="button" className="btn btn-success" onClick={downloadZip} disabled={busy}>
                {busy ? "Building ZIP…" : `Download all ${frames.length} PNGs (ZIP)`}
              </button>
            ) : (
              <a className="btn btn-success" href={frames[0].url} download={frames[0].name} role="button">
                Download PNG
              </a>
            )}
            <button type="button" className="btn" onClick={openPicker}>
              Convert another
            </button>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">{isAnimated ? "Frames (click any to download)" : "Preview"}</div>
            <div className="tool-result-value">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                {frames.map((f, i) => (
                  <a
                    key={f.url}
                    href={f.url}
                    download={f.name}
                    title={`Download ${f.name}`}
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid rgba(128,128,128,0.35)",
                        backgroundColor: "#ffffff",
                        backgroundImage: CHECKER,
                      }}
                    >
                      <img
                        src={f.url}
                        alt={isAnimated ? `Frame ${i + 1}` : "Converted PNG preview"}
                        style={{
                          display: "block",
                          maxWidth: isAnimated ? "140px" : "100%",
                          maxHeight: isAnimated ? "140px" : "none",
                          height: "auto",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                    {isAnimated ? (
                      <span className="tool-stat-label">Frame {i + 1}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!frames.length && !busy && !error ? (
        <p className="tool-note">
          Add a GIF above to convert it to PNG. Everything runs privately in your browser — nothing is
          uploaded.
        </p>
      ) : null}
    </div>
  );
}
