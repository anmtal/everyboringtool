"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

const NUM_FMT = new Intl.NumberFormat("en-US");

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

export default function ReorderPages() {
  const [file, setFile] = useState(null); // the chosen File
  const [originalCount, setOriginalCount] = useState(0);
  // Ordered working list: each entry is the 0-based index of a page in the
  // source PDF. Reordering/removing mutates this array, never the source.
  const [order, setOrder] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // transient progress note
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  // Nothing to clean up on unmount beyond staggered download URLs, which
  // revoke themselves; keep the hook for symmetry with future timers.
  useEffect(() => () => {}, []);

  function reset() {
    setFile(null);
    setOriginalCount(0);
    setOrder([]);
    setStatus("");
  }

  const loadFile = useCallback(async (chosen) => {
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
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");
      setFile(chosen);
      setOriginalCount(count);
      setOrder(Array.from({ length: count }, (_, i) => i));
    } catch {
      setError(
        "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }, []);

  function onInput(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    loadFile(chosen);
  }

  function onDrop(e) {
    e.preventDefault();
    const chosen = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(chosen);
  }

  function move(i, dir) {
    setOrder((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function removeAt(i) {
    setOrder((prev) => prev.filter((_, idx) => idx !== i));
  }

  function restore() {
    setOrder(Array.from({ length: originalCount }, (_, i) => i));
    setError("");
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  async function save() {
    if (!file) return;
    if (!order.length) {
      setError("Add at least one page before saving.");
      return;
    }
    setError("");
    setBusy(true);
    setStatus("Building your reordered PDF…");
    try {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, order);
      copied.forEach((pg) => out.addPage(pg));
      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      downloadBlob(blob, `${baseName}-reordered.pdf`);
      setStatus("Downloaded your reordered PDF.");
      setTimeout(() => setStatus(""), 4000);
    } catch {
      setError("Something went wrong building that PDF. Please try again.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const removedCount = originalCount - order.length;

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          (e.preventDefault(), inputRef.current?.click())
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onInput}
          hidden
        />
        <p className="dropzone-title">Drop a PDF here, or click to choose</p>
        <p className="dropzone-sub">
          Your file never leaves your device — reordering happens in your
          browser.
        </p>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {status && (
        <p className="tool-note" role="status">
          {status}
        </p>
      )}

      {file && originalCount > 0 && (
        <>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {NUM_FMT.format(originalCount)}
              </div>
              <div className="tool-stat-label">
                Original {originalCount === 1 ? "page" : "pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(order.length)}</div>
              <div className="tool-stat-label">In new PDF</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {NUM_FMT.format(removedCount)}
              </div>
              <div className="tool-stat-label">Removed</div>
            </div>
          </div>

          {order.length > 0 ? (
            <ul className="filelist">
              {order.map((srcIndex, i) => (
                <li className="fileitem" key={srcIndex}>
                  <span className="fileidx">{i + 1}</span>
                  <span className="filename">Page {srcIndex + 1}</span>
                  <span className="fileactions">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy}
                      aria-label={`Move page ${srcIndex + 1} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1 || busy}
                      aria-label={`Move page ${srcIndex + 1} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      disabled={busy}
                      aria-label={`Remove page ${srcIndex + 1}`}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tool-note">
              You've removed every page. Restore them or choose a new PDF to
              continue.
            </p>
          )}

          <p className="tool-note">
            Rows show the pages from your original PDF. Use ↑ and ↓ to reorder
            and ✕ to drop a page — the new PDF is built in exactly the order
            listed above.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={busy || order.length === 0}
            >
              {busy
                ? "Working…"
                : `Save ${NUM_FMT.format(order.length)}-page PDF`}
            </button>
            <button
              type="button"
              className="btn"
              onClick={restore}
              disabled={
                busy ||
                (order.length === originalCount &&
                  order.every((v, i) => v === i))
              }
            >
              Restore original order
            </button>
            <button
              type="button"
              className="btn"
              onClick={reset}
              disabled={busy}
            >
              Choose another PDF
            </button>
          </div>
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a
        server. The reordered file downloads straight to your device.
      </p>
    </div>
  );
}
