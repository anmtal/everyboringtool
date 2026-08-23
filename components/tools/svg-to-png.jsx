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

function clampInt(value, min, max, fallback) {
  const n = typeof value === "number" ? value : parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

// Read a length attribute (width/height). Units other than "%" are ignored for
// the numeric value, which is fine because we only ever use width/height as a
// ratio (both share the same unit). Percentages carry no intrinsic size.
function parseLen(raw) {
  if (!raw) return 0;
  const str = String(raw).trim();
  if (!str || str.endsWith("%")) return 0;
  const n = parseFloat(str);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Parse markup into an <svg> element, throwing a friendly error on bad input.
function parseSvg(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("This SVG markup could not be parsed. Check for unclosed or mismatched tags.");
  }
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") {
    throw new Error("No <svg> root element was found in the markup.");
  }
  return svg;
}

// Work out the intrinsic size / aspect ratio from width, height, or viewBox.
function getDims(svg) {
  const w = parseLen(svg.getAttribute("width"));
  const h = parseLen(svg.getAttribute("height"));
  let vbW = 0;
  let vbH = 0;
  const vb = svg.getAttribute("viewBox") || svg.getAttribute("viewbox");
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(parseFloat).filter((n) => Number.isFinite(n));
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      vbW = parts[2];
      vbH = parts[3];
    }
  }
  let baseW = w > 0 ? w : vbW;
  let baseH = h > 0 ? h : vbH;
  if (!(baseW > 0)) baseW = vbW > 0 ? vbW : 300;
  if (!(baseH > 0)) baseH = vbH > 0 ? vbH : 150;
  const hasViewBox = vbW > 0 && vbH > 0;
  return { baseW, baseH, hasViewBox };
}

export default function SvgToPng() {
  const [svgText, setSvgText] = useState("");
  const [fileName, setFileName] = useState("");
  const [widthInput, setWidthInput] = useState("512");
  const [bgMode, setBgMode] = useState("transparent");
  const [customColor, setCustomColor] = useState("#ffffff");

  const [outputUrl, setOutputUrl] = useState("");
  const [outputSize, setOutputSize] = useState(0);
  const [outDims, setOutDims] = useState(null);
  const [srcDims, setSrcDims] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const outputUrlRef = useRef("");

  const effectiveBg = bgMode === "custom" ? customColor : bgMode;

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
  }, []);

  const clearOutput = useCallback(() => {
    revokeOutput();
    setOutputUrl("");
    setOutputSize(0);
    setOutDims(null);
  }, [revokeOutput]);

  useEffect(() => {
    return () => {
      revokeOutput();
    };
  }, [revokeOutput]);

  const renderNow = useCallback(
    (text, widthStr, bg, isCancelled) => {
      let svg;
      try {
        svg = parseSvg(text);
      } catch (err) {
        if (isCancelled()) return;
        clearOutput();
        setSrcDims(null);
        setError(err && err.message ? err.message : "That does not look like valid SVG.");
        return;
      }

      const { baseW, baseH, hasViewBox } = getDims(svg);
      const outW = clampInt(parseInt(widthStr, 10), 1, 10000, 512);
      const outH = Math.max(1, Math.round((outW * baseH) / baseW));

      // Force an explicit pixel size (and a viewBox if missing) so the image
      // rasterizes crisply at the requested width regardless of the original
      // sizing style.
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("width", String(outW));
      svg.setAttribute("height", String(outH));
      if (!hasViewBox) {
        svg.setAttribute("viewBox", `0 0 ${baseW} ${baseH}`);
      }

      let serialized;
      try {
        serialized = new XMLSerializer().serializeToString(svg);
      } catch (err) {
        if (isCancelled()) return;
        clearOutput();
        setError("This SVG could not be prepared for rendering.");
        return;
      }

      const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(svgUrl);
        if (isCancelled()) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get a canvas drawing context in this browser.");
          if (bg && bg !== "transparent") {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, outW, outH);
          }
          ctx.drawImage(image, 0, 0, outW, outH);
          canvas.toBlob((blob) => {
            if (isCancelled()) return;
            if (!blob) {
              clearOutput();
              setError("Could not export a PNG from this SVG.");
              return;
            }
            revokeOutput();
            const url = URL.createObjectURL(blob);
            outputUrlRef.current = url;
            setOutputUrl(url);
            setOutputSize(blob.size);
            setOutDims({ width: outW, height: outH });
            setSrcDims({ width: baseW, height: baseH });
            setError("");
          }, "image/png");
        } catch (err) {
          if (isCancelled()) return;
          clearOutput();
          setError(
            err && err.message
              ? err.message
              : "This SVG could not be rendered. It may reference external images or fonts."
          );
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        if (isCancelled()) return;
        clearOutput();
        setSrcDims(null);
        setError(
          "This SVG could not be rendered. It may contain errors or reference external resources that cannot be loaded here."
        );
      };

      image.src = svgUrl;
    },
    [clearOutput, revokeOutput]
  );

  // Reactive, debounced rendering. Keeps the PNG in sync with the markup and
  // the chosen width / background without a separate "convert" step.
  useEffect(() => {
    const text = svgText.trim();
    if (!text) {
      setError("");
      clearOutput();
      setSrcDims(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const hasComplete = /<svg[\s\S]*<\/svg\s*>/i.test(text);
      if (!hasComplete) {
        // An opening <svg with no close yet usually means the user is still
        // typing or pasting — wait quietly instead of flashing an error.
        if (/<svg[\s>]/i.test(text)) {
          setError("");
          return;
        }
        clearOutput();
        setSrcDims(null);
        setError("That does not look like SVG. Paste markup containing <svg> … </svg>, or upload an .svg file.");
        return;
      }
      renderNow(text, widthInput, effectiveBg, () => cancelled);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [svgText, widthInput, effectiveBg, renderNow, clearOutput]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const name = file.name || "";
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(name);
    if (!isSvg) {
      setError("Please choose an .svg file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setFileName(name || "image.svg");
      setError("");
      // Default the output width to the SVG's own width when we can read it.
      try {
        const svg = parseSvg(text);
        const { baseW } = getDims(svg);
        setWidthInput(String(clampInt(baseW, 1, 10000, 512)));
      } catch {
        /* leave the current width; rendering will surface any error */
      }
      setSvgText(text);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }, []);

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

  const clearAll = () => {
    setSvgText("");
    setFileName("");
    setError("");
    setSrcDims(null);
    clearOutput();
  };

  const downloadName = () => {
    const base = (fileName || "image").replace(/\.[^./\\]+$/, "");
    return `${base || "image"}.png`;
  };

  const previewHeight =
    srcDims && srcDims.width > 0
      ? Math.max(1, Math.round((clampInt(parseInt(widthInput, 10), 1, 10000, 512) * srcDims.height) / srcDims.width))
      : null;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="svg-to-png-file">
              SVG file
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
                {dragging ? "Drop your SVG here" : "Drag & drop an .svg file, or click to choose"}
              </div>
              <div className="dropzone-sub">{fileName ? fileName : "Or paste SVG markup below"}</div>
            </div>
            <input
              id="svg-to-png-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept=".svg,image/svg+xml"
              onChange={onInputChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="svg-to-png-markup">
              Or paste SVG markup
            </label>
            <textarea
              id="svg-to-png-markup"
              className="tool-textarea"
              rows={6}
              spellCheck={false}
              placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">…</svg>'
              value={svgText}
              onChange={(e) => setSvgText(e.target.value)}
            />
            <p className="tool-note">
              The PNG updates automatically. Everything runs in your browser — nothing is uploaded.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="svg-to-png-width">
              Output width (px)
            </label>
            <input
              id="svg-to-png-width"
              className="tool-input"
              type="number"
              min="1"
              max="10000"
              step="1"
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
            />
            <p className="tool-note">
              {previewHeight
                ? `Height scales automatically to keep the aspect ratio (≈ ${previewHeight} px tall).`
                : "Height scales automatically to keep the aspect ratio."}
            </p>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="svg-to-png-bg">
              Background
            </label>
            <select
              id="svg-to-png-bg"
              className="tool-select"
              value={bgMode}
              onChange={(e) => setBgMode(e.target.value)}
            >
              <option value="transparent">Transparent</option>
              <option value="#ffffff">White</option>
              <option value="#000000">Black</option>
              <option value="custom">Custom color…</option>
            </select>
            {bgMode === "custom" ? (
              <input
                aria-label="Custom background color"
                className="tool-input"
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                style={{ marginTop: "8px", height: "40px", padding: "2px" }}
              />
            ) : (
              <p className="tool-note">Transparent keeps the PNG&apos;s alpha channel.</p>
            )}
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {outputUrl && !error ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {outDims ? `${outDims.width} x ${outDims.height}` : "—"}
              </div>
              <div className="tool-stat-label">PNG pixels</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(outputSize)}</div>
              <div className="tool-stat-label">PNG size</div>
            </div>
            {srcDims ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {Math.round(srcDims.width)} x {Math.round(srcDims.height)}
                </div>
                <div className="tool-stat-label">SVG size</div>
              </div>
            ) : null}
          </div>

          <div className="tool-result" role="status" aria-live="polite">
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
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e8e8e8'/%3E%3Crect x='10' width='10' height='10' fill='%23ffffff'/%3E%3Crect y='10' width='10' height='10' fill='%23ffffff'/%3E%3C/svg%3E\")",
                }}
              >
                <img
                  src={outputUrl}
                  alt="Rendered PNG preview"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={outputUrl} download={downloadName()} role="button">
              Download PNG
            </a>
            <button type="button" className="btn" onClick={clearAll}>
              Clear
            </button>
          </div>
        </>
      ) : null}

      {!outputUrl && !error ? (
        <p className="tool-note">
          Upload an .svg file or paste SVG markup above to render it as a downloadable PNG.
        </p>
      ) : null}
    </div>
  );
}
