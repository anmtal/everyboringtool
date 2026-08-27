"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Standard PDF fonts use WinAnsi (CP1252) encoding — characters outside it throw
// when drawn. Map the common typographic ones and drop anything else to "?".
function winAnsi(s) {
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}

export default function CreatePdf() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");
  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  async function run() {
    if (!text.trim()) { setError("Type or paste some text first."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const size = 12, lh = size * 1.5, margin = 56;
      const pw = 595.28, ph = 841.89; // A4 in points
      const maxW = pw - margin * 2;
      const wrap = (line) => {
        if (line === "") return [""];
        const words = line.split(/\s+/);
        const out = []; let cur = "";
        for (const w of words) {
          const test = cur ? cur + " " + w : w;
          if (font.widthOfTextAtSize(test, size) <= maxW) { cur = test; continue; }
          if (cur) out.push(cur);
          if (font.widthOfTextAtSize(w, size) > maxW) {
            let chunk = "";
            for (const ch of w) {
              if (font.widthOfTextAtSize(chunk + ch, size) <= maxW) chunk += ch;
              else { out.push(chunk); chunk = ch; }
            }
            cur = chunk;
          } else cur = w;
        }
        if (cur) out.push(cur);
        return out;
      };
      const lines = [];
      for (const raw of winAnsi(text).replace(/\r\n/g, "\n").split("\n")) for (const l of wrap(raw)) lines.push(l);
      let page = doc.addPage([pw, ph]);
      let y = ph - margin;
      for (const line of lines) {
        if (y < margin) { page = doc.addPage([pw, ph]); y = ph - margin; }
        if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lh;
      }
      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(blob); outRef.current = url;
      setResult({ url, pages: doc.getPageCount() });
    } catch {
      setError("Couldn't create the PDF. Try shorter text or remove unusual characters.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="cp-text">Your text</label>
        <textarea id="cp-text" className="tool-input" style={{ minHeight: 200, fontSize: 14 }} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="Type or paste the text for your PDF…" />
        <p className="tool-note">A clean A4 PDF is built in your browser — nothing is uploaded.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !text.trim()}>{busy ? "Working…" : "Create PDF"}</button>
        {result && <a className="btn btn-success" href={result.url} download="document.pdf">↓ Download PDF ({result.pages} page{result.pages === 1 ? "" : "s"})</a>}
      </div>
    </div>
  );
}
