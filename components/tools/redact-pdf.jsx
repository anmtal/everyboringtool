"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

const NUM_FMT = new Intl.NumberFormat("en-US");
const RENDER_SCALE = 2; // canvas pixels per PDF point — sharper redaction output

// Normalise a drag (which can go up/left) into a positive-size rectangle,
// clamped to the canvas so a box never spills past the page edge.
function normBox(a, b, maxW, maxH) {
  const x = Math.max(0, Math.min(a.x, b.x));
  const y = Math.max(0, Math.min(a.y, b.y));
  const w = Math.min(maxW, Math.max(a.x, b.x)) - x;
  const h = Math.min(maxH, Math.max(a.y, b.y)) - y;
  return { x, y, w, h };
}

export default function RedactPdf() {
  // pageMeta[i] = { num, w, h, ptW, ptH, boxes:[{x,y,w,h}] } — w/h are canvas
  // pixels; ptW/ptH are the original PDF point size used to rebuild the page.
  const [pages, setPages] = useState([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("document");
  const [result, setResult] = useState(null); // { url }

  const baseCanvasesRef = useRef([]); // flattened page bitmaps, index-aligned to pages
  const viewRef = useRef(null); // the on-screen <canvas>
  const inputRef = useRef(null);
  const dragRef = useRef(null); // { start:{x,y}, cur:{x,y} } while drawing
  const resultUrlRef = useRef("");

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

  // Repaint the visible canvas: the flattened page, its committed black boxes,
  // then the live drag rectangle (if any) as a preview.
  function redraw() {
    const meta = pages[active];
    const base = baseCanvasesRef.current[active];
    const view = viewRef.current;
    if (!meta || !base || !view) return;
    if (view.width !== meta.w) view.width = meta.w;
    if (view.height !== meta.h) view.height = meta.h;
    const ctx = view.getContext("2d");
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#000000";
    for (const b of meta.boxes) ctx.fillRect(b.x, b.y, b.w, b.h);
    const d = dragRef.current;
    if (d) {
      const box = normBox(d.start, d.cur, meta.w, meta.h);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
  }

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, active]);

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
    clearResult();
    setPages([]);
    baseCanvasesRef.current = [];
    setActive(0);
    setName(file.name.replace(/\.pdf$/i, ""));
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      const data = await file.arrayBuffer();
      // isEvalSupported must stay false: a crafted font in a malicious PDF can
      // otherwise execute arbitrary JS on this origin (CVE-2024-4367).
      const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
      const meta = [];
      const canvases = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        setProgress(`Rendering page ${p} of ${pdf.numPages}…`);
        const page = await pdf.getPage(p);
        const pt = page.getViewport({ scale: 1 }); // page size in PDF points
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvases.push(canvas);
        meta.push({
          num: p,
          w: canvas.width,
          h: canvas.height,
          ptW: pt.width,
          ptH: pt.height,
          boxes: [],
        });
      }
      baseCanvasesRef.current = canvases;
      setPages(meta);
    } catch {
      setError(
        "Couldn't read that PDF — it may be corrupted, encrypted, or password-protected. Open it in a viewer and use Print → Save as PDF to make an unprotected copy, then try again."
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  // Map a pointer event to canvas-pixel coordinates, accounting for CSS scaling.
  function toCanvasPoint(e) {
    const view = viewRef.current;
    const rect = view.getBoundingClientRect();
    const sx = view.width / rect.width;
    const sy = view.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }

  function onPointerDown(e) {
    if (busy || !pages[active]) return;
    e.preventDefault();
    const pt = toCanvasPoint(e);
    dragRef.current = { start: pt, cur: pt };
    try {
      viewRef.current.setPointerCapture(e.pointerId);
    } catch {}
    redraw();
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    dragRef.current.cur = toCanvasPoint(e);
    redraw();
  }

  function onPointerUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const meta = pages[active];
    const box = normBox(d.start, d.cur, meta.w, meta.h);
    // Ignore accidental taps — only commit boxes with real area.
    if (box.w > 4 && box.h > 4) {
      setPages((prev) =>
        prev.map((m, i) =>
          i === active ? { ...m, boxes: [...m.boxes, box] } : m
        )
      );
      clearResult();
    } else {
      redraw();
    }
  }

  function undoBox() {
    setPages((prev) =>
      prev.map((m, i) =>
        i === active ? { ...m, boxes: m.boxes.slice(0, -1) } : m
      )
    );
    clearResult();
  }

  function clearPageBoxes() {
    setPages((prev) =>
      prev.map((m, i) => (i === active ? { ...m, boxes: [] } : m))
    );
    clearResult();
  }

  const totalBoxes = pages.reduce((n, m) => n + m.boxes.length, 0);

  async function apply() {
    if (!pages.length) return;
    if (totalBoxes === 0) {
      setError("Draw at least one black box over the text you want to redact.");
      return;
    }
    setError("");
    clearResult();
    setBusy(true);
    setProgress("Applying redactions…");
    try {
      const out = await PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        const meta = pages[i];
        const base = baseCanvasesRef.current[i];
        // Flatten: draw the rendered page, then paint every box solid black
        // straight into the pixels. The original text is discarded — the output
        // page is an image, so nothing survives beneath the boxes.
        const flat = document.createElement("canvas");
        flat.width = meta.w;
        flat.height = meta.h;
        const ctx = flat.getContext("2d");
        ctx.drawImage(base, 0, 0);
        ctx.fillStyle = "#000000";
        for (const b of meta.boxes) ctx.fillRect(b.x, b.y, b.w, b.h);
        const blob = await new Promise((res) =>
          flat.toBlob(res, "image/jpeg", 0.9)
        );
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const img = await out.embedJpg(bytes);
        const page = out.addPage([meta.ptW, meta.ptH]);
        page.drawImage(img, { x: 0, y: 0, width: meta.ptW, height: meta.ptH });
      }
      const pdfBytes = await out.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url });
    } catch {
      setError("Something went wrong applying the redactions. Please try again.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const meta = pages[active];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-file">
              Choose a PDF
            </label>
            <input
              ref={inputRef}
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

      {busy && progress && (
        <p className="tool-note" role="status" aria-live="polite">
          {progress}
        </p>
      )}

      {!pages.length && !busy && (
        <p className="tool-note">
          Load a PDF, then drag black boxes over any names, numbers, or other
          text you want to hide. When you download, each page is flattened to an
          image with the boxes baked in — so the text underneath is permanently
          gone, not just covered.
        </p>
      )}

      {meta && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(pages.length)}</div>
              <div className="tool-stat-label">
                {pages.length === 1 ? "Page" : "Pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(meta.boxes.length)}</div>
              <div className="tool-stat-label">Boxes on this page</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(totalBoxes)}</div>
              <div className="tool-stat-label">Boxes total</div>
            </div>
          </div>

          {pages.length > 1 && (
            <div className="tool-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setActive((a) => Math.max(0, a - 1))}
                disabled={active === 0 || busy}
              >
                ← Prev
              </button>
              <span className="tool-note">
                Page {meta.num} of {pages.length}
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setActive((a) => Math.min(pages.length - 1, a + 1))}
                disabled={active === pages.length - 1 || busy}
              >
                Next →
              </button>
            </div>
          )}

          <div style={{ overflowX: "auto", margin: "8px 0" }}>
            <canvas
              ref={viewRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                maxWidth: "100%",
                height: "auto",
                touchAction: "none",
                cursor: "crosshair",
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 6,
              }}
            />
          </div>

          <p className="tool-note">
            Drag across the page to add a redaction box. Overlap several boxes to
            cover an awkward shape.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn"
              onClick={undoBox}
              disabled={busy || meta.boxes.length === 0}
            >
              Undo last box
            </button>
            <button
              type="button"
              className="btn"
              onClick={clearPageBoxes}
              disabled={busy || meta.boxes.length === 0}
            >
              Clear this page
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={apply}
              disabled={busy || totalBoxes === 0}
            >
              {busy ? "Working…" : "Apply & build redacted PDF"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${name}-redacted.pdf`}
              >
                ↓ Download redacted PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Redacted {NUM_FMT.format(totalBoxes)}{" "}
                {totalBoxes === 1 ? "area" : "areas"} across{" "}
                {NUM_FMT.format(pages.length)}{" "}
                {pages.length === 1 ? "page" : "pages"}. Each page is now a
                flattened image with the black boxes permanently baked in.
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a server.
      </p>
    </div>
  );
}
