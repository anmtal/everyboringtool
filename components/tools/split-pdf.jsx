"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

// Parse a page-range string like "1-3, 5, 8-10" into an ordered list of
// 1-based page numbers. Junk tokens are ignored; ranges are clamped to the
// valid [1, max] window; reversed ranges (e.g. "10-8") count downward.
function parseRanges(input, max) {
  if (typeof input !== "string" || !Number.isFinite(max) || max < 1) return [];
  const pages = [];
  for (const raw of input.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    // Accept "a" or "a-b" only; anything else is junk and skipped.
    const m = token.match(/^(\d+)\s*-\s*(\d+)$|^(\d+)$/);
    if (!m) continue;
    if (m[3] !== undefined) {
      const p = parseInt(m[3], 10);
      if (p >= 1 && p <= max) pages.push(p);
      continue;
    }
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a <= b) {
      const lo = Math.max(a, 1);
      const hi = Math.min(b, max);
      for (let p = lo; p <= hi; p++) pages.push(p);
    } else {
      const hi = Math.min(a, max);
      const lo = Math.max(b, 1);
      for (let p = hi; p >= lo; p--) pages.push(p);
    }
  }
  return pages;
}

// Trigger a browser download for a blob, cleaning up the object URL afterward.
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export default function SplitPdf() {
  const [file, setFile] = useState(null); // the chosen File
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // transient progress note
  const [error, setError] = useState("");
  const [extract, setExtract] = useState(null); // { url, count }

  const extractUrlRef = useRef(""); // object URL backing the extract download

  useEffect(() => {
    return () => {
      if (extractUrlRef.current) URL.revokeObjectURL(extractUrlRef.current);
    };
  }, []);

  function clearExtract() {
    if (extractUrlRef.current) {
      URL.revokeObjectURL(extractUrlRef.current);
      extractUrlRef.current = "";
    }
    setExtract(null);
  }

  function reset() {
    setFile(null);
    setPageCount(0);
    setStatus("");
    clearExtract();
  }

  async function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!chosen) return;

    const isPdf =
      chosen.type === "application/pdf" ||
      chosen.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      reset();
      return;
    }

    setError("");
    reset();
    setBusy(true);
    setStatus("Reading PDF…");
    try {
      const bytes = await chosen.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");
      setFile(chosen);
      setPageCount(count);
    } catch {
      setError(
        "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  // Live preview of which pages the current range resolves to.
  const parsedPages = useMemo(
    () => (pageCount ? parseRanges(range, pageCount) : []),
    [range, pageCount]
  );

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  async function extractPages() {
    if (!file) return;
    const pages = parseRanges(range, pageCount);
    if (!pages.length) {
      setError(
        `Enter a valid page range (1–${pageCount}), e.g. 1-3, 5, 8-10.`
      );
      return;
    }
    setError("");
    clearExtract();
    setBusy(true);
    setStatus("Building your PDF…");
    try {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(
        src,
        pages.map((p) => p - 1)
      );
      copied.forEach((pg) => out.addPage(pg));
      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      extractUrlRef.current = url;
      setExtract({ url, count: pages.length });
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Something went wrong building that PDF. Try a different range.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function splitAll() {
    if (!file || !pageCount) return;
    setError("");
    clearExtract();
    setBusy(true);
    setStatus("Generating one PDF per page…");
    try {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const pad = String(pageCount).length;
      const outputs = [];
      for (let i = 0; i < pageCount; i++) {
        const out = await PDFDocument.create();
        const [pg] = await out.copyPages(src, [i]);
        out.addPage(pg);
        const outBytes = await out.save();
        const num = String(i + 1).padStart(pad, "0");
        outputs.push({
          blob: new Blob([outBytes], { type: "application/pdf" }),
          name: `${baseName}-page-${num}.pdf`,
        });
      }
      // Stagger downloads so the browser doesn't block the rapid succession.
      outputs.forEach((o, i) => {
        setTimeout(() => downloadBlob(o.blob, o.name), i * 250);
      });
      setStatus(
        `Downloading ${NUM_FMT.format(outputs.length)} single-page PDF${
          outputs.length === 1 ? "" : "s"
        }…`
      );
      setTimeout(() => setStatus(""), outputs.length * 250 + 1500);
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Couldn't split that PDF. It may be corrupted or protected.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="sp-file"
              type="file"
              accept="application/pdf"
              onChange={onFile}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {busy && status && (
        <p className="tool-note" role="status">
          {status}
        </p>
      )}

      {file && pageCount > 0 && (
        <>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(pageCount)}</div>
              <div className="tool-stat-label">
                {pageCount === 1 ? "Page" : "Pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {NUM_FMT.format(parsedPages.length)}
              </div>
              <div className="tool-stat-label">Selected to extract</div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sp-range">
                  Page range to extract
                </label>
                <input
                  className="tool-input"
                  id="sp-range"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1-3, 5, 8-10"
                  value={range}
                  onChange={(e) => {
                    setRange(e.target.value);
                    if (error) setError("");
                    clearExtract();
                  }}
                />
              </div>
            </div>
          </div>

          <p className="tool-note">
            Enter pages and ranges separated by commas. Anything outside 1–
            {pageCount} is ignored, and the pages come out in the order you list
            them.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={extractPages}
              disabled={busy || parsedPages.length === 0}
            >
              {busy
                ? "Working…"
                : parsedPages.length > 0
                ? `Extract ${NUM_FMT.format(parsedPages.length)} page${
                    parsedPages.length === 1 ? "" : "s"
                  }`
                : "Extract pages"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={splitAll}
              disabled={busy}
            >
              Split into single pages
            </button>
            {extract && (
              <a
                className="btn btn-success"
                href={extract.url}
                download={`${baseName}-extract.pdf`}
              >
                ↓ Download {NUM_FMT.format(extract.count)}-page PDF
              </a>
            )}
          </div>
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a
        server. Splitting into single pages downloads one file per page, so your
        browser may ask permission to download multiple files.
      </p>
    </div>
  );
}
