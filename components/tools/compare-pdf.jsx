"use client";

import { useState, useRef, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Reconstruct text lines from a pdf.js page by grouping text items that sit on
// the same visual row (similar Y), then ordering left-to-right within the row.
async function extractLines(pdf) {
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rows = [];
    for (const item of content.items) {
      const str = item.str;
      if (!str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      // Find an existing row within 3px of this item's baseline.
      let row = null;
      for (const r of rows) {
        if (Math.abs(r.y - y) <= 3) {
          row = r;
          break;
        }
      }
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, str });
      if (item.hasEOL) row.eol = true;
    }
    // Rows go top-to-bottom (larger Y first in PDF coordinate space).
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      const text = r.items.map((it) => it.str).join("").replace(/\s+/g, " ").trim();
      if (text) lines.push(text);
    }
  }
  return lines;
}

// Standard LCS-based line diff. Returns an array of { type, a, b } segments
// where type is "same" | "add" | "del".
function diffLines(a, b) {
  const n = a.length;
  const m = b.length;
  // LCS length table.
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}

function normalize(lines, ignoreCase, ignoreSpace) {
  return lines.map((l) => {
    let s = l;
    if (ignoreSpace) s = s.replace(/\s+/g, "");
    if (ignoreCase) s = s.toLowerCase();
    return s;
  });
}

function countWords(lines) {
  return lines.reduce((sum, l) => sum + (l.match(/\S+/g) || []).length, 0);
}

export default function ComparePdf() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreSpace, setIgnoreSpace] = useState(false);
  // Each doc: { name, lines: string[], pages }
  const [docA, setDocA] = useState(null);
  const [docB, setDocB] = useState(null);
  const inputA = useRef(null);
  const inputB = useRef(null);

  async function readPdf(file) {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
    const data = await file.arrayBuffer();
    // isEvalSupported must stay false to block CVE-2024-4367 (font-driven JS).
    const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    const lines = await extractLines(pdf);
    return { name: file.name.replace(/\.pdf$/i, ""), lines, pages: pdf.numPages };
  }

  async function onFile(e, which) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const doc = await readPdf(file);
      if (which === "a") setDocA(doc);
      else setDocB(doc);
    } catch {
      setError("Couldn't read that PDF — it may be corrupted, encrypted, or password-protected.");
    } finally {
      setBusy(false);
    }
  }

  const result = useMemo(() => {
    if (!docA || !docB) return null;
    const normA = normalize(docA.lines, ignoreCase, ignoreSpace);
    const normB = normalize(docB.lines, ignoreCase, ignoreSpace);
    const rawDiff = diffLines(normA, normB);
    // Map normalized diff back to original text for display.
    let ia = 0;
    let ib = 0;
    const segments = rawDiff.map((seg) => {
      if (seg.type === "del") return { type: "del", text: docA.lines[ia++] };
      if (seg.type === "add") return { type: "add", text: docB.lines[ib++] };
      const text = docA.lines[ia];
      ia++;
      ib++;
      return { type: "same", text };
    });
    let same = 0;
    let added = 0;
    let removed = 0;
    for (const s of segments) {
      if (s.type === "same") same++;
      else if (s.type === "add") added++;
      else removed++;
    }
    const identical = added === 0 && removed === 0;
    const noText = docA.lines.length === 0 && docB.lines.length === 0;
    return { segments, same, added, removed, identical, noText };
  }, [docA, docB, ignoreCase, ignoreSpace]);

  const diffText = useMemo(() => {
    if (!result) return "";
    return result.segments
      .map((s) => (s.type === "add" ? "+ " : s.type === "del" ? "- " : "  ") + s.text)
      .join("\n");
  }, [result]);

  async function onCopy() {
    if (!diffText) return;
    await copyText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cmp-a">
              Original PDF (A)
            </label>
            <input
              id="cmp-a"
              ref={inputA}
              className="tool-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => onFile(e, "a")}
            />
            {docA && (
              <p className="tool-note">
                {docA.name}.pdf — {docA.pages} page{docA.pages === 1 ? "" : "s"}, {docA.lines.length}{" "}
                lines, {countWords(docA.lines)} words
                {docA.lines.length === 0
                  ? " — no selectable text found (this PDF may be scanned or image-only)."
                  : ""}
              </p>
            )}
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cmp-b">
              Revised PDF (B)
            </label>
            <input
              id="cmp-b"
              ref={inputB}
              className="tool-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => onFile(e, "b")}
            />
            {docB && (
              <p className="tool-note">
                {docB.name}.pdf — {docB.pages} page{docB.pages === 1 ? "" : "s"}, {docB.lines.length}{" "}
                lines, {countWords(docB.lines)} words
                {docB.lines.length === 0
                  ? " — no selectable text found (this PDF may be scanned or image-only)."
                  : ""}
              </p>
            )}
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cmp-case">
              <input
                id="cmp-case"
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
              />{" "}
              Ignore case
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cmp-space">
              <input
                id="cmp-space"
                type="checkbox"
                checked={ignoreSpace}
                onChange={(e) => setIgnoreSpace(e.target.checked)}
              />{" "}
              Ignore spacing
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {busy && <p className="tool-note">Reading PDF…</p>}

      {!docA || !docB ? (
        <p className="tool-note">
          Choose two PDFs to compare their text. Everything runs in your browser — the files are never
          uploaded. This tool compares the readable text (not fonts, images, or exact layout).
        </p>
      ) : (
        result && (
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{result.added}</div>
                <div className="tool-stat-label">Lines added in B</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{result.removed}</div>
                <div className="tool-stat-label">Lines removed from A</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{result.same}</div>
                <div className="tool-stat-label">Unchanged lines</div>
              </div>
            </div>

            {result.noText ? (
              <p className="tool-note">
                Neither PDF has selectable text to compare. Both may be scanned or image-only. This
                tool can only compare PDFs that contain real, selectable text.
              </p>
            ) : result.identical ? (
              <p className="tool-note">
                No text differences found. The two PDFs contain the same readable text
                {ignoreCase || ignoreSpace ? " (with your ignore options applied)" : ""}.
              </p>
            ) : (
              <>
                <div className="tool-result-label">Line-by-line differences</div>
                <pre className="tool-output" aria-label="PDF text differences">
                  {diffText}
                </pre>
              </>
            )}

            <div className="tool-actions">
              <button type="button" className="btn btn-primary" onClick={onCopy} disabled={!diffText}>
                {copied ? "Copied!" : "Copy diff"}
              </button>
            </div>
            <p className="tool-note">
              Lines prefixed with “-” are only in A (removed); lines with “+” are only in B (added).
            </p>
          </div>
        )
      )}
    </div>
  );
}
