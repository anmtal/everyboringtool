"use client";

import { useState, useRef, useEffect } from "react";

function fmtBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { img._url = url; res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
    img.src = url;
  });
}

function drawToData(img, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export default function ImageDiff() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [threshold, setThreshold] = useState(10);
  const [alpha, setAlpha] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");

  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  function pick(setter) {
    return (e) => {
      const f = (e.target.files || [])[0];
      e.target.value = "";
      setError(""); setResult(null);
      if (f && !f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
      setter(f || null);
    };
  }

  async function run() {
    if (!fileA || !fileB) { setError("Choose two images to compare."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const [ia, ib] = await Promise.all([loadImage(fileA), loadImage(fileB)]);
      const aw = ia.naturalWidth, ah = ia.naturalHeight;
      const bw = ib.naturalWidth, bh = ib.naturalHeight;
      // Compare on image A's dimensions. If B differs, it is scaled to fit A.
      const w = aw, h = ah;
      const sizeMismatch = aw !== bw || ah !== bh;
      const da = drawToData(ia, w, h).data;
      const db = drawToData(ib, w, h).data;
      URL.revokeObjectURL(ia._url); URL.revokeObjectURL(ib._url);

      const total = w * h;
      const out = new ImageData(w, h);
      const od = out.data;
      // Per-channel tolerance: threshold (0-100) maps to a 0-255 delta cutoff.
      const cutoff = Math.round((threshold / 100) * 255);
      let changed = 0;

      for (let i = 0; i < da.length; i += 4) {
        const dr = Math.abs(da[i] - db[i]);
        const dg = Math.abs(da[i + 1] - db[i + 1]);
        const dbl = Math.abs(da[i + 2] - db[i + 2]);
        const daa = Math.abs(da[i + 3] - db[i + 3]);
        const maxd = Math.max(dr, dg, dbl, daa);
        if (maxd > cutoff) {
          changed++;
          // Highlight differing pixel in magenta.
          od[i] = 255; od[i + 1] = 0; od[i + 2] = 170; od[i + 3] = 255;
        } else if (alpha) {
          // Transparent where identical (overlay mode).
          od[i] = 0; od[i + 1] = 0; od[i + 2] = 0; od[i + 3] = 0;
        } else {
          // Dimmed grayscale base from image A.
          const gray = Math.round((da[i] * 0.299 + da[i + 1] * 0.587 + da[i + 2] * 0.114));
          const v = 80 + Math.round((gray / 255) * 120); // 80..200 muted
          od[i] = v; od[i + 1] = v; od[i + 2] = v; od[i + 3] = 255;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").putImageData(out, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) { setBusy(false); setError("Export failed — try smaller images."); return; }
        if (outRef.current) URL.revokeObjectURL(outRef.current);
        const url = URL.createObjectURL(blob); outRef.current = url;
        setResult({
          url, size: blob.size, w, h, total, changed,
          pct: (changed / total) * 100,
          sizeMismatch, aw, ah, bw, bh, identical: changed === 0,
        });
        setBusy(false);
      }, "image/png");
    } catch {
      setBusy(false);
      setError("Couldn't read those images — one may be corrupted or an unsupported format.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-row">
        <div className="tool-field">
          <label className="tool-label" htmlFor="id-a">Image A (original)</label>
          <input id="id-a" className="tool-input" type="file" accept="image/*" onChange={pick(setFileA)} />
          {fileA && <p className="tool-note">{fileA.name} — {fmtBytes(fileA.size)}</p>}
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="id-b">Image B (changed)</label>
          <input id="id-b" className="tool-input" type="file" accept="image/*" onChange={pick(setFileB)} />
          {fileB && <p className="tool-note">{fileB.name} — {fmtBytes(fileB.size)}</p>}
        </div>
      </div>

      <div className="tool-row">
        <div className="tool-field">
          <label className="tool-label" htmlFor="id-thr">Tolerance: {threshold}%</label>
          <input id="id-thr" className="tool-input" type="range" min="0" max="100" value={threshold}
            onChange={(e) => { setThreshold(Number(e.target.value)); setResult(null); }} disabled={busy} />
          <p className="tool-note">Ignore color changes smaller than this. 0% flags any difference; higher values ignore compression noise.</p>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="id-alpha">Output style</label>
          <select id="id-alpha" className="tool-select" value={alpha ? "overlay" : "map"}
            onChange={(e) => { setAlpha(e.target.value === "overlay"); setResult(null); }} disabled={busy}>
            <option value="map">Diff map (grey base, magenta changes)</option>
            <option value="overlay">Transparent overlay (only changes)</option>
          </select>
          <p className="tool-note">Overlay is handy for layering over Image A in another editor.</p>
        </div>
      </div>

      <p className="tool-note">Everything runs in your browser — your images are never uploaded. Image B is compared against Image A pixel for pixel; if their sizes differ, B is scaled to match A.</p>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !fileA || !fileB}>
          {busy ? "Comparing…" : "Compare images"}
        </button>
        {result && <a className="btn btn-success" href={result.url} download="image-diff.png">↓ Download diff PNG</a>}
      </div>

      {!fileA || !fileB ? (
        <p className="tool-note">Pick two images above (a &ldquo;before&rdquo; and an &ldquo;after&rdquo;) to see exactly which pixels changed and by how much.</p>
      ) : null}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">
            {result.identical ? "No differences above the tolerance — the images match." : "Comparison complete"}
          </p>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.pct.toFixed(2)}%</div>
              <div className="tool-stat-label">Pixels changed</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.changed.toLocaleString()}</div>
              <div className="tool-stat-label">Different pixels</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.w}×{result.h}</div>
              <div className="tool-stat-label">Compared at</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmtBytes(result.size)}</div>
              <div className="tool-stat-label">Diff image</div>
            </div>
          </div>
          {result.sizeMismatch && (
            <p className="tool-note">Note: the images had different sizes (A is {result.aw}×{result.ah}, B is {result.bw}×{result.bh}). B was scaled to A, so some differences may be from scaling rather than real edits.</p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Difference map highlighting changed pixels in magenta" style={{ maxWidth: "100%", maxHeight: 460, borderRadius: 8, marginTop: 8 }} />
        </div>
      )}
    </div>
  );
}
