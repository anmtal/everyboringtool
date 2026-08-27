"use client";

import { useState, useRef, useEffect } from "react";

export default function PdfToText() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [name, setName] = useState("document");
  const [copied, setCopied] = useState(false);
  const [dlUrl, setDlUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!text) { setDlUrl(""); return; }
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    setDlUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [text]);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setError("Please choose a PDF file."); return; }
    setBusy(true); setError(""); setText(""); setCopied(false);
    setName(file.name.replace(/\.pdf$/i, ""));
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
      let all = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        setProgress(`Reading page ${p} of ${pdf.numPages}…`);
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        let last = null;
        let pageText = "";
        for (const item of content.items) {
          if (last !== null && item.transform && last - item.transform[5] > 5) pageText += "\n";
          pageText += item.str + (item.hasEOL ? "\n" : " ");
          if (item.transform) last = item.transform[5];
        }
        all += pageText.replace(/[ \t]+\n/g, "\n").trim() + "\n\n";
      }
      const clean = all.trim();
      setText(clean || "(No selectable text found — this PDF may be a scan of images. Try an OCR tool.)");
    } catch {
      setError("Couldn't read that PDF — it may be corrupted, encrypted, or password-protected.");
    } finally {
      setBusy(false); setProgress("");
    }
  }

  function copy() {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  return (
    <div className="tool">
      <div className="dropzone" role="button" tabIndex={0} aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
        style={busy ? { opacity: 0.6, cursor: "progress" } : undefined}>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onFile} hidden />
        <p className="dropzone-title">{busy ? progress || "Working…" : "Choose a PDF file"}</p>
        <p className="dropzone-sub">Extracts the text — all in your browser, nothing uploaded.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {text && (
        <div className="tool-field" style={{ marginTop: 8 }}>
          <label className="tool-label" htmlFor="pt-out">Extracted text</label>
          <textarea id="pt-out" readOnly className="tool-input" style={{ minHeight: 220, fontSize: 13 }} value={text} spellCheck={false} />
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
            {dlUrl && <a className="btn btn-success" href={dlUrl} download={`${name}.txt`}>↓ Download .txt</a>}
          </div>
        </div>
      )}
    </div>
  );
}
