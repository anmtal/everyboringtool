"use client";

import { useState, useEffect, useRef } from "react";

// Formatters — created once, reused on every render.
const KB_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const MB_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const PCT_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

// Human-friendly size string (KB, or MB once it's large enough).
function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1024 * 1024) return `${MB_FMT.format(bytes / (1024 * 1024))} MB`;
  return `${KB_FMT.format(bytes / 1024)} KB`;
}

// The three output types canvas.toBlob supports across browsers.
const FORMATS = {
  "image/jpeg": { label: "JPEG", ext: "jpg", lossy: true },
  "image/png": { label: "PNG", ext: "png", lossy: false },
  "image/webp": { label: "WebP", ext: "webp", lossy: true },
};

function formatInfo(type) {
  return FORMATS[type] || FORMATS["image/jpeg"];
}

// Does the image have any non-opaque pixel? Sampled at a small size so this
// stays cheap on big photos — downscaling never invents transparency.
function detectTransparency(img) {
  try {
    const w = Math.max(1, Math.min(256, img.naturalWidth || 1));
    const h = Math.max(1, Math.min(256, img.naturalHeight || 1));
    const probe = document.createElement("canvas");
    probe.width = w;
    probe.height = h;
    const ctx = probe.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// PNG is lossless, so re-encoding a photo makes it *larger*, not smaller. To
// actually compress it (the way TinyPNG does) we reduce the image to a small
// colour palette with median-cut quantization: fewer distinct colours let PNG's
// DEFLATE pack the file far tighter. The quality slider picks the palette size.
// Alpha is preserved — only opaque RGB pixels are quantized. Mutates in place.
function quantizePNG(imageData, maxColors) {
  const d = imageData.data;
  const px = d.length >> 2;

  // Build the palette from a stride-capped sample so this stays fast on big photos.
  const CAP = 40000;
  const stride = Math.max(1, Math.floor(px / CAP));
  const samp = [];
  for (let i = 0; i < px; i += stride) {
    const o = i << 2;
    if (d[o + 3] < 8) continue; // ignore (near-)transparent pixels
    samp.push([d[o], d[o + 1], d[o + 2]]);
  }
  if (samp.length < 2) return; // nothing (or one colour) to quantize

  const boxOf = (arr) => {
    let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
    for (const c of arr) {
      if (c[0] < rmin) rmin = c[0]; if (c[0] > rmax) rmax = c[0];
      if (c[1] < gmin) gmin = c[1]; if (c[1] > gmax) gmax = c[1];
      if (c[2] < bmin) bmin = c[2]; if (c[2] > bmax) bmax = c[2];
    }
    const rr = rmax - rmin, gr = gmax - gmin, br = bmax - bmin;
    const axis = rr >= gr && rr >= br ? 0 : gr >= br ? 1 : 2;
    return { arr, range: Math.max(rr, gr, br), axis };
  };

  let boxes = [boxOf(samp)];
  while (boxes.length < maxColors) {
    let bi = -1, best = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].arr.length > 1 && boxes[i].range > best) { best = boxes[i].range; bi = i; }
    }
    if (bi < 0) break; // every remaining box is a single colour
    const box = boxes[bi];
    box.arr.sort((a, b) => a[box.axis] - b[box.axis]);
    const mid = box.arr.length >> 1;
    boxes.splice(bi, 1, boxOf(box.arr.slice(0, mid)), boxOf(box.arr.slice(mid)));
  }

  const pal = boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const c of box.arr) { r += c[0]; g += c[1]; b += c[2]; }
    const n = box.arr.length;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });

  // 32³ nearest-colour lookup table so mapping the full image is O(1) per pixel.
  const LUT = new Int16Array(32768).fill(-1);
  const nearest = (r, g, b) => {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let pi = LUT[key];
    if (pi >= 0) return pi;
    let bd = Infinity, bx = 0;
    for (let i = 0; i < pal.length; i++) {
      const p = pal[i];
      const dr = r - p[0], dg = g - p[1], db = b - p[2];
      const dd = dr * dr + dg * dg + db * db;
      if (dd < bd) { bd = dd; bx = i; }
    }
    LUT[key] = bx;
    return bx;
  };

  for (let i = 0; i < px; i++) {
    const o = i << 2;
    if (d[o + 3] < 8) continue; // leave transparent pixels alone
    const p = pal[nearest(d[o], d[o + 1], d[o + 2])];
    d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2];
  }
}

// Slider position (0.1–1) → palette size for PNG. Quality 1.0 keeps the full
// 256-colour palette (near-lossless); lower values drop colours for a smaller file.
function pngColors(quality) {
  return Math.max(2, Math.min(256, Math.round(quality * 256)));
}

export default function ImageCompressor() {
  // { img, width, height, size, name, hasAlpha }
  const [source, setSource] = useState(null);
  const [quality, setQuality] = useState(0.7);
  const [format, setFormat] = useState("image/jpeg");
  // { url, size }
  const [output, setOutput] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef(null);
  const sourceUrlRef = useRef(""); // object URL backing the loaded <img>
  const outputUrlRef = useRef(""); // object URL backing the compressed download

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    };
  }, []);

  // Re-encode whenever the image, quality or output format changes.
  useEffect(() => {
    if (!source) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setBusy(true);

    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (format === "image/jpeg") {
      // JPEG has no transparency — paint white behind any alpha pixels.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // PNG and WebP keep the alpha channel, so start from a clear canvas.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(source.img, 0, 0);

    // PNG can't compress a photo losslessly, so apply lossy colour reduction
    // before encoding — that's what lets it come out smaller than the original.
    if (format === "image/png") {
      try {
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        quantizePNG(id, pngColors(quality));
        ctx.putImageData(id, 0, 0);
      } catch (err) {
        // If the canvas is tainted or getImageData fails, fall back to a plain
        // lossless PNG rather than erroring out.
      }
    }

    canvas.toBlob(
      (blob) => {
        if (cancelled) return;
        if (!blob) {
          setError("Couldn't compress this image in your browser.");
          setBusy(false);
          return;
        }
        if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
        const url = URL.createObjectURL(blob);
        outputUrlRef.current = url;
        // Browsers that can't encode the chosen type quietly return a PNG;
        // trust the blob's own type so the download name stays honest.
        setOutput({ url, size: blob.size, type: blob.type || format });
        setBusy(false);
      },
      format,
      formatInfo(format).lossy ? quality : undefined
    );

    return () => {
      cancelled = true;
    };
  }, [source, quality, format]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError("");
    // Drop the previous output right away; the effect will make a fresh one.
    setOutput(null);
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);

    const url = URL.createObjectURL(file);
    sourceUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      const hasAlpha = detectTransparency(img);
      // Default the output to the input's own format when we can encode it;
      // otherwise keep transparency (PNG) or fall back to JPEG.
      setFormat(FORMATS[file.type] ? file.type : hasAlpha ? "image/png" : "image/jpeg");
      setSource({
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        name: file.name,
        hasAlpha,
      });
    };
    img.onerror = () => {
      setError("Couldn't load that image — it may be corrupted or an unsupported format.");
      setSource(null);
    };
    img.src = url;
  }

  const savings =
    source && output && source.size > 0 ? (1 - output.size / source.size) * 100 : null;

  const baseName = source ? source.name.replace(/\.[^.]+$/, "") : "image";
  const outInfo = formatInfo(format);
  const doneInfo = output ? formatInfo(output.type) : outInfo;
  const downloadName = `${baseName}-compressed.${doneInfo.ext}`;
  const flattening = !!source && source.hasAlpha && format === "image/jpeg";
  const isPng = format === "image/png";
  const sliderLabel = isPng
    ? `PNG colours: ${pngColors(quality)}`
    : `${outInfo.label} quality: ${Math.round(quality * 100)}%`;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ic-file">
              Choose an image
            </label>
            <input
              className="tool-input"
              id="ic-file"
              type="file"
              accept="image/*"
              onChange={onFile}
            />
          </div>
        </div>

        {source && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ic-format">
                Output format
              </label>
              <select
                className="tool-select"
                id="ic-format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png)</option>
                <option value="image/webp">WebP (.webp)</option>
              </select>
            </div>
          </div>
        )}

        {source && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ic-quality">
                {sliderLabel}
              </label>
              <input
                className="tool-input"
                id="ic-quality"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {flattening && (
        <p className="tool-note">Transparency will be flattened to white.</p>
      )}

      {source && isPng && (
        <p className="tool-note">
          PNG can’t shrink a photo losslessly, so this reduces the colour palette
          instead. Lower quality = fewer colours = a smaller file (transparency is
          kept). For photos, JPEG or WebP will usually go smaller still.
        </p>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {source && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">COMPRESSED SIZE</p>
            <div className="tool-result-value">
              {busy && !output ? "Compressing…" : output ? formatSize(output.size) : "—"}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{KB_FMT.format(source.size / 1024)}</div>
              <div className="tool-stat-label">Original KB</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {output ? KB_FMT.format(output.size / 1024) : "—"}
              </div>
              <div className="tool-stat-label">Compressed KB</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {savings === null ? "—" : `${PCT_FMT.format(savings)}%`}
              </div>
              <div className="tool-stat-label">{savings !== null && savings < 0 ? "Larger" : "Saved"}</div>
            </div>
          </div>

          {output && (
            <img
              src={output.url}
              alt="Compressed preview"
              style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", marginTop: "0.75rem" }}
            />
          )}

          <p className="tool-note">
            {`Original dimensions: ${source.width} × ${source.height}px.`}
            {savings !== null && savings < 0
              ? isPng
                ? ` Even palette-reduced, PNG is larger than the original here — for a photo, switch to JPEG or WebP to actually shrink it.`
                : ` This image is already well compressed — the ${doneInfo.label} is larger than the original at this setting. Try a lower quality or a different format.`
              : " Everything runs in your browser — your image is never uploaded."}
          </p>

          {output && (
            <div className="tool-actions">
              <a className="btn btn-success" href={output.url} download={downloadName}>
                {`↓ Download compressed ${doneInfo.label}`}
              </a>
            </div>
          )}
        </>
      )}

      {!source && !error && (
        <p className="tool-note">
          Pick an image to compress. It stays on your device — nothing is uploaded.
        </p>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
