"use client";

import { useState, useRef } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";

export default function PdfToWord() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [pages, setPages] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [name, setName] = useState("document");
  const inputRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setError("");
    setPreview("");
    setDownloadUrl("");
    setPages(0);
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;

      const paras = [];
      let previewText = "";
      let extractedAny = false;
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        let line = "";
        const pageLines = [];
        for (const item of content.items) {
          line += item.str;
          if (item.hasEOL) {
            pageLines.push(line);
            line = "";
          }
        }
        if (line) pageLines.push(line);
        for (const l of pageLines) {
          const t = l.replace(/\s+/g, " ").trim();
          if (t) extractedAny = true;
          paras.push(new Paragraph({ children: [new TextRun(t)] }));
          if (t && previewText.length < 4000) previewText += t + "\n";
        }
        paras.push(new Paragraph({ children: [] })); // gap between pages
      }

      if (!extractedAny) {
        setError("No selectable text found — this looks like a scanned PDF, which needs OCR (not supported here).");
        setBusy(false);
        return;
      }

      const doc = new Document({ sections: [{ children: paras }] });
      const blob = await Packer.toBlob(doc);
      setDownloadUrl(URL.createObjectURL(blob));
      setPreview(previewText.trim());
      setPages(pdf.numPages);
      setName(file.name.replace(/\.pdf$/i, ""));
    } catch {
      setError("Couldn't read that PDF — it may be corrupted, encrypted, or password-protected.");
    } finally {
      setBusy(false);
    }
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
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onFile} hidden />
        <p className="dropzone-title">{busy ? "Extracting text…" : "Choose a PDF file"}</p>
        <p className="dropzone-sub">Runs entirely in your browser — your PDF is never uploaded.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {downloadUrl && (
        <>
          <div className="tool-actions">
            <a className="btn btn-success" href={downloadUrl} download={`${name}.docx`}>↓ Download Word (.docx)</a>
          </div>
          <p className="tool-note">
            Extracted the text from {pages} page{pages === 1 ? "" : "s"} into an editable Word file. Complex layouts,
            tables, columns and images aren&apos;t reproduced — this pulls out the text so you can edit it.
          </p>
          {preview && (
            <pre className="tool-output" style={{ maxHeight: 320, overflow: "auto" }}>{preview}</pre>
          )}
        </>
      )}
    </div>
  );
}
