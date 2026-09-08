"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

// pdf-lib returns a Date (or undefined). Turn it into the value a
// <input type="datetime-local"> expects, in the viewer's local time.
function dateToLocalInput(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  const pad = (x) => String(x).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" + pad(d.getMonth() + 1) +
    "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) +
    ":" + pad(d.getMinutes())
  );
}

function fmtDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

const EMPTY = {
  title: "", author: "", subject: "", keywords: "",
  creator: "", producer: "", creationDate: "", modificationDate: "",
};

export default function PdfMetadataEditor() {
  const [file, setFile] = useState(null);
  const [original, setOriginal] = useState(null); // metadata as read from the file
  const [fields, setFields] = useState(EMPTY); // editable copy
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (result && result.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const setField = (k, v) => {
    setFields((f) => ({ ...f, [k]: v }));
    setResult(null);
  };

  const loadFile = useCallback(async (f) => {
    setError(""); setResult(null); setOriginal(null); setFields(EMPTY); setPageCount(0);
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setFile(f);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      const read = {
        title: pdf.getTitle() || "",
        author: pdf.getAuthor() || "",
        subject: pdf.getSubject() || "",
        keywords: pdf.getKeywords() || "",
        creator: pdf.getCreator() || "",
        producer: pdf.getProducer() || "",
        creationDate: pdf.getCreationDate() || null,
        modificationDate: pdf.getModificationDate() || null,
      };
      setOriginal(read);
      setPageCount(pdf.getPageCount());
      setFields({
        title: read.title,
        author: read.author,
        subject: read.subject,
        keywords: read.keywords,
        creator: read.creator,
        producer: read.producer,
        creationDate: dateToLocalInput(read.creationDate),
        modificationDate: dateToLocalInput(read.modificationDate),
      });
    } catch (e) {
      if (e && /encrypt/i.test(String(e.message || e))) {
        setError("This PDF is password-protected. Unlock it first, then edit its metadata.");
      } else {
        setError("Couldn't read this PDF — it may be corrupted or an unsupported file.");
      }
      setFile(null);
    } finally {
      setBusy(false);
    }
  }, []);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) loadFile(f);
  }

  const clearAll = () => {
    setFields((f) => ({
      ...f,
      title: "", author: "", subject: "", keywords: "", creator: "", producer: "",
    }));
    setResult(null);
  };

  const stampNow = () => {
    setField("modificationDate", dateToLocalInput(new Date()));
  };

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });

      pdf.setTitle(fields.title || "");
      pdf.setAuthor(fields.author || "");
      pdf.setSubject(fields.subject || "");
      // pdf-lib takes keywords as an array; split on commas so a
      // comma-separated string round-trips cleanly.
      pdf.setKeywords(
        fields.keywords
          ? fields.keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : []
      );
      pdf.setCreator(fields.creator || "");
      pdf.setProducer(fields.producer || "");

      if (fields.creationDate) {
        const d = new Date(fields.creationDate);
        if (!isNaN(d.getTime())) pdf.setCreationDate(d);
      }
      if (fields.modificationDate) {
        const d = new Date(fields.modificationDate);
        if (!isNaN(d.getTime())) pdf.setModificationDate(d);
      }

      const out = await pdf.save();
      const blob = new Blob([out], { type: "application/pdf" });
      const base = file.name.replace(/\.pdf$/i, "") || "document";
      setResult({ url: URL.createObjectURL(blob), name: `${base}-metadata.pdf`, size: blob.size });
    } catch (e) {
      setError("Couldn't save the updated PDF. The file may be corrupted or unsupported.");
    } finally {
      setBusy(false);
    }
  }, [file, fields]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose a PDF file"}</p>
        <p className="dropzone-sub">
          {file
            ? fmtBytes(file.size) + (pageCount ? ` — ${pageCount} page${pageCount === 1 ? "" : "s"}` : "") + " — nothing uploaded"
            : "View and edit its metadata, in your browser"}
        </p>
      </div>

      {!file && !error && (
        <p className="tool-note">
          Pick a PDF to see its document properties — title, author, subject, keywords, the app that
          made it and its dates — then edit any of them and download the updated file. Everything
          happens on your device; the PDF is never uploaded.
        </p>
      )}

      {file && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="pm-title">Title</label>
                <input id="pm-title" className="tool-input" type="text" value={fields.title} onChange={(e) => setField("title", e.target.value)} placeholder="Document title" disabled={busy} />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="pm-author">Author</label>
                <input id="pm-author" className="tool-input" type="text" value={fields.author} onChange={(e) => setField("author", e.target.value)} placeholder="Author name" disabled={busy} />
              </div>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="pm-subject">Subject</label>
              <input id="pm-subject" className="tool-input" type="text" value={fields.subject} onChange={(e) => setField("subject", e.target.value)} placeholder="What the document is about" disabled={busy} />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="pm-keywords">Keywords</label>
              <input id="pm-keywords" className="tool-input" type="text" value={fields.keywords} onChange={(e) => setField("keywords", e.target.value)} placeholder="comma, separated, keywords" disabled={busy} />
              <p className="tool-note" style={{ margin: "4px 0 0" }}>Separate keywords with commas.</p>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="pm-creator">Creator (source app)</label>
                <input id="pm-creator" className="tool-input" type="text" value={fields.creator} onChange={(e) => setField("creator", e.target.value)} placeholder="e.g. Microsoft Word" disabled={busy} />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="pm-producer">Producer (PDF engine)</label>
                <input id="pm-producer" className="tool-input" type="text" value={fields.producer} onChange={(e) => setField("producer", e.target.value)} placeholder="e.g. macOS Quartz PDFContext" disabled={busy} />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="pm-created">Creation date</label>
                <input id="pm-created" className="tool-input" type="datetime-local" value={fields.creationDate} onChange={(e) => setField("creationDate", e.target.value)} disabled={busy} />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="pm-modified">Modification date</label>
                <input id="pm-modified" className="tool-input" type="datetime-local" value={fields.modificationDate} onChange={(e) => setField("modificationDate", e.target.value)} disabled={busy} />
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
              {busy ? "Saving…" : "Apply & download PDF"}
            </button>
            <button type="button" className="btn" onClick={stampNow} disabled={busy}>Set modified to now</button>
            <button type="button" className="btn" onClick={clearAll} disabled={busy}>Clear all fields</button>
          </div>
        </>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">✅ Metadata updated — {fmtBytes(result.size)}</p>
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download PDF</a>
          </div>
        </div>
      )}

      {original && (
        <div className="tool-result" style={{ marginTop: 12 }}>
          <p className="tool-result-label">Original metadata (as read from the file)</p>
          <div className="tool-stat-grid">
            <div className="tool-stat"><span className="tool-stat-num" style={{ fontSize: "1rem", wordBreak: "break-word" }}>{original.title || "—"}</span><span className="tool-stat-label">Title</span></div>
            <div className="tool-stat"><span className="tool-stat-num" style={{ fontSize: "1rem", wordBreak: "break-word" }}>{original.author || "—"}</span><span className="tool-stat-label">Author</span></div>
            <div className="tool-stat"><span className="tool-stat-num" style={{ fontSize: "1rem", wordBreak: "break-word" }}>{original.producer || "—"}</span><span className="tool-stat-label">Producer</span></div>
            <div className="tool-stat"><span className="tool-stat-num" style={{ fontSize: "1rem" }}>{fmtDate(original.creationDate)}</span><span className="tool-stat-label">Created</span></div>
            <div className="tool-stat"><span className="tool-stat-num" style={{ fontSize: "1rem" }}>{fmtDate(original.modificationDate)}</span><span className="tool-stat-label">Modified</span></div>
            <div className="tool-stat"><span className="tool-stat-num">{pageCount || "—"}</span><span className="tool-stat-label">Pages</span></div>
          </div>
        </div>
      )}

      <p className="tool-note">
        This tool edits the standard PDF Info dictionary (title, author, subject, keywords, creator,
        producer and dates). It runs entirely in your browser using pdf-lib — the file never leaves
        your device. Note that some PDFs also carry XMP metadata; this editor updates the classic Info
        fields that most viewers display.
      </p>
    </div>
  );
}
