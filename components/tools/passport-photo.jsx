"use client";

import { useState, useEffect, useRef, useMemo } from "react";

// mm -> px at a given DPI (1 inch = 25.4 mm).
function mmToPx(mm, dpi) {
  return Math.round((mm / 25.4) * dpi);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Document presets. w/h in millimetres; headTop/headBottom are guide fractions
// (share of photo height where the crown and chin should sit). These are common
// published requirements; always confirm against the official spec before use.
const PRESETS = [
  { id: "us2x2", label: "US Passport / Visa — 2×2 in (50.8×50.8 mm)", w: 50.8, h: 50.8, dpi: 300, headTop: 0.12, headBottom: 0.82 },
  { id: "schengen", label: "Schengen / EU Visa — 35×45 mm", w: 35, h: 45, dpi: 300, headTop: 0.08, headBottom: 0.86 },
  { id: "uk", label: "UK Passport — 35×45 mm", w: 35, h: 45, dpi: 300, headTop: 0.08, headBottom: 0.86 },
  { id: "india", label: "India Passport — 35×45 mm", w: 35, h: 45, dpi: 300, headTop: 0.08, headBottom: 0.86 },
  { id: "canada", label: "Canada Passport — 50×70 mm", w: 50, h: 70, dpi: 300, headTop: 0.18, headBottom: 0.66 },
  { id: "australia", label: "Australia Passport — 35×45 mm", w: 35, h: 45, dpi: 300, headTop: 0.08, headBottom: 0.86 },
  { id: "china", label: "China Passport / Visa — 33×48 mm", w: 33, h: 48, dpi: 300, headTop: 0.10, headBottom: 0.84 },
  { id: "japan", label: "Japan Passport — 35×45 mm", w: 35, h: 45, dpi: 300, headTop: 0.08, headBottom: 0.86 },
  { id: "custom", label: "Custom size…", w: 35, h: 45, dpi: 300, headTop: 0.08, headBottom: 0.86 },
];

const BACKGROUNDS = [
  { id: "#ffffff", label: "White" },
  { id: "#f4f4f2", label: "Off-white" },
  { id: "#e9edf2", label: "Light gray" },
  { id: "#dbe6f2", label: "Light blue" },
];

const SHEETS = [
  { id: "4x6", label: "4×6 in photo paper", w: 152.4, h: 101.6 },
  { id: "5x7", label: "5×7 in photo paper", w: 177.8, h: 127 },
  { id: "a4", label: "A4 paper", w: 210, h: 297 },
  { id: "letter", label: "US Letter", w: 215.9, h: 279.4 },
];

export default function PassportPhoto() {
  const [fileName, setFileName] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }

  const [presetId, setPresetId] = useState("us2x2");
  const [customW, setCustomW] = useState("35");
  const [customH, setCustomH] = useState("45");
  const [customDpi, setCustomDpi] = useState("300");

  const [bg, setBg] = useState("#ffffff");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // fractions of frame
  const [format, setFormat] = useState("image/jpeg");
  const [sheetId, setSheetId] = useState("4x6");
  const [showGuide, setShowGuide] = useState(true);

  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [outKind, setOutKind] = useState(""); // "single" | "sheet"
  const [outCount, setOutCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const outUrlRef = useRef("");
  const dragRef = useRef({ active: false, x: 0, y: 0 });

  const preset = useMemo(() => {
    const base = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
    if (presetId !== "custom") return base;
    const w = Math.min(Math.max(parseFloat(customW) || 0, 10), 300);
    const h = Math.min(Math.max(parseFloat(customH) || 0, 10), 300);
    const dpi = Math.min(Math.max(parseInt(customDpi, 10) || 0, 72), 1200);
    return { ...base, w, h, dpi };
  }, [presetId, customW, customH, customDpi]);

  const targetW = mmToPx(preset.w, preset.dpi);
  const targetH = mmToPx(preset.h, preset.dpi);

  // Preview display dimensions, keeping the document aspect ratio.
  const previewDims = useMemo(() => {
    const maxW = 320;
    const maxH = 340;
    const scale = Math.min(maxW / preset.w, maxH / preset.h);
    return { w: Math.round(preset.w * scale), h: Math.round(preset.h * scale) };
  }, [preset.w, preset.h]);

  useEffect(() => {
    return () => {
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    };
  }, []);

  function resetOutput() {
    if (outUrlRef.current) {
      URL.revokeObjectURL(outUrlRef.current);
      outUrlRef.current = "";
    }
    setOutUrl("");
    setOutSize(0);
    setOutCount(0);
    setOutKind("");
  }

  // Core: paint the image into a WxH context using the current transform.
  // Resolution-independent — the same math drives the small preview and the
  // full-resolution export because pan is a fraction of W/H and zoom is a
  // multiplier on a cover-scale.
  function drawPhoto(ctx, W, H) {
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const img = imgRef.current;
    if (img) {
      const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const drawW = img.naturalWidth * cover * zoom;
      const drawH = img.naturalHeight * cover * zoom;
      const cx = W / 2 + offset.x * W;
      const cy = H / 2 + offset.y * H;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    }
    ctx.restore();
  }

  function drawGuideOverlay(ctx, W, H) {
    const topY = preset.headTop * H;
    const botY = preset.headBottom * H;
    ctx.save();
    ctx.strokeStyle = "rgba(37, 99, 235, 0.9)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    // Crown & chin lines.
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(W, topY);
    ctx.moveTo(0, botY);
    ctx.lineTo(W, botY);
    ctx.stroke();
    // Head oval between the lines.
    const ovalH = botY - topY;
    const ovalW = ovalH * 0.72;
    ctx.beginPath();
    ctx.ellipse(W / 2, (topY + botY) / 2, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Vertical centre line.
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "rgba(37, 99, 235, 0.45)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  // Redraw the live preview whenever anything changes.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = Math.round(previewDims.w * dpr);
    canvas.height = Math.round(previewDims.h * dpr);
    canvas.style.width = `${previewDims.w}px`;
    canvas.style.height = `${previewDims.h}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPhoto(ctx, previewDims.w, previewDims.h);
    if (showGuide) drawGuideOverlay(ctx, previewDims.w, previewDims.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewDims, zoom, offset, bg, showGuide, natural, preset.headTop, preset.headBottom]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    resetOutput();
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, HEIC exported to JPG, etc.).");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setFileName(file.name || "photo");
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Couldn't read that image — it may be corrupted or an unsupported format.");
    };
    img.src = url;
    e.target.value = "";
  }

  // Drag to reposition the photo inside the frame.
  function onPointerDown(e) {
    if (!natural) return;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = (e.clientX - d.x) / previewDims.w;
    const dy = (e.clientY - d.y) / previewDims.h;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    setOffset((o) => ({
      x: Math.min(Math.max(o.x + dx, -1.5), 1.5),
      y: Math.min(Math.max(o.y + dy, -1.5), 1.5),
    }));
    resetOutput();
  }
  function onPointerUp(e) {
    dragRef.current = { active: false, x: 0, y: 0 };
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function onZoom(e) {
    setZoom(parseFloat(e.target.value));
    resetOutput();
  }

  function recenter() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    resetOutput();
  }

  // Render the final photo (no guides) at full print resolution.
  function makePhotoCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    drawPhoto(ctx, targetW, targetH);
    return canvas;
  }

  const baseName = (fileName.replace(/\.[^.]+$/, "") || "passport") + "-" + preset.w + "x" + preset.h;
  const ext = format === "image/png" ? "png" : "jpg";

  function publish(canvas, kind, count) {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          setError("Export failed — try a smaller size or a different format.");
          return;
        }
        if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
        const url = URL.createObjectURL(blob);
        outUrlRef.current = url;
        setOutUrl(url);
        setOutSize(blob.size);
        setOutKind(kind);
        setOutCount(count);
        setBusy(false);
      },
      format,
      format === "image/jpeg" ? 0.92 : undefined
    );
  }

  function exportSingle() {
    if (!imgRef.current) {
      setError("Upload a photo first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      publish(makePhotoCanvas(), "single", 1);
    } catch {
      setBusy(false);
      setError("Something went wrong while exporting. Try a different photo.");
    }
  }

  function exportSheet() {
    if (!imgRef.current) {
      setError("Upload a photo first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const sheet = SHEETS.find((s) => s.id === sheetId) || SHEETS[0];
      const dpi = preset.dpi;
      const sheetW = mmToPx(sheet.w, dpi);
      const sheetH = mmToPx(sheet.h, dpi);
      const gap = mmToPx(4, dpi); // 4mm gutter between photos
      const margin = mmToPx(4, dpi);
      const photo = makePhotoCanvas();

      const cols = Math.max(1, Math.floor((sheetW - 2 * margin + gap) / (targetW + gap)));
      const rows = Math.max(1, Math.floor((sheetH - 2 * margin + gap) / (targetH + gap)));
      const count = cols * rows;

      const canvas = document.createElement("canvas");
      canvas.width = sheetW;
      canvas.height = sheetH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sheetW, sheetH);

      const gridW = cols * targetW + (cols - 1) * gap;
      const gridH = rows * targetH + (rows - 1) * gap;
      const startX = Math.round((sheetW - gridW) / 2);
      const startY = Math.round((sheetH - gridH) / 2);

      ctx.strokeStyle = "#c8c8c8";
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = startX + c * (targetW + gap);
          const py = startY + r * (targetH + gap);
          ctx.drawImage(photo, px, py, targetW, targetH);
          ctx.strokeRect(px + 0.5, py + 0.5, targetW - 1, targetH - 1); // cut guide
        }
      }
      // Sheets are always JPEG-friendly; keep the user's chosen format.
      publish(canvas, "sheet", count);
    } catch {
      setBusy(false);
      setError("Something went wrong while building the print sheet.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="pp-file">
          Choose a head-and-shoulders photo
        </label>
        <input id="pp-file" className="tool-input" type="file" accept="image/*" onChange={onFile} />
        <p className="tool-note">
          100% private — your photo is processed in your browser and never uploaded to a server.
        </p>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pp-preset">
            Document / country
          </label>
          <select
            id="pp-preset"
            className="tool-select"
            value={presetId}
            onChange={(e) => {
              setPresetId(e.target.value);
              resetOutput();
            }}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {presetId === "custom" && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="pp-cw">
                Width (mm)
              </label>
              <input
                id="pp-cw"
                className="tool-input"
                type="number"
                min="10"
                max="300"
                inputMode="decimal"
                value={customW}
                onChange={(e) => {
                  setCustomW(e.target.value);
                  resetOutput();
                }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="pp-ch">
                Height (mm)
              </label>
              <input
                id="pp-ch"
                className="tool-input"
                type="number"
                min="10"
                max="300"
                inputMode="decimal"
                value={customH}
                onChange={(e) => {
                  setCustomH(e.target.value);
                  resetOutput();
                }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="pp-dpi">
                DPI
              </label>
              <input
                id="pp-dpi"
                className="tool-input"
                type="number"
                min="72"
                max="1200"
                inputMode="numeric"
                value={customDpi}
                onChange={(e) => {
                  setCustomDpi(e.target.value);
                  resetOutput();
                }}
              />
            </div>
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pp-bg">
              Background
            </label>
            <select
              id="pp-bg"
              className="tool-select"
              value={bg}
              onChange={(e) => {
                setBg(e.target.value);
                resetOutput();
              }}
            >
              {BACKGROUNDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pp-format">
              Output format
            </label>
            <select
              id="pp-format"
              className="tool-select"
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                resetOutput();
              }}
            >
              <option value="image/jpeg">JPG (recommended)</option>
              <option value="image/png">PNG</option>
            </select>
          </div>
        </div>
      </div>

      {!natural && (
        <p className="tool-note">
          Upload a clear, front-facing photo with even lighting. Once loaded you can drag to
          position your face and zoom to fit the head-size guide, then download a single photo or a
          ready-to-print sheet.
        </p>
      )}

      {natural && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "1rem 0 0.5rem",
            }}
          >
            <canvas
              ref={previewCanvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{
                touchAction: "none",
                cursor: dragRef.current.active ? "grabbing" : "grab",
                borderRadius: 6,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                maxWidth: "100%",
              }}
              aria-label="Photo preview — drag to reposition your face"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pp-zoom">
              Zoom
            </label>
            <input
              id="pp-zoom"
              className="tool-input"
              type="range"
              min="0.5"
              max="3"
              step="0.01"
              value={zoom}
              onChange={onZoom}
            />
          </div>

          <div className="tool-actions">
            <button type="button" className="btn" onClick={() => setShowGuide((s) => !s)}>
              {showGuide ? "Hide head guide" : "Show head guide"}
            </button>
            <button type="button" className="btn" onClick={recenter}>
              Recenter
            </button>
          </div>

          <p className="tool-note">
            Line up the top of your head with the upper guide line and your chin with the lower one,
            keeping your eyes near the centre. The blue guide is not saved into the exported photo.
          </p>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {preset.w} × {preset.h} mm
              </div>
              <div className="tool-stat-label">Photo size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {targetW} × {targetH}
              </div>
              <div className="tool-stat-label">Pixels @ {preset.dpi} DPI</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {natural.w} × {natural.h}
              </div>
              <div className="tool-stat-label">Your upload (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Last export</div>
            </div>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pp-sheet">
              Print-sheet paper
            </label>
            <select
              id="pp-sheet"
              className="tool-select"
              value={sheetId}
              onChange={(e) => {
                setSheetId(e.target.value);
                resetOutput();
              }}
            >
              {SHEETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="tool-error" role="alert">
              {error}
            </p>
          )}

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={exportSingle} disabled={busy}>
              {busy ? "Working…" : "Export single photo"}
            </button>
            <button type="button" className="btn btn-primary" onClick={exportSheet} disabled={busy}>
              {busy ? "Working…" : "Build print sheet"}
            </button>
            {outUrl && (
              <a
                className="btn btn-success"
                href={outUrl}
                download={
                  outKind === "sheet"
                    ? `${baseName}-sheet-${sheetId}.${ext}`
                    : `${baseName}.${ext}`
                }
              >
                ↓ Download {outKind === "sheet" ? `sheet (${outCount} photos)` : "photo"}
              </a>
            )}
          </div>

          {natural && (natural.w < targetW || natural.h < targetH) && (
            <p className="tool-note">
              Heads up: your upload is smaller than the required {targetW}×{targetH}px, so the
              exported photo will be upscaled and may look soft. For best print quality use a photo
              at least that large.
            </p>
          )}
        </>
      )}
    </div>
  );
}
