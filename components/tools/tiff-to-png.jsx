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

const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' width='10' height='10' fill='%23ffffff'/%3E%3Crect y='10' width='10' height='10' fill='%23ffffff'/%3E%3C/svg%3E\")";

// ---- TIFF decoding (baseline, strip-based) ----

const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function readValues(view, entryPtr, type, count, little) {
  const size = TYPE_SIZES[type] || 1;
  const total = size * count;
  let base = entryPtr;
  if (total > 4) base = view.getUint32(entryPtr, little);
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = base + i * size;
    if (type === 1 || type === 6 || type === 7) out.push(view.getUint8(p));
    else if (type === 3 || type === 8) out.push(view.getUint16(p, little));
    else if (type === 4 || type === 9) out.push(view.getUint32(p, little));
    else if (type === 5 || type === 10) {
      const num = view.getUint32(p, little);
      const den = view.getUint32(p + 4, little);
      out.push(den ? num / den : 0);
    } else out.push(view.getUint8(p));
  }
  return out;
}

function readIFD(view, offset, little) {
  const count = view.getUint16(offset, little);
  const entries = {};
  let p = offset + 2;
  for (let i = 0; i < count; i++) {
    const tag = view.getUint16(p, little);
    const type = view.getUint16(p + 2, little);
    const cnt = view.getUint32(p + 4, little);
    entries[tag] = readValues(view, p + 8, type, cnt, little);
    p += 12;
  }
  const next = view.getUint32(offset + 2 + count * 12, little);
  return { entries, next };
}

function first(arr, def) {
  return arr && arr.length ? arr[0] : def;
}

function packBits(data, expected) {
  const out = new Uint8Array(expected);
  let o = 0;
  let i = 0;
  while (i < data.length && o < expected) {
    let n = data[i++];
    if (n >= 128) n -= 256; // signed
    if (n >= 0) {
      for (let j = 0; j <= n && o < expected && i < data.length; j++) out[o++] = data[i++];
    } else if (n !== -128) {
      const b = data[i++];
      for (let j = 0; j < 1 - n && o < expected; j++) out[o++] = b;
    }
  }
  return out;
}

function lzwDecode(data, expected) {
  const CLEAR = 256;
  const EOI = 257;
  const out = new Uint8Array(expected);
  let o = 0;
  let bitBuffer = 0;
  let bitCount = 0;
  let pos = 0;
  let codeSize = 9;
  let dict = [];
  const initDict = () => {
    dict = new Array(258);
    for (let i = 0; i < 256; i++) dict[i] = [i];
    dict[256] = null;
    dict[257] = null;
  };
  const next = () => {
    while (bitCount < codeSize) {
      if (pos >= data.length) return EOI;
      bitBuffer = (bitBuffer << 8) | data[pos++];
      bitCount += 8;
    }
    bitCount -= codeSize;
    return (bitBuffer >> bitCount) & ((1 << codeSize) - 1);
  };
  const write = (entry) => {
    for (let k = 0; k < entry.length && o < expected; k++) out[o++] = entry[k];
  };
  initDict();
  codeSize = 9;
  let prev = null;
  let code;
  while ((code = next()) !== EOI && o < expected) {
    if (code === CLEAR) {
      initDict();
      codeSize = 9;
      code = next();
      if (code === EOI) break;
      write(dict[code]);
      prev = dict[code];
    } else {
      let entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (prev) entry = prev.concat(prev[0]);
      else break;
      write(entry);
      if (prev) dict.push(prev.concat(entry[0]));
      prev = entry;
      if (dict.length + 1 >= (1 << codeSize) && codeSize < 12) codeSize++;
    }
  }
  return out;
}

async function inflate(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser can't decompress Deflate-compressed TIFFs.");
  }
  const ds = new DecompressionStream("deflate");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

async function decompressStrip(compression, data, expected) {
  if (compression === 1) return data;
  if (compression === 32773) return packBits(data, expected);
  if (compression === 5) return lzwDecode(data, expected);
  if (compression === 8 || compression === 32946) return inflate(data);
  if (compression === 2 || compression === 3 || compression === 4) {
    throw new Error("CCITT/fax-compressed TIFFs (Group 3/4) aren't supported.");
  }
  if (compression === 6 || compression === 7) {
    throw new Error("JPEG-compressed TIFFs aren't supported.");
  }
  throw new Error(`Unsupported TIFF compression (code ${compression}).`);
}

async function decodePage(view, buffer, entries, little) {
  const width = first(entries[256]);
  const height = first(entries[257]);
  if (!width || !height) throw new Error("This page is missing width/height.");
  if (entries[322] || entries[323] || entries[324]) {
    throw new Error("Tiled TIFFs aren't supported (only strip-based).");
  }

  const bitsArr = entries[258] && entries[258].length ? entries[258] : [1];
  const bits = bitsArr[0];
  if (![1, 2, 4, 8, 16].includes(bits)) {
    throw new Error(`Unsupported bit depth (${bits} bits per sample).`);
  }
  const compression = first(entries[259], 1);
  const photometric = first(entries[262], 1);
  const spp = first(entries[277], 1);
  const planar = first(entries[284], 1);
  if (planar !== 1) throw new Error("Planar (non-interleaved) TIFFs aren't supported.");
  const predictor = first(entries[317], 1);
  const rowsPerStrip = first(entries[278], height);
  const stripOffsets = entries[273] || [];
  const stripCounts = entries[279] || [];
  const colorMap = entries[320];

  const bytesPerRow = Math.ceil((width * spp * bits) / 8);
  const pixels = new Uint8Array(bytesPerRow * height);

  let written = 0;
  for (let s = 0; s < stripOffsets.length; s++) {
    const off = stripOffsets[s];
    const cnt = stripCounts[s] != null ? stripCounts[s] : buffer.byteLength - off;
    const rowsInStrip = Math.min(rowsPerStrip, height - s * rowsPerStrip);
    if (rowsInStrip <= 0) break;
    const expected = bytesPerRow * rowsInStrip;
    const raw = new Uint8Array(buffer, off, Math.min(cnt, buffer.byteLength - off));
    const dec = await decompressStrip(compression, raw, expected);
    pixels.set(dec.subarray(0, Math.min(dec.length, pixels.length - written)), written);
    written += expected;
  }

  // Horizontal predictor (8-bit only)
  if (predictor === 2) {
    if (bits !== 8) throw new Error("Horizontal prediction is only supported for 8-bit TIFFs.");
    for (let y = 0; y < height; y++) {
      const rowStart = y * bytesPerRow;
      for (let x = spp; x < width * spp; x++) {
        pixels[rowStart + x] = (pixels[rowStart + x] + pixels[rowStart + x - spp]) & 0xff;
      }
    }
  }

  const maxVal = (1 << bits) - 1;
  const scale = (v) => (bits === 8 ? v : Math.round((v * 255) / maxVal));

  const getRaw = (rowStart, x, sIdx) => {
    if (bits === 8) return pixels[rowStart + x * spp + sIdx];
    if (bits === 16) {
      const idx = rowStart + (x * spp + sIdx) * 2;
      return little ? pixels[idx] | (pixels[idx + 1] << 8) : (pixels[idx] << 8) | pixels[idx + 1];
    }
    const bitPos = (x * spp + sIdx) * bits;
    const byteIndex = rowStart + (bitPos >> 3);
    const within = bitPos & 7;
    return (pixels[byteIndex] >> (8 - within - bits)) & maxVal;
  };

  const out = new Uint8ClampedArray(width * height * 4);
  const cmMax = colorMap ? 1 << bits : 0;

  for (let y = 0; y < height; y++) {
    const rowStart = y * bytesPerRow;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (photometric === 2) {
        out[o] = scale(getRaw(rowStart, x, 0));
        out[o + 1] = scale(getRaw(rowStart, x, 1));
        out[o + 2] = scale(getRaw(rowStart, x, 2));
        out[o + 3] = spp >= 4 ? scale(getRaw(rowStart, x, 3)) : 255;
      } else if (photometric === 3 && colorMap) {
        const idx = getRaw(rowStart, x, 0);
        out[o] = colorMap[idx] >> 8;
        out[o + 1] = colorMap[cmMax + idx] >> 8;
        out[o + 2] = colorMap[2 * cmMax + idx] >> 8;
        out[o + 3] = 255;
      } else if (photometric === 5) {
        const c = scale(getRaw(rowStart, x, 0));
        const m = scale(getRaw(rowStart, x, 1));
        const yv = scale(getRaw(rowStart, x, 2));
        const k = spp >= 4 ? scale(getRaw(rowStart, x, 3)) : 0;
        out[o] = Math.round(((255 - c) * (255 - k)) / 255);
        out[o + 1] = Math.round(((255 - m) * (255 - k)) / 255);
        out[o + 2] = Math.round(((255 - yv) * (255 - k)) / 255);
        out[o + 3] = 255;
      } else {
        // grayscale (0 = WhiteIsZero, 1 = BlackIsZero)
        let v = scale(getRaw(rowStart, x, 0));
        if (photometric === 0) v = 255 - v;
        out[o] = v;
        out[o + 1] = v;
        out[o + 2] = v;
        out[o + 3] = spp >= 2 ? scale(getRaw(rowStart, x, 1)) : 255;
      }
    }
  }

  return { width, height, data: out };
}

function toImageBlob(page) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = page.width;
    canvas.height = page.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get a drawing context in this browser."));
      return;
    }
    const imageData = new ImageData(page.data, page.width, page.height);
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not export a PNG."));
      else resolve(blob);
    }, "image/png");
  });
}

async function decodeTiff(buffer) {
  if (buffer.byteLength < 8) throw new Error("This file is too small to be a TIFF.");
  const view = new DataView(buffer);
  const b0 = view.getUint8(0);
  const b1 = view.getUint8(1);
  let little;
  if (b0 === 0x49 && b1 === 0x49) little = true;
  else if (b0 === 0x4d && b1 === 0x4d) little = false;
  else throw new Error("This isn't a TIFF file (bad byte-order marker).");
  const magic = view.getUint16(2, little);
  if (magic !== 42) throw new Error("This isn't a standard TIFF file.");

  const pages = [];
  let offset = view.getUint32(4, little);
  let guard = 0;
  while (offset && guard < 10000) {
    guard++;
    const { entries, next } = readIFD(view, offset, little);
    pages.push(entries);
    if (!next || next === offset) break;
    offset = next;
  }
  return { pages, view, little };
}

export default function TiffToPng() {
  const [fileName, setFileName] = useState("");
  const [pages, setPages] = useState([]); // { url, size, width, height, error }
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const urlsRef = useRef([]);

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
    urlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => revokeAll();
  }, [revokeAll]);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      revokeAll();
      setPages([]);
      setSelected(0);
      setError("");
      setFileName(file.name || "image.tiff");
      setBusy(true);

      try {
        const buffer = await file.arrayBuffer();
        const { pages: rawPages, view, little } = await decodeTiff(buffer);
        const results = [];
        for (let i = 0; i < rawPages.length; i++) {
          try {
            const decoded = await decodePage(view, buffer, rawPages[i], little);
            const blob = await toImageBlob(decoded);
            const url = URL.createObjectURL(blob);
            urlsRef.current.push(url);
            results.push({
              url,
              size: blob.size,
              width: decoded.width,
              height: decoded.height,
              error: "",
            });
          } catch (pageErr) {
            results.push({
              url: "",
              size: 0,
              width: 0,
              height: 0,
              error: pageErr && pageErr.message ? pageErr.message : "Could not decode this page.",
            });
          }
        }
        setPages(results);
        const firstOk = results.findIndex((r) => r.url);
        setSelected(firstOk >= 0 ? firstOk : 0);
        if (!results.some((r) => r.url)) {
          setError(results[0] && results[0].error ? results[0].error : "No pages could be decoded.");
        }
      } catch (err) {
        setError(err && err.message ? err.message : "Could not read this TIFF file.");
      } finally {
        setBusy(false);
      }
    },
    [revokeAll]
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
  const openPicker = () => inputRef.current && inputRef.current.click();
  const onDropzoneKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const baseName = () => (fileName || "image").replace(/\.[^./\\]+$/, "") || "image";

  const pageName = (i) => {
    const b = baseName();
    return pages.length > 1 ? `${b}-page-${i + 1}.png` : `${b}.png`;
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    let added = 0;
    for (let i = 0; i < pages.length; i++) {
      if (!pages[i].url) continue;
      const blob = await fetch(pages[i].url).then((r) => r.blob());
      zip.file(pageName(i), blob);
      added++;
    }
    if (!added) return;
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName()}-png.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const okPages = pages.filter((p) => p.url).length;
  const current = pages[selected];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tiff-to-png-file">
              TIFF image to convert
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
                {dragging ? "Drop your TIFF here" : "Drag & drop a TIFF, or click to choose"}
              </div>
              <div className="dropzone-sub">{fileName ? fileName : ".tif and .tiff files are accepted"}</div>
            </div>
            <input
              id="tiff-to-png-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept=".tif,.tiff,image/tiff"
              onChange={onInputChange}
              style={{ display: "none" }}
            />
            <p className="tool-note">
              TIFF is decoded in your browser and re-encoded as a lossless PNG. Multi-page TIFFs are split into one PNG per
              page.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {pages.length > 0 && !error ? (
        <>
          {pages.length > 1 ? (
            <div className="tool-row" role="group" aria-label="Pages">
              <div className="tool-field">
                <label className="tool-label" htmlFor="tiff-to-png-page">
                  Page ({okPages} of {pages.length} decoded)
                </label>
                <select
                  id="tiff-to-png-page"
                  className="tool-select"
                  value={selected}
                  onChange={(e) => setSelected(Number(e.target.value))}
                >
                  {pages.map((p, i) => (
                    <option key={i} value={i}>
                      Page {i + 1}
                      {p.url ? ` — ${p.width}x${p.height}` : " — failed"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {current && current.url ? (
            <>
              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {current.width} x {current.height}
                  </div>
                  <div className="tool-stat-label">Pixels</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{formatBytes(current.size)}</div>
                  <div className="tool-stat-label">PNG size</div>
                </div>
                {pages.length > 1 ? (
                  <div className="tool-stat">
                    <div className="tool-stat-num">{pages.length}</div>
                    <div className="tool-stat-label">Pages</div>
                  </div>
                ) : null}
              </div>

              <div className="tool-result">
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
                      src={current.url}
                      alt="Converted PNG preview"
                      style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                    />
                  </div>
                </div>
              </div>

              <div className="tool-actions">
                <a className="btn btn-success" href={current.url} download={pageName(selected)} role="button">
                  Download PNG
                </a>
                {okPages > 1 ? (
                  <button type="button" className="btn btn-primary" onClick={downloadZip}>
                    Download all pages (ZIP)
                  </button>
                ) : null}
                <button type="button" className="btn" onClick={openPicker}>
                  Convert another
                </button>
              </div>
            </>
          ) : current ? (
            <div className="tool-error">{current.error || "This page could not be decoded."}</div>
          ) : null}
        </>
      ) : null}

      {busy && !error ? <p className="tool-note">Decoding TIFF…</p> : null}

      {pages.length === 0 && !busy && !error ? (
        <p className="tool-note">
          Add a TIFF image above to convert it to PNG. Everything runs privately in your browser — no upload, no sign-up.
        </p>
      ) : null}
    </div>
  );
}
