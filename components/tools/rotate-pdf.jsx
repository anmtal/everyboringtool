"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

const ROTATIONS = [
  { value: 90, label: "90° clockwise" },
  { value: 180, label: "180° (upside down)" },
  { value: 270, label: "270° clockwise (90° counter-clockwise)" },
];

export default function RotatePdf() {
  const [file, setFile] = useState(null); // the chosen File
  const [pageCount, setPageCount] = useState(0);
  const [angle, setAngle] = useState(90);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // transient progress note
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url }

  const resultUrlRef = useRef(""); // object URL backing the rotated download

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  function clearResult() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
    setResult(null);
  }

  function reset() {
    setFile(null);
    setPageCount(0);
    setStatus("");
    clearResult();
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
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF.");
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  async function rotate() {
    if (!file || !pageCount) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Rotating pages…");
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();
      for (const page of pages) {
        // Preserve any rotation the page already carries, then add ours.
        // Normalize into [0, 360) so the stored angle stays tidy.
        const current = page.getRotation().angle || 0;
        const next = (((current + angle) % 360) + 360) % 360;
        page.setRotation(degrees(next));
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url });
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Something went wrong rotating that PDF. It may be corrupted or protected.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="rp-file"
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
              <div className="tool-stat-num">{angle}°</div>
              <div className="tool-stat-label">Rotation</div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="rp-angle">
                  Rotate every page by
                </label>
                <select
                  className="tool-select"
                  id="rp-angle"
                  value={angle}
                  onChange={(e) => {
                    setAngle(Number(e.target.value));
                    if (error) setError("");
                    clearResult();
                  }}
                >
                  {ROTATIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="tool-note">
            The rotation is added on top of each page's existing orientation, so
            pages that are already turned stay consistent.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={rotate}
              disabled={busy}
            >
              {busy ? "Working…" : "Rotate PDF"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}-rotated.pdf`}
              >
                ↓ Download rotated PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Rotated {NUM_FMT.format(pageCount)}{" "}
                {pageCount === 1 ? "page" : "pages"} by {angle}° clockwise.
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a
        server.
      </p>
    </div>
  );
}
