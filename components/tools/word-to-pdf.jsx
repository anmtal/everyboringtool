"use client";

import { useState, useRef } from "react";
import mammoth from "mammoth";

export default function WordToPdf() {
  const [html, setHtml] = useState("");
  const [name, setName] = useState("document");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (/\.doc$/i.test(file.name)) {
      setError("Old .doc files aren't supported — open it in Word and save as .docx first.");
      return;
    }
    if (!/\.docx$/i.test(file.name)) {
      setError("Please choose a Word .docx file.");
      return;
    }
    setBusy(true);
    setError("");
    setHtml("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtml(result.value || "<p>(This document appears to be empty.)</p>");
      setName(file.name.replace(/\.docx$/i, ""));
    } catch {
      setError("Couldn't read that Word file — it may be corrupted or not a real .docx.");
    } finally {
      setBusy(false);
    }
  }

  function savePdf() {
    if (!html) return;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title>` +
        "<style>@page{margin:20mm;}" +
        "body{font-family:Georgia,'Times New Roman',serif;color:#000;line-height:1.55;font-size:12pt;}" +
        "img{max-width:100%;}table{border-collapse:collapse;width:100%;}" +
        "td,th{border:1px solid #999;padding:6px;}h1,h2,h3{line-height:1.25;}</style>" +
        `</head><body>${html}</body></html>`
    );
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1500);
    }, 300);
  }

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept=".docx" onChange={onFile} hidden />
        <p className="dropzone-title">{busy ? "Reading document…" : "Choose a Word (.docx) file"}</p>
        <p className="dropzone-sub">Your file never leaves your device — it's converted right here in your browser.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {html && (
        <>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={savePdf}>Save as PDF</button>
          </div>
          <p className="tool-note">
            Click <strong>Save as PDF</strong>, then choose <strong>“Save as PDF”</strong> as the destination in the print dialog that opens.
          </p>
          <div className="doc-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
    </div>
  );
}
