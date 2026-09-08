"use client";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";

const PRESETS = [
  { id: "original", name: "Original", f: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, invert: 0, blur: 0 } },
  { id: "vivid", name: "Vivid", f: { brightness: 105, contrast: 115, saturate: 145, grayscale: 0, sepia: 0, hue: 0, invert: 0, blur: 0 } },
  { id: "bw", name: "B & W", f: { brightness: 105, contrast: 110, saturate: 0, grayscale: 100, sepia: 0, hue: 0, invert: 0, blur: 0 } },
  { id: "sepia", name: "Sepia", f: { brightness: 105, contrast: 95, saturate: 90, grayscale: 0, sepia: 80, hue: 0, invert: 0, blur: 0 } },
  { id: "vintage", name: "Vintage", f: { brightness: 108, contrast: 92, saturate: 80, grayscale: 0, sepia: 45, hue: 350, invert: 0, blur: 0 } },
  { id: "warm", name: "Warm", f: { brightness: 104, contrast: 102, saturate: 120, grayscale: 0, sepia: 25, hue: 8, invert: 0, blur: 0 } },
  { id: "cool", name: "Cool", f: { brightness: 100, contrast: 105, saturate: 105, grayscale: 0, sepia: 0, hue: 200, invert: 0, blur: 0 } },
  { id: "fade", name: "Fade", f: { brightness: 112, contrast: 82, saturate: 78, grayscale: 0, sepia: 12, hue: 0, invert: 0, blur: 0 } },
  { id: "dramatic", name: "Dramatic", f: { brightness: 96, contrast: 145, saturate: 118, grayscale: 0, sepia: 0, hue: 0, invert: 0, blur: 0 } },
  { id: "noir", name: "Noir", f: { brightness: 92, contrast: 160, saturate: 0, grayscale: 100, sepia: 0, hue: 0, invert: 0, blur: 0 } },
  { id: "sunset", name: "Sunset", f: { brightness: 106, contrast: 108, saturate: 135, grayscale: 0, sepia: 30, hue: 340, invert: 0, blur: 0 } },
  { id: "invert", name: "Invert", f: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, invert: 100, blur: 0 } },
];

const DEFAULTS = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, invert: 0, blur: 0 };

const SLIDERS = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
  { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
  { key: "saturate", label: "Saturation", min: 0, max: 200, unit: "%" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%" },
  { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
  { key: "hue", label: "Hue rotate", min: 0, max: 360, unit: "°" },
  { key: "invert", label: "Invert", min: 0, max: 100, unit: "%" },
  { key: "blur", label: "Blur", min: 0, max: 20, unit: "px" },
];

function filterString(f) {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturate}%)`,
    `grayscale(${f.grayscale}%)`,
    `sepia(${f.sepia}%)`,
    `hue-rotate(${f.hue}deg)`,
    `invert(${f.invert}%)`,
    `blur(${f.blur}px)`,
  ].join(" ");
}

export default function PhotoFilters() {
  const [img, setImg] = useState(null);
  const [fileName, setFileName] = useState("");
  const [f, setF] = useState({ ...DEFAULTS });
  const [activePreset, setActivePreset] = useState("original");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  const css = useMemo(() => filterString(f), [f]);

  const setVal = (key, value) => {
    setActivePreset("");
    setF((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const applyPreset = (p) => {
    setActivePreset(p.id);
    setF({ ...p.f });
  };

  const reset = () => {
    setActivePreset("original");
    setF({ ...DEFAULTS });
  };

  const onFile = (e) => {
    setError("");
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, WebP, GIF).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const image = new Image();
      image.onload = () => {
        setImg(image);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      };
      image.onerror = () => setError("Could not load that image. Try a different file.");
      image.src = ev.target.result;
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const renderToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return null;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.filter = css;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }, [img, css]);

  useEffect(() => {
    renderToCanvas();
  }, [renderToCanvas]);

  const download = () => {
    const canvas = renderToCanvas();
    if (!canvas) return;
    setBusy(true);
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError("Export failed. Try a smaller image.");
            setBusy(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName || "photo"}-filtered.png`;
          a.click();
          URL.revokeObjectURL(url);
          setBusy(false);
        },
        "image/png"
      );
    } catch (err) {
      setError("Export failed in this browser.");
      setBusy(false);
    }
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pf-file">Choose a photo</label>
          <input id="pf-file" className="tool-input" type="file" accept="image/*" onChange={onFile} />
          <p className="tool-note">Your photo stays on your device. Nothing is uploaded or sent anywhere.</p>
        </div>
      </div>

      {error ? <p className="tool-error" role="alert">{error}</p> : null}

      {!img ? (
        <p className="tool-note">Select an image above to start filtering. Pick a preset or fine-tune the sliders, then download the result as a PNG.</p>
      ) : (
        <>
          <div className="tool-field">
            <span className="tool-label">Filter presets</span>
            <div className="tool-actions" style={{ flexWrap: "wrap" }}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`btn ${activePreset === p.id ? "btn-primary" : ""}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">Live preview</span>
            <div className="tool-result-value">
              <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto", borderRadius: 6 }} />
            </div>
          </div>

          <div className="tool-fields">
            {SLIDERS.map((s) => (
              <div className="tool-field" key={s.key}>
                <label className="tool-label" htmlFor={`pf-${s.key}`}>
                  {s.label}: {f[s.key]}{s.unit}
                </label>
                <input
                  id={`pf-${s.key}`}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step="1"
                  value={f[s.key]}
                  onChange={(e) => setVal(s.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="tool-actions">
            <button type="button" className="btn btn-success" onClick={download} disabled={busy}>
              {busy ? "Preparing…" : "Download PNG"}
            </button>
            <button type="button" className="btn" onClick={reset}>Reset</button>
          </div>
          <p className="tool-note">
            The download is a full-resolution PNG with the current filter baked in. Filters are applied in your browser using the Canvas API, so the exported quality matches what you see in the preview.
          </p>
        </>
      )}
    </div>
  );
}
