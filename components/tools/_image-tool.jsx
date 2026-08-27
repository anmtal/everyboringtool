"use client";

// Shared shell for single-image canvas tools. A tool supplies a draw(ctx, img,
// opts, canvas) function that sizes the canvas and paints the result; the shell
// handles the file input, preview, run/error/result and download. Everything is
// client-side canvas work — the image is never uploaded. Not a routable tool
// (underscore-prefixed); only imported by the individual image tools.
import { useState, useRef, useEffect } from "react";

function fmtBytes(b) {
  if (!Number.isFinite(b) || b <= 0) return "—";
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export default function ImageTool({
  fileLabel = "Choose an image",
  renderOptions,
  defaultOptions = {},
  draw,
  outType = "image/png",
  outQuality,
  outExt = "png",
  actionLabel = "Apply",
  note,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [opts, setOpts] = useState(defaultOptions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const imgRef = useRef(null);
  const previewRef = useRef("");
  const outRef = useRef("");

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    if (outRef.current) URL.revokeObjectURL(outRef.current);
  }, []);

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!f.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|bmp|ico|avif|svg|tiff?)$/i.test(f.name)) { setError("Please choose an image file (PNG, JPG, WebP, etc.)."); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(f); previewRef.current = url;
    const img = new Image();
    img.onload = () => { imgRef.current = img; setFile(f); setPreviewUrl(url); };
    img.onerror = () => { URL.revokeObjectURL(url); previewRef.current = ""; setError("Couldn't read that image — it may be corrupted or unsupported."); };
    img.src = url;
  }

  const setOpt = (k, v) => { setOpts((o) => ({ ...o, [k]: v })); setResult(null); };

  function run() {
    if (!imgRef.current) return;
    setBusy(true); setError("");
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        draw(ctx, imgRef.current, opts, canvas);
        canvas.toBlob((blob) => {
          if (!blob) { setBusy(false); setError("Export failed — try a different image."); return; }
          if (outRef.current) URL.revokeObjectURL(outRef.current);
          const url = URL.createObjectURL(blob); outRef.current = url;
          const base = (file.name || "image").replace(/\.[^.]+$/, "") || "image";
          setResult({ url, size: blob.size, name: `${base}.${outExt}`, w: canvas.width, h: canvas.height });
          setBusy(false);
        }, outType, outQuality);
      } catch {
        setBusy(false);
        setError("Something went wrong. Try a different image.");
      }
    }, 20);
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="it-file">{fileLabel}</label>
        <input id="it-file" className="tool-input" type="file" accept="image/*" onChange={onFile} />
        <p className="tool-note">Everything happens in your browser — your image is never uploaded.</p>
      </div>

      {previewUrl && !result && (
        <div style={{ margin: "0.5rem 0 1rem", lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview of the uploaded image" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, display: "block" }} />
        </div>
      )}

      {file && renderOptions && <div className="tool-fields">{renderOptions(opts, setOpt, busy)}</div>}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {file && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Working…" : actionLabel}</button>
          {result && <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {outExt.toUpperCase()} ({result.w}×{result.h})</a>}
        </div>
      )}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Result" style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8, marginTop: 8 }} />
        </div>
      )}

      {note}
    </div>
  );
}
