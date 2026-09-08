"use client";

import { useState, useRef } from "react";
import { copyText } from "../../lib/copyText";

// Round a font height into buckets so tiny sub-pixel differences don't create
// dozens of distinct "sizes". Keeps heading detection stable.
function bucket(n) {
  return Math.round(n * 2) / 2;
}

// Turn a single page's text items into an array of lines. Each item from
// pdf.js carries a transform matrix ([a,b,c,d,e,f]) where e,f are x,y in PDF
// user space (origin bottom-left) and the height ~= sqrt(b*b + d*d).
function itemsToLines(items) {
  const rows = [];
  for (const it of items) {
    const str = it.str;
    if (str == null) continue;
    const tr = it.transform || [1, 0, 0, 1, 0, 0];
    const x = tr[4];
    const y = tr[5];
    const height = it.height || Math.hypot(tr[1], tr[3]) || 10;
    rows.push({ str, x, y, height, width: it.width || 0, eol: it.hasEOL });
  }
  if (!rows.length) return [];

  // Group items into lines: same line if their baselines are within a small
  // fraction of the text height. Sort by y descending (top of page first).
  rows.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  let cur = null;
  for (const r of rows) {
    if (cur && Math.abs(cur.y - r.y) <= Math.max(2, r.height * 0.5)) {
      cur.items.push(r);
      cur.y = (cur.y * (cur.items.length - 1) + r.y) / cur.items.length;
    } else {
      cur = { y: r.y, items: [r] };
      lines.push(cur);
    }
  }

  // Build the text of each line, inserting a space when there's a real gap
  // between adjacent items (pdf.js splits words at font/kerning boundaries).
  return lines.map((ln) => {
    ln.items.sort((a, b) => a.x - b.x);
    let text = "";
    let prev = null;
    let maxH = 0;
    let minX = Infinity;
    for (const it of ln.items) {
      if (it.height > maxH) maxH = it.height;
      if (it.x < minX) minX = it.x;
      if (prev) {
        const gap = it.x - (prev.x + prev.width);
        const needSpace =
          gap > Math.max(1, it.height * 0.25) &&
          !text.endsWith(" ") &&
          !text.endsWith("-");
        if (needSpace) text += " ";
      }
      text += it.str;
      prev = it;
    }
    return { text: text.replace(/\s+/g, " ").trim(), height: maxH, x: minX, y: ln.y };
  }).filter((l) => l.text.length > 0);
}

// Detect the body font size = the most common line height across the doc.
function bodySize(allLines) {
  const counts = new Map();
  for (const l of allLines) {
    const b = bucket(l.height);
    counts.set(b, (counts.get(b) || 0) + l.text.length);
  }
  let best = 0;
  let bestCount = -1;
  for (const [size, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      best = size;
    }
  }
  return best || 12;
}

const BULLET_RE = /^[•‣◦⁃∙*·•‣▪◦-]\s+/;
const NUM_RE = /^(\d{1,3})[.)]\s+/;

function convertLinesToMarkdown(pageLines, body, opts) {
  const out = [];
  let prevY = null;
  let prevWasBlank = true;

  const pushBlank = () => {
    if (out.length && out[out.length - 1] !== "") out.push("");
  };

  for (const l of pageLines) {
    const text = l.text;
    const ratio = l.height / body;

    // Vertical gap since previous line signals a paragraph break.
    if (prevY != null) {
      const gap = prevY - l.y;
      if (gap > l.height * 1.6) pushBlank();
    }
    prevY = l.y;

    // Headings: noticeably larger than body text, short-ish, no terminal period.
    if (opts.headings && ratio >= 1.25 && text.length <= 120) {
      let level = 2;
      if (ratio >= 1.9) level = 1;
      else if (ratio >= 1.5) level = 2;
      else level = 3;
      pushBlank();
      out.push("#".repeat(level) + " " + text);
      pushBlank();
      prevWasBlank = true;
      continue;
    }

    // Bullet lists.
    const bm = text.match(BULLET_RE);
    if (opts.lists && bm) {
      out.push("- " + text.slice(bm[0].length).trim());
      prevWasBlank = false;
      continue;
    }

    // Numbered lists.
    const nm = text.match(NUM_RE);
    if (opts.lists && nm) {
      out.push(nm[1] + ". " + text.slice(nm[0].length).trim());
      prevWasBlank = false;
      continue;
    }

    // Regular paragraph text. Merge with the previous line when it looks like a
    // wrapped continuation (previous line didn't end a sentence and this one
    // starts lowercase) unless paragraph-per-line mode is on.
    if (
      !opts.lineBreaks &&
      out.length &&
      !prevWasBlank &&
      out[out.length - 1] !== "" &&
      !/[.!?:;]$/.test(out[out.length - 1]) &&
      !BULLET_RE.test(out[out.length - 1]) &&
      /^[a-z(]/.test(text)
    ) {
      out[out.length - 1] = out[out.length - 1].replace(/-$/, "") + " " + text;
    } else {
      out.push(text);
    }
    prevWasBlank = false;
  }
  return out;
}

export default function PdfToMarkdown() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [name, setName] = useState("document");
  const [stats, setStats] = useState(null); // { pages, words }
  const [copied, setCopied] = useState(false);

  // Conversion options
  const [headings, setHeadings] = useState(true);
  const [lists, setLists] = useState(true);
  const [lineBreaks, setLineBreaks] = useState(false);
  const [pageRules, setPageRules] = useState(true);

  const inputRef = useRef(null);
  const bufRef = useRef(null); // keep the last file's ArrayBuffer for re-convert

  async function runConversion(buffer, opts, fileName) {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
    // Clone: pdf.js transfers/detaches the buffer it's given, so keep our copy.
    const data = buffer.slice(0);
    const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;

    // First pass: collect every line to learn the body font size.
    const perPage = [];
    const all = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      setProgress(`Reading page ${p} of ${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const lines = itemsToLines(content.items);
      perPage.push(lines);
      for (const l of lines) all.push(l);
    }

    const body = bodySize(all);
    const chunks = [];
    let words = 0;
    for (let i = 0; i < perPage.length; i++) {
      const md = convertLinesToMarkdown(perPage[i], body, opts);
      const joined = md.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (joined) {
        words += joined.split(/\s+/).filter(Boolean).length;
        chunks.push(joined);
      }
    }

    const sep = opts.pageRules ? "\n\n---\n\n" : "\n\n";
    const result = chunks.join(sep).trim();
    setMarkdown(result);
    setStats({ pages: pdf.numPages, words });
    if (!result) {
      setError(
        "No selectable text found. This looks like a scanned or image-only PDF — a text-conversion tool can't read it (that needs OCR)."
      );
    }
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
    setMarkdown("");
    setStats(null);
    setCopied(false);
    setName(file.name.replace(/\.pdf$/i, "") || "document");
    try {
      const buffer = await file.arrayBuffer();
      bufRef.current = buffer;
      await runConversion(buffer, { headings, lists, lineBreaks, pageRules }, file.name);
    } catch (err) {
      setError(
        "Couldn't read that PDF — it may be corrupted, encrypted, or password-protected."
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function reconvert(next) {
    if (!bufRef.current || busy) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      await runConversion(bufRef.current, next, name);
    } catch (err) {
      setError("Couldn't re-convert that PDF.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  function toggle(setter, key, value) {
    setter(value);
    reconvert({
      headings: key === "headings" ? value : headings,
      lists: key === "lists" ? value : lists,
      lineBreaks: key === "lineBreaks" ? value : lineBreaks,
      pageRules: key === "pageRules" ? value : pageRules,
    });
  }

  async function handleCopy() {
    if (!markdown) return;
    try {
      await copyText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function downloadMd() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="pdfmd-file">
          PDF file
        </label>
        <input
          ref={inputRef}
          id="pdfmd-file"
          className="tool-input"
          type="file"
          accept="application/pdf"
          onChange={onFile}
          disabled={busy}
        />
        <p className="tool-note">
          Your file is read and converted entirely in your browser. Nothing is
          uploaded, and no sign-up is needed.
        </p>
      </div>

      <div className="tool-row">
        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="pdfmd-headings"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              id="pdfmd-headings"
              type="checkbox"
              checked={headings}
              disabled={busy}
              onChange={(e) => toggle(setHeadings, "headings", e.target.checked)}
            />
            <span>Detect headings (#)</span>
          </label>
        </div>
        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="pdfmd-lists"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              id="pdfmd-lists"
              type="checkbox"
              checked={lists}
              disabled={busy}
              onChange={(e) => toggle(setLists, "lists", e.target.checked)}
            />
            <span>Detect bullet &amp; numbered lists</span>
          </label>
        </div>
      </div>

      <div className="tool-row">
        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="pdfmd-rules"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              id="pdfmd-rules"
              type="checkbox"
              checked={pageRules}
              disabled={busy}
              onChange={(e) => toggle(setPageRules, "pageRules", e.target.checked)}
            />
            <span>Separate pages with ---</span>
          </label>
        </div>
        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="pdfmd-breaks"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              id="pdfmd-breaks"
              type="checkbox"
              checked={lineBreaks}
              disabled={busy}
              onChange={(e) => toggle(setLineBreaks, "lineBreaks", e.target.checked)}
            />
            <span>Keep original line breaks</span>
          </label>
        </div>
      </div>

      {busy && (
        <p className="tool-note" role="status" aria-live="polite">
          {progress || "Working…"}
        </p>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {stats && !error && (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.pages.toLocaleString("en-US")}</div>
            <div className="tool-stat-label">Pages</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.words.toLocaleString("en-US")}</div>
            <div className="tool-stat-label">Words</div>
          </div>
        </div>
      )}

      {markdown && (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn btn-primary"}
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
            <button type="button" className="btn" onClick={downloadMd}>
              ↓ Download .md
            </button>
          </div>
          <label className="tool-label" htmlFor="pdfmd-output">
            Markdown output
          </label>
          <pre className="tool-output" id="pdfmd-output">
            {markdown}
          </pre>
        </div>
      )}

      {!markdown && !busy && !error && (
        <p className="tool-note">
          Choose a PDF above to convert its text into clean Markdown. The tool
          reads the PDF&apos;s embedded text, then rebuilds paragraphs and
          detects headings and lists from the layout. Works best on
          text-based PDFs (documents exported from Word, Google Docs, LaTeX,
          web pages, etc.). Scanned/image-only PDFs have no selectable text and
          can&apos;t be converted without OCR.
        </p>
      )}
    </div>
  );
}
