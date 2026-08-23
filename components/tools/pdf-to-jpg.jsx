"use client";

import { useState, useRef } from "react";

export default function PdfToJpg() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]); // { num, url, w, h }
  const [name, setName] = useState("page");
  const inputRef = useRef(null);
  const urlsRef = useRef([]);

  function revokeAll() {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }

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
    revokeAll();
    setPages([]);
    setName(file.name.replace(/\.pdf$/i, ""));
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      const data = await file.arrayBuffer();
      // isEvalSupported must stay false: with it enabled, a crafted font in a
      // malicious PDF can execute arbitrary JS on this origin (CVE-2024-4367).
      const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
      const out = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        setProgress(`Rendering page ${p} of ${pdf.numPages}…`);
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        out.push({ num: p, url, w: canvas.width, h: canvas.height });
      }
      setPages(out);
    } catch {
      setError("Couldn't read that PDF — it may be corrupted, encrypted, or password-protected.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  function downloadAll() {
    pages.forEach((pg, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = pg.url;
        a.download = `${name}-page-${pg.num}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 250);
    });
  }

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        /* Locked while rendering: starting a second file mid-run called
           revokeAll() on the first run's URLs, leaving broken thumbnails and a
           busy flag that no longer matched what was actually happening. */
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())
        }
        style={busy ? { opacity: 0.6, cursor: "progress" } : undefined}
      >
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onFile} hidden />
        <p className="dropzone-title">{busy ? progress || "Working…" : "Choose a PDF file"}</p>
        <p className="dropzone-sub">Each page becomes a JPG image — all in your browser, nothing uploaded.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {pages.length > 0 && (
        <>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={downloadAll}>
              ↓ Download all {pages.length} JPG{pages.length === 1 ? "" : "s"}
            </button>
          </div>
          <div className="grid" style={{ marginTop: 4 }}>
            {pages.map((pg) => (
              <div key={pg.num} className="card" style={{ padding: 12 }}>
                <img
                  src={pg.url}
                  alt={`Page ${pg.num}`}
                  loading="lazy"
                  style={{ width: "100%", height: "auto", borderRadius: 6, marginBottom: 8 }}
                />
                <div className="tool-actions" style={{ justifyContent: "space-between" }}>
                  <span className="tool-note">Page {pg.num}</span>
                  <a className="btn btn-success" href={pg.url} download={`${name}-page-${pg.num}.jpg`}>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
