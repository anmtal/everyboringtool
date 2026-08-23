"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Human-friendly byte formatting for the stat grid.
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Parse a numeric input to a finite number, clamped to [min, max], else fallback.
function clampNum(raw, min, max, fallback) {
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// The classic Impact meme font stack. All of these are system fonts on common
// platforms, so no web font needs to load before we can measure/draw text.
const MEME_FONT =
  "'Impact', 'Anton', 'Arial Narrow Bold', 'Haettenschweiler', 'Franklin Gothic Bold', 'Oswald', sans-serif";

export default function MemeGenerator() {
  const [fileName, setFileName] = useState("");
  const [origSize, setOrigSize] = useState(0);
  const [natural, setNatural] = useState(null); // { w, h }
  const [imgReady, setImgReady] = useState(false);

  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontScale, setFontScale] = useState(10); // percent of image height
  const [fillColor, setFillColor] = useState("#ffffff");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [uppercase, setUppercase] = useState(true);

  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null); // loaded HTMLImageElement
  const canvasRef = useRef(null); // visible preview canvas

  // ---- Text wrapping ----------------------------------------------------
  // Break a string into lines that each fit within maxWidth, honoring explicit
  // newlines and breaking any single word that is itself wider than maxWidth.
  const wrapLines = useCallback((ctx, text, maxWidth) => {
    const out = [];
    const paragraphs = String(text).split("\n");
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;
      let cur = "";
      for (const w of words) {
        // A word too wide to ever fit: break it character by character.
        if (ctx.measureText(w).width > maxWidth) {
          if (cur) {
            out.push(cur);
            cur = "";
          }
          let chunk = "";
          for (const ch of w) {
            const test = chunk + ch;
            if (!chunk || ctx.measureText(test).width <= maxWidth) {
              chunk = test;
            } else {
              out.push(chunk);
              chunk = ch;
            }
          }
          cur = chunk;
          continue;
        }
        const test = cur ? `${cur} ${w}` : w;
        if (!cur || ctx.measureText(test).width <= maxWidth) {
          cur = test;
        } else {
          out.push(cur);
          cur = w;
        }
      }
      if (cur) out.push(cur);
    }
    return out;
  }, []);

  // Draw one block of wrapped text anchored to the top or bottom of the canvas.
  const drawBlock = useCallback(
    (ctx, text, position, dims, fontSize, lineWidth) => {
      if (!text) return;
      const { w, h } = dims;
      const maxWidth = w * 0.92;
      const pad = h * 0.03;
      const lineHeight = fontSize * 1.12;

      const lines = wrapLines(ctx, text, maxWidth);
      if (lines.length === 0) return;

      const total = lines.length * lineHeight;
      const startY =
        position === "top" ? pad : Math.max(pad, h - pad - total);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = outlineColor;
      ctx.fillStyle = fillColor;

      const x = w / 2;
      lines.forEach((line, i) => {
        const y = startY + i * lineHeight;
        if (lineWidth > 0) ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
      });
      ctx.restore();
    },
    [wrapLines, fillColor, outlineColor]
  );

  // ---- Full redraw ------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !natural) return;

    canvas.width = natural.w;
    canvas.height = natural.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, natural.w, natural.h);

    // Font size is a percentage of the image height so it looks right on
    // both tiny and huge images.
    const scale = clampNum(fontScale, 2, 30, 10);
    const fontSize = Math.max(6, (natural.h * scale) / 100);
    const lineWidth = Math.max(2, fontSize * 0.11);

    ctx.font = `bold ${fontSize}px ${MEME_FONT}`;

    const top = uppercase ? topText.toUpperCase() : topText;
    const bottom = uppercase ? bottomText.toUpperCase() : bottomText;

    drawBlock(ctx, top, "top", natural, fontSize, lineWidth);
    drawBlock(ctx, bottom, "bottom", natural, fontSize, lineWidth);
  }, [natural, fontScale, uppercase, topText, bottomText, drawBlock]);

  // Redraw whenever any input changes and an image is loaded.
  useEffect(() => {
    if (imgReady) draw();
  }, [imgReady, draw]);

  // ---- File loading -----------------------------------------------------
  const loadFile = useCallback((file) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF, etc.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          setError("Couldn't read that image — it may be corrupted.");
          return;
        }
        imgRef.current = img;
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setOrigSize(file.size);
        setFileName(file.name || "image");
        setImgReady(true);
      };
      img.onerror = () => {
        setError(
          "Couldn't read that image — it may be corrupted or an unsupported format."
        );
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      setError("Couldn't read that file. Please try another image.");
    };
    reader.readAsDataURL(file);
  }, []);

  function onInput(e) {
    const file = e.target.files && e.target.files[0];
    loadFile(file);
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  }

  function openPicker() {
    const el = document.getElementById("meme-file-input");
    if (el) el.click();
  }

  // ---- Download ---------------------------------------------------------
  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !imgReady) {
      setError("Upload an image first.");
      return;
    }
    setError("");
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          setError("Export failed — try a smaller image.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const base = fileName.replace(/\.[^.]+$/, "") || "meme";
        const a = document.createElement("a");
        a.href = url;
        a.download = `${base}-meme.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke on the next tick so the download has time to start.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch {
      setError("Something went wrong while exporting. Try a different image.");
    }
  }

  function reset() {
    imgRef.current = null;
    setImgReady(false);
    setNatural(null);
    setFileName("");
    setOrigSize(0);
    setTopText("");
    setBottomText("");
    setError("");
  }

  const fontSizePx = natural
    ? Math.round((natural.h * clampNum(fontScale, 2, 30, 10)) / 100)
    : 0;

  return (
    <div className="tool">
      {!imgReady && (
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            (e.preventDefault(), openPicker())
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={
            dragOver
              ? { borderColor: "currentColor", opacity: 0.85 }
              : undefined
          }
        >
          <input
            id="meme-file-input"
            type="file"
            accept="image/*"
            onChange={onInput}
            hidden
          />
          <p className="dropzone-title">Drop an image here, or click to choose</p>
          <p className="dropzone-sub">
            Everything happens in your browser — your image is never uploaded to
            a server.
          </p>
        </div>
      )}

      {imgReady && natural && (
        <>
          <div
            style={{
              margin: "0.25rem 0 1rem",
              padding: "0.75rem",
              border: "1px solid rgba(128,128,128,0.3)",
              borderRadius: 10,
              background: "rgba(128,128,128,0.06)",
              textAlign: "center",
              lineHeight: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="Live meme preview"
              style={{
                maxWidth: "100%",
                maxHeight: 460,
                height: "auto",
                borderRadius: 6,
                display: "inline-block",
              }}
            />
          </div>

          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="meme-top">
                Top text
              </label>
              <input
                id="meme-top"
                className="tool-input"
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="ONE DOES NOT SIMPLY"
                maxLength={200}
              />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="meme-bottom">
                Bottom text
              </label>
              <input
                id="meme-bottom"
                className="tool-input"
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="MAKE A MEME WITHOUT THIS TOOL"
                maxLength={200}
              />
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="meme-size">
                  Font size ({fontSizePx}px)
                </label>
                <input
                  id="meme-size"
                  className="tool-input"
                  type="range"
                  min="2"
                  max="30"
                  step="0.5"
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                />
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="meme-fill">
                  Text color
                </label>
                <input
                  id="meme-fill"
                  className="tool-input"
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  style={{ height: 44, padding: 4 }}
                />
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="meme-outline">
                  Outline color
                </label>
                <input
                  id="meme-outline"
                  className="tool-input"
                  type="color"
                  value={outlineColor}
                  onChange={(e) => setOutlineColor(e.target.value)}
                  style={{ height: 44, padding: 4 }}
                />
              </div>
            </div>

            <div className="tool-field">
              <label
                className="tool-label"
                htmlFor="meme-caps"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  id="meme-caps"
                  type="checkbox"
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                />
                Force UPPERCASE (classic meme style)
              </label>
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural.w} × {natural.h}
              </div>
              <div className="tool-stat-label">Image size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fontSizePx}px</div>
              <div className="tool-stat-label">Font size</div>
            </div>
          </div>

          <p className="tool-note">
            Long lines wrap automatically. The image is exported as a PNG at its
            full original resolution.
          </p>

          {error && (
            <p className="tool-error" role="alert">
              {error}
            </p>
          )}

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-success"
              onClick={download}
            >
              ↓ Download PNG
            </button>
            <button type="button" className="btn" onClick={openPicker}>
              Change image
            </button>
            <button type="button" className="btn" onClick={reset}>
              Reset
            </button>
            <input
              id="meme-file-input"
              type="file"
              accept="image/*"
              onChange={onInput}
              hidden
            />
          </div>
        </>
      )}

      {!imgReady && error && (
        <p className="tool-error" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
