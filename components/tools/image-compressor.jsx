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

        {source && outInfo.lossy && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ic-quality">
                {`${outInfo.label} quality: ${Math.round(quality * 100)}%`}
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

      {source && !outInfo.lossy && (
        <p className="tool-note">
          PNG is lossless, so the quality slider doesn’t apply — pick JPEG or
          WebP to trade quality for a smaller file.
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
              ? ` This image is already well compressed — the ${doneInfo.label} is larger than the original at this setting. Try a lower quality or a different format.`
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
