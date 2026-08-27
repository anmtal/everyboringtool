"use client";

import { useState, useRef, useEffect } from "react";

// Rebuild a canvas from a pdf.js image object. pdf.js hands back either an
// ImageBitmap or a { width, height, data, kind } record (kind 2 = RGB_24BPP,
// 3 = RGBA_32BPP). Anything else we skip rather than guess.
function imgToCanvas(img) {
  if (!img) return null;
  if (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0); return c;
  }
  const w = img.width, h = img.height, data = img.data;
  if (!w || !h || !data) return null;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); const out = ctx.createImageData(w, h); const od = out.data;
  if (data.length >= w * h * 4 && img.kind === 3) od.set(data.subarray(0, w * h * 4));
  else if (data.length >= w * h * 4 && img.kind !== 2) od.set(data.subarray(0, w * h * 4));
  else if (data.length >= w * h * 3) { for (let i = 0, j = 0; i < w * h; i++) { od[j++] = data[i * 3]; od[j++] = data[i * 3 + 1]; od[j++] = data[i * 3 + 2]; od[j++] = 255; } }
  else return null;
  ctx.putImageData(out, 0, 0); return c;
}

export default function ExtractPdfImages() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const outRef = useRef("");
  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setError("Please choose a PDF file."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
      const jz = await import("jszip");
      const JSZip = jz.default || jz;
      const zip = new JSZip();
      let n = 0; const seen = new Set();
      for (let p = 1; p <= pdf.numPages; p++) {
        setProgress(`Scanning page ${p} of ${pdf.numPages}…`);
        const page = await pdf.getPage(p);
        const ops = await page.getOperatorList();
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (ops.fnArray[i] !== pdfjsLib.OPS.paintImageXObject) continue;
          const name = ops.argsArray[i][0];
          if (typeof name !== "string" || seen.has(name)) continue;
          seen.add(name);
          let obj = null;
          try { obj = page.objs.get(name); }
          catch { try { obj = await new Promise((res) => page.objs.get(name, res)); } catch {} }
          const canvas = imgToCanvas(obj);
          if (canvas) {
            const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
            if (blob) { n++; zip.file(`image-${String(n).padStart(3, "0")}.png`, blob); }
          }
        }
      }
      if (n === 0) {
        setError("No extractable images were found — this PDF may hold only text and vector graphics, or images in a form the browser can't decode.");
        return;
      }
      const zblob = await zip.generateAsync({ type: "blob" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(zblob); outRef.current = url;
      setResult({ url, count: n, name: (file.name.replace(/\.pdf$/i, "") || "pdf") + "-images.zip" });
    } catch {
      setError("Couldn't read that PDF — it may be corrupted, encrypted, or password-protected.");
    } finally {
      setBusy(false); setProgress("");
    }
  }

  return (
    <div className="tool">
      <div className="dropzone" role="button" tabIndex={0} aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
        style={busy ? { opacity: 0.6, cursor: "progress" } : undefined}>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onFile} hidden />
        <p className="dropzone-title">{busy ? progress || "Working…" : "Choose a PDF file"}</p>
        <p className="dropzone-sub">Pulls out the embedded images — all in your browser, nothing uploaded.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-actions" style={{ marginTop: 10 }}>
          <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {result.count} image{result.count === 1 ? "" : "s"} (.zip)</a>
        </div>
      )}
    </div>
  );
}
