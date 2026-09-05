"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyText as copyToClipboard } from "../../lib/copyText";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return value.toFixed(value >= 10 ? 1 : 2) + " " + units[i];
}

// Some files arrive with an empty (or wrong) browser-reported MIME type —
// common for SVG/AVIF, files copied off a network share, or some OS builds.
// Fall back to the extension, matching the acceptance test in _image-tool.jsx.
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|ico|avif|svg|tiff?)$/i;

const EXT_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
};

function mimeFromName(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || "");
  return match ? EXT_MIME[match[1].toLowerCase()] || "" : "";
}

export default function ImageToBase64() {
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [dataUri, setDataUri] = useState("");
  const [dimensions, setDimensions] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const fileInputRef = useRef(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const typeIsImage = !!file.type && file.type.startsWith("image/");
    if (!typeIsImage && !IMAGE_EXT_RE.test(file.name || "")) {
      setError("Please choose an image file (PNG, JPG, GIF, SVG, WebP, etc.).");
      return;
    }
    // When the browser gave us no usable type, infer it from the extension so
    // the data: prefix is still correct.
    const effectiveType = typeIsImage
      ? file.type
      : mimeFromName(file.name) || file.type || "";

    setError("");
    setBusy(true);
    setFileName(file.name || "image");
    setMimeType(effectiveType);
    setOriginalSize(file.size || 0);
    setDataUri("");
    setDimensions(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target && e.target.result;
      if (!src) {
        setError("Could not read the selected file.");
        setBusy(false);
        return;
      }
      let uri = String(src);
      if (!typeIsImage && effectiveType && uri.startsWith("data:")) {
        // FileReader stamps the (missing/generic) file type into the prefix;
        // swap in the type we inferred from the extension.
        const comma = uri.indexOf(",");
        if (comma >= 0) {
          const isBase64 = /;base64$/i.test(uri.slice(5, comma));
          uri =
            "data:" +
            effectiveType +
            (isBase64 ? ";base64," : ",") +
            uri.slice(comma + 1);
        }
      }
      setDataUri(uri);
      setBusy(false);

      // Best-effort dimension read; not required for the encoding to work.
      const img = new Image();
      img.onload = () => {
        setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        setDimensions(null);
      };
      img.src = uri;
    };
    reader.onerror = () => {
      setError("Could not read the selected file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  };

  const copyText = useCallback(async (text, key) => {
    if (!text) return;
    try {
      await copyToClipboard(text);
      setCopiedKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(""), 1500);
    } catch (err) {
      setError("Copying failed. You can select the text and copy it manually.");
    }
  }, []);

  const handleClear = () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setFileName("");
    setMimeType("");
    setOriginalSize(0);
    setDataUri("");
    setDimensions(null);
    setError("");
    setBusy(false);
    setCopiedKey("");
  };

  const encodedBytes = dataUri ? dataUri.length : 0;
  // The base64 payload alone (excludes the "data:<mime>;base64," prefix).
  const commaIndex = dataUri.indexOf(",");
  const payloadBytes =
    dataUri && commaIndex >= 0 ? dataUri.length - (commaIndex + 1) : encodedBytes;
  const overheadPct =
    originalSize > 0 && payloadBytes > 0
      ? Math.round(((payloadBytes - originalSize) / originalSize) * 100)
      : null;

  const imgSnippet = dataUri ? '<img src="' + dataUri + '" alt="" />' : "";
  const cssSnippet = dataUri
    ? "background-image: url(" + dataUri + ");"
    : "";

  const hasResult = !!dataUri;

  return (
    <div className="tool">
      <div
        className="dropzone"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current && fileInputRef.current.click();
          }
        }}
        style={
          dragActive
            ? { outline: "2px dashed currentColor", outlineOffset: "2px" }
            : undefined
        }
      >
        <div className="dropzone-title">
          {fileName ? fileName : "Drop an image here or click to browse"}
        </div>
        <div className="dropzone-sub">
          PNG, JPG, GIF, SVG, WebP, BMP - encoded to a Base64 data URI in your
          browser
        </div>
      </div>

      <label
        className="tool-label"
        htmlFor="itb-file"
        style={{ display: "none" }}
      >
        Choose image file
      </label>
      <input
        id="itb-file"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: "none" }}
      />

      {error ? <div className="tool-error">{error}</div> : null}

      {busy ? <div className="tool-note">Encoding...</div> : null}

      {hasResult ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0.5rem 0",
            }}
          >
            <img
              src={dataUri}
              alt="Preview of the uploaded image"
              style={{
                maxWidth: "100%",
                maxHeight: "260px",
                borderRadius: "8px",
                border: "1px solid rgba(128,128,128,0.35)",
              }}
            />
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(originalSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(encodedBytes)}</div>
              <div className="tool-stat-label">Base64 length</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {overheadPct === null ? "~33%" : "+" + overheadPct + "%"}
              </div>
              <div className="tool-stat-label">Size overhead</div>
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">Type</span>
            <span className="tool-result-value">{mimeType || "unknown"}</span>
          </div>

          {dimensions ? (
            <div className="tool-result" role="status" aria-live="polite">
              <span className="tool-result-label">Dimensions</span>
              <span className="tool-result-value">
                {dimensions.w} x {dimensions.h} px
              </span>
            </div>
          ) : null}

          <p className="tool-note">
            Base64 encoding makes data roughly 33% larger than the original
            file. Data URIs are handy for small icons and inline assets, but
            large images are usually better served as normal files.
          </p>

          {/* Full data URI */}
          <div className="tool-field">
            <div className="tool-actions">
              <label className="tool-label" htmlFor="itb-datauri">
                Base64 data URI
              </label>
              <button
                type="button"
                className={
                  copiedKey === "uri" ? "btn btn-success" : "btn btn-primary"
                }
                onClick={() => copyText(dataUri, "uri")}
              >
                {copiedKey === "uri" ? "Copied!" : "Copy data URI"}
              </button>
            </div>
            <pre className="tool-output" id="itb-datauri">
              {dataUri}
            </pre>
          </div>

          {/* <img> snippet */}
          <div className="tool-field">
            <div className="tool-actions">
              <label className="tool-label" htmlFor="itb-img">
                HTML img tag
              </label>
              <button
                type="button"
                className={
                  copiedKey === "img" ? "btn btn-success" : "btn"
                }
                onClick={() => copyText(imgSnippet, "img")}
              >
                {copiedKey === "img" ? "Copied!" : "Copy <img>"}
              </button>
            </div>
            <pre className="tool-output" id="itb-img">
              {imgSnippet}
            </pre>
          </div>

          {/* CSS background snippet */}
          <div className="tool-field">
            <div className="tool-actions">
              <label className="tool-label" htmlFor="itb-css">
                CSS background-image
              </label>
              <button
                type="button"
                className={
                  copiedKey === "css" ? "btn btn-success" : "btn"
                }
                onClick={() => copyText(cssSnippet, "css")}
              >
                {copiedKey === "css" ? "Copied!" : "Copy CSS"}
              </button>
            </div>
            <pre className="tool-output" id="itb-css">
              {cssSnippet}
            </pre>
          </div>

          <div className="tool-actions">
            <button type="button" className="btn" onClick={handleClear}>
              Clear
            </button>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Upload an image to get its Base64 data URI plus ready-to-paste
          {" "}
          <code>&lt;img&gt;</code> and CSS <code>background-image</code>{" "}
          snippets. Nothing is uploaded - the encoding happens entirely in your
          browser.
        </p>
      )}
    </div>
  );
}
