"use client";

import { useState, useRef, useEffect } from "react";

export default function ImageSplitter() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [cols, setCols] = useState("2");
  const [rows, setRows] = useState("2");
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
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(f); previewRef.current = url;
    const img = new Image();
    img.onload = () => { imgRef.current = img; setFile(f); setPreview(url); };
    img.onerror = () => { setError("Couldn't read that image."); };
    img.src = url;
  }

  async function run() {
    if (!imgRef.current) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const img = imgRef.current;
      const C = Math.max(1, parseInt(cols, 10) || 2);
      const R = Math.max(1, parseInt(rows, 10) || 2);
      const tw = Math.floor(img.naturalWidth / C);
      const th = Math.floor(img.naturalHeight / R);
      if (tw < 1 || th < 1) throw new Error("The image is too small for that many tiles.");
      const jz = await import("jszip");
      const JSZip = jz.default || jz;
      const zip = new JSZip();
      const canvas = document.createElement("canvas");
      canvas.width = tw; canvas.height = th;
      const ctx = canvas.getContext("2d");
      let n = 0;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          ctx.clearRect(0, 0, tw, th);
          ctx.drawImage(img, c * tw, r * th, tw, th, 0, 0, tw, th);
          const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
          zip.file(`tile-r${r + 1}-c${c + 1}.png`, blob);
          n++;
        }
      }
      const zblob = await zip.generateAsync({ type: "blob" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(zblob); outRef.current = url;
      setResult({ url, count: n });
    } catch (err) {
      setError((err && err.message) || "Couldn't split that image.");
    } finally {
      setBusy(false);
    }
  }

  const opts = ["1", "2", "3", "4", "5", "6"];

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="is-file">Choose an image</label>
        <input id="is-file" className="tool-input" type="file" accept="image/*" onChange={onFile} disabled={busy} />
        <p className="tool-note">Everything happens in your browser — your image is never uploaded.</p>
      </div>

      {preview && (
        <div style={{ margin: "0.5rem 0 1rem", lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, display: "block" }} />
        </div>
      )}

      {file && (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="is-cols">Columns</label>
              <select id="is-cols" className="tool-select" value={cols} onChange={(e) => { setCols(e.target.value); setResult(null); }} disabled={busy}>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="is-rows">Rows</label>
              <select id="is-rows" className="tool-select" value={rows} onChange={(e) => { setRows(e.target.value); setResult(null); }} disabled={busy}>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <p className="tool-note">Splits into {Math.max(1, +cols) * Math.max(1, +rows)} equal tiles, delivered as a zip.</p>
        </div>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {file && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Splitting…" : "Split image"}</button>
          {result && <a className="btn btn-success" href={result.url} download="tiles.zip">↓ Download {result.count} tiles (.zip)</a>}
        </div>
      )}
    </div>
  );
}
