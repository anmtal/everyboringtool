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
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad")); };
    img.src = url;
  })));
}
// cover-fit: draw img filling the cell, cropping the overflow (like CSS cover)
function drawCover(ctx, img, dx, dy, dw, dh) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = dw / dh;
  let sw, sh, sx, sy;
  if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
  else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

const CELL = 500;

export default function CollageMaker() {
  const [files, setFiles] = useState([]);
  const [cols, setCols] = useState("2");
  const [gap, setGap] = useState("10");
  const [bg, setBg] = useState("#ffffff");
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
      const c = Math.max(1, parseInt(cols, 10) || 2);
      const g = Math.max(0, parseInt(gap, 10) || 0);
      const rows = Math.ceil(imgs.length / c);
      const canvas = document.createElement("canvas");
      canvas.width = c * CELL + (c + 1) * g;
      canvas.height = rows * CELL + (rows + 1) * g;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      imgs.forEach((img, k) => {
        const col = k % c, row = Math.floor(k / c);
        const dx = g + col * (CELL + g);
        const dy = g + row * (CELL + g);
        drawCover(ctx, img, dx, dy, CELL, CELL);
      });
      imgs.forEach((i) => URL.revokeObjectURL(i._url));
      canvas.toBlob((blob) => {
        if (!blob) { setBusy(false); setError("Export failed — try fewer images."); return; }
        if (outRef.current) URL.revokeObjectURL(outRef.current);
        const url = URL.createObjectURL(blob); outRef.current = url;
        setResult({ url, size: blob.size, w: canvas.width, h: canvas.height });
        setBusy(false);
      }, "image/png");
    } catch {
      setBusy(false);
      setError("Couldn't build the collage — one image may be corrupted or unsupported.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="cm-files">Choose your photos</label>
        <input id="cm-files" className="tool-input" type="file" accept="image/*" multiple onChange={onFiles} />
        <p className="tool-note">Everything happens in your browser — your photos are never uploaded.</p>
      </div>

      {files.length > 0 && (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="cm-cols">Columns</label>
              <select id="cm-cols" className="tool-select" value={cols} onChange={(e) => { setCols(e.target.value); setResult(null); }} disabled={busy}>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="cm-bg">Background</label>
              <input id="cm-bg" type="color" value={bg} onChange={(e) => { setBg(e.target.value); setResult(null); }} disabled={busy} />
            </div>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cm-gap">Gap: {gap}px</label>
            <input id="cm-gap" type="range" min="0" max="60" step="2" value={gap} onChange={(e) => { setGap(e.target.value); setResult(null); }} disabled={busy} />
          </div>
          <p className="tool-note">{files.length} photo{files.length === 1 ? "" : "s"} — each is cropped to a square cell.</p>
        </div>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {files.length >= 2 && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Working…" : "Make collage"}</button>
          {result && <a className="btn btn-success" href={result.url} download="collage.png">↓ Download PNG ({result.w}×{result.h})</a>}
        </div>
      )}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Collage result" style={{ maxWidth: "100%", maxHeight: 420, borderRadius: 8, marginTop: 8 }} />
        </div>
      )}
    </div>
  );
}
