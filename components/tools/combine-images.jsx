"use client";

import { useState, useRef, useEffect } from "react";

function fmtBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function loadImages(files) {
  return Promise.all([...files].map((f) => new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => { img._url = url; res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
    img.src = url;
  })));
}

export default function CombineImages() {
  const [files, setFiles] = useState([]);
  const [dir, setDir] = useState("vertical");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");

  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  function onFiles(e) {
    const fs = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    setError(""); setResult(null);
    setFiles(fs);
    if (fs.length < 2) setError("Choose at least two images.");
  }

  async function run() {
    if (files.length < 2) { setError("Choose at least two images."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const imgs = await loadImages(files);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (dir === "vertical") {
        const w = Math.max(...imgs.map((i) => i.naturalWidth));
        const heights = imgs.map((i) => Math.round(i.naturalHeight * (w / i.naturalWidth)));
        canvas.width = w;
        canvas.height = heights.reduce((s, x) => s + x, 0);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        let y = 0;
        imgs.forEach((i, k) => { ctx.drawImage(i, 0, y, w, heights[k]); y += heights[k]; });
      } else {
        const h = Math.max(...imgs.map((i) => i.naturalHeight));
        const widths = imgs.map((i) => Math.round(i.naturalWidth * (h / i.naturalHeight)));
        canvas.width = widths.reduce((s, x) => s + x, 0);
        canvas.height = h;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        let x = 0;
        imgs.forEach((i, k) => { ctx.drawImage(i, x, 0, widths[k], h); x += widths[k]; });
      }
      imgs.forEach((i) => URL.revokeObjectURL(i._url));
      canvas.toBlob((blob) => {
        if (!blob) { setBusy(false); setError("Export failed — try fewer or smaller images."); return; }
        if (outRef.current) URL.revokeObjectURL(outRef.current);
        const url = URL.createObjectURL(blob); outRef.current = url;
        setResult({ url, size: blob.size, w: canvas.width, h: canvas.height });
        setBusy(false);
      }, "image/png");
    } catch {
      setBusy(false);
      setError("Couldn't combine those images — one may be corrupted or unsupported.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ci-files">Choose two or more images</label>
        <input id="ci-files" className="tool-input" type="file" accept="image/*" multiple onChange={onFiles} />
        <p className="tool-note">Everything happens in your browser — your images are never uploaded.</p>
      </div>

      {files.length > 0 && (
        <div className="tool-fields">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ci-dir">Layout</label>
            <select id="ci-dir" className="tool-select" value={dir} onChange={(e) => { setDir(e.target.value); setResult(null); }} disabled={busy}>
              <option value="vertical">Stack vertically (a column)</option>
              <option value="horizontal">Side by side (a row)</option>
            </select>
          </div>
          <p className="tool-note">{files.length} image{files.length === 1 ? "" : "s"} selected. They&apos;re scaled to match and joined in the order chosen.</p>
        </div>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {files.length >= 2 && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Working…" : "Combine images"}</button>
          {result && <a className="btn btn-success" href={result.url} download="combined.png">↓ Download PNG ({result.w}×{result.h})</a>}
        </div>
      )}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Combined result" style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 8, marginTop: 8 }} />
        </div>
      )}
    </div>
  );
}
