"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { copyText } from "../../lib/copyText";

// Character ramps ordered from darkest (left) to lightest (right).
// The classic 70-char ramp gives smooth tonal detail; the short one is
// punchier for small terminals; blocks use Unicode shading.
const RAMPS = {
  detailed:
    "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  standard: "@%#*+=-:. ",
  blocks: "█▓▒░ ",
  minimal: "#. ",
};

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|ico|avif|svg|tiff?)$/i;

export default function ImageToAscii() {
  const [imgSrc, setImgSrc] = useState("");
  const [fileName, setFileName] = useState("");
  const [imgEl, setImgEl] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Controls
  const [cols, setCols] = useState(100);
  const [ramp, setRamp] = useState("standard");
  const [invert, setInvert] = useState(false);
  const [contrast, setContrast] = useState(0); // -100..100
  const [brightness, setBrightness] = useState(0); // -100..100

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
      setError("Please choose an image file (PNG, JPG, GIF, WebP, BMP, etc.).");
      return;
    }
    setError("");
    setBusy(true);
    setFileName(file.name || "image");
    setImgEl(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target && e.target.result;
      if (!src) {
        setError("Could not read the selected file.");
        setBusy(false);
        return;
      }
      const img = new Image();
      img.onload = () => {
        setImgSrc(String(src));
        setImgEl(img);
        setBusy(false);
      };
      img.onerror = () => {
        setError("Could not decode that image. Try a different file.");
        setBusy(false);
      };
      img.src = String(src);
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

  // Convert the loaded image to ASCII. Recomputes whenever the image or any
  // control changes. Characters are ~2x taller than wide, so we halve the row
  // count relative to the column count to keep the aspect ratio looking right.
  const ascii = useMemo(() => {
    if (!imgEl) return "";
    const chars = RAMPS[ramp] || RAMPS.standard;
    const w = Math.max(10, Math.min(400, Math.round(cols)));
    const srcW = imgEl.naturalWidth || imgEl.width;
    const srcH = imgEl.naturalHeight || imgEl.height;
    if (!srcW || !srcH) return "";
    // 0.5 accounts for character cells being roughly twice as tall as wide.
    const h = Math.max(1, Math.round((srcH / srcW) * w * 0.5));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "";
    ctx.drawImage(imgEl, 0, 0, w, h);

    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (err) {
      return "";
    }

    // Precompute a contrast factor (standard formula) and brightness offset.
    const c = Math.max(-100, Math.min(100, contrast));
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    const bright = Math.max(-100, Math.min(100, brightness)) * 2.55;
    const maxIdx = chars.length - 1;

    let out = "";
    for (let y = 0; y < h; y++) {
      let line = "";
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        // Perceptual luminance (Rec. 601). Fully transparent pixels read as
        // white so cut-outs land on the lightest character.
        let lum = a === 0 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
        lum = factor * (lum - 128) + 128 + bright;
        if (lum < 0) lum = 0;
        else if (lum > 255) lum = 255;
        // Dark pixel -> dark (left) character. Invert flips the mapping.
        const t = invert ? lum / 255 : 1 - lum / 255;
        const idx = Math.round(t * maxIdx);
        line += chars[idx];
      }
      out += line + "\n";
    }
    return out;
  }, [imgEl, cols, ramp, invert, contrast, brightness]);

  const stats = useMemo(() => {
    if (!ascii) return null;
    const lines = ascii.replace(/\n$/, "").split("\n");
    return {
      rows: lines.length,
      colsUsed: lines[0] ? lines[0].length : 0,
      chars: ascii.length,
    };
  }, [ascii]);

  const doCopy = useCallback(async () => {
    if (!ascii) return;
    try {
      await copyText(ascii);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError("Copying failed. Select the text and copy it manually.");
    }
  }, [ascii]);

  const downloadTxt = useCallback(() => {
    if (!ascii) return;
    const blob = new Blob([ascii], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (fileName || "image").replace(/\.[^.]+$/, "");
    a.href = url;
    a.download = base + "-ascii.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [ascii, fileName]);

  // Render the ASCII to a PNG so it can be shared as an image.
  const downloadPng = useCallback(() => {
    if (!ascii) return;
    const lines = ascii.replace(/\n$/, "").split("\n");
    const fontSize = 10;
    const lineH = fontSize; // monospace, tight leading
    const charW = fontSize * 0.6;
    const padding = 16;
    const width = Math.ceil((lines[0] ? lines[0].length : 1) * charW + padding * 2);
    const height = Math.ceil(lines.length * lineH + padding * 2);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = invert ? "#111111" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = invert ? "#ffffff" : "#111111";
    ctx.font = fontSize + "px monospace";
    ctx.textBaseline = "top";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], padding, padding + i * lineH);
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = (fileName || "image").replace(/\.[^.]+$/, "");
      a.href = url;
      a.download = base + "-ascii.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [ascii, fileName, invert]);

  const handleClear = () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setImgSrc("");
    setFileName("");
    setImgEl(null);
    setError("");
    setBusy(false);
    setCopied(false);
  };

  const hasResult = !!ascii;

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
          PNG, JPG, GIF, WebP, BMP - converted to text art in your browser
        </div>
      </div>

      <label className="tool-label" htmlFor="ia-file" style={{ display: "none" }}>
        Choose image file
      </label>
      <input
        id="ia-file"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: "none" }}
      />

      {error ? <div className="tool-error">{error}</div> : null}
      {busy ? <div className="tool-note">Reading image...</div> : null}

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ia-cols">
              Width: {cols} characters
            </label>
            <input
              id="ia-cols"
              type="range"
              min="20"
              max="300"
              step="1"
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ia-ramp">
              Character set
            </label>
            <select
              id="ia-ramp"
              className="tool-select"
              value={ramp}
              onChange={(e) => setRamp(e.target.value)}
            >
              <option value="standard">Standard (@%#*+=-:. )</option>
              <option value="detailed">Detailed (70 shades)</option>
              <option value="blocks">Block shading (unicode)</option>
              <option value="minimal">Minimal (#. )</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ia-contrast">
              Contrast: {contrast}
            </label>
            <input
              id="ia-contrast"
              type="range"
              min="-100"
              max="100"
              step="1"
              value={contrast}
              onChange={(e) => setContrast(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ia-brightness">
              Brightness: {brightness}
            </label>
            <input
              id="ia-brightness"
              type="range"
              min="-100"
              max="100"
              step="1"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="ia-invert">
            <input
              id="ia-invert"
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
            />{" "}
            Invert (use for light subjects on a dark background)
          </label>
        </div>
      </div>

      {hasResult ? (
        <>
          {stats ? (
            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.colsUsed}</div>
                <div className="tool-stat-label">Columns</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.rows}</div>
                <div className="tool-stat-label">Rows</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {stats.chars.toLocaleString()}
                </div>
                <div className="tool-stat-label">Characters</div>
              </div>
            </div>
          ) : null}

          <div className="tool-actions">
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn btn-primary"}
              onClick={doCopy}
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
            <button type="button" className="btn" onClick={downloadTxt}>
              Download .txt
            </button>
            <button type="button" className="btn" onClick={downloadPng}>
              Download .png
            </button>
            <button type="button" className="btn" onClick={handleClear}>
              Clear
            </button>
          </div>

          <pre
            className="tool-output"
            role="status"
            aria-live="polite"
            style={{
              fontSize: "6px",
              lineHeight: "6px",
              letterSpacing: 0,
              whiteSpace: "pre",
              overflowX: "auto",
            }}
          >
            {ascii}
          </pre>

          <p className="tool-note">
            Text is tiny so the whole picture fits - copy or download it, then
            paste into a monospace font (a code editor, terminal, or README) to
            see it full size. Character cells are taller than they are wide, so
            the row count is scaled to keep the proportions right.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Upload an image to turn it into ASCII text art. Widen it for more
          detail, pick a character set, and nudge contrast until the shapes read
          clearly. Everything runs in your browser - the image is never
          uploaded anywhere.
        </p>
      )}
    </div>
  );
}
