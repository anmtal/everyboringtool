"use client";

import { useState, useEffect, useRef } from "react";
import mammoth from "mammoth";
import DOMPurify from "dompurify";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// The uploaded file's name is attacker-controlled and gets written into the
// print iframe's <title> via document.write.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ------------------------------------------------------------------ *
 * PDF generation
 *
 * The standard PDF fonts (Helvetica and friends) can only encode WinAnsi,
 * so anything outside it has to be folded down before pdf-lib sees it —
 * otherwise a single CJK character or emoji throws and kills the whole save.
 * ------------------------------------------------------------------ */

// The printable slots WinAnsi puts in the 0x80–0x9F range (curly quotes, dashes…).
const WIN_ANSI_HIGH =
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ" +
  "‘’“”•–—˜™š›œžŸ";

function toWinAnsi(input) {
  let out = "";
  for (const ch of String(input)) {
    const c = ch.codePointAt(0);
    // Tabs, newlines and non-breaking spaces all become plain spaces so the
    // wrapper can treat whitespace uniformly.
    if (c === 9 || c === 10 || c === 13 || c === 160) {
      out += " ";
    } else if (c >= 32 && c <= 126) {
      out += ch;
    } else if (c >= 161 && c <= 255) {
      out += ch;
    } else if (WIN_ANSI_HIGH.indexOf(ch) !== -1) {
      out += ch;
    } else if (c > 159) {
      out += "?";
    }
    // Everything else (control characters) is dropped.
  }
  return out;
}

const PAGE_W = 612; // US Letter, in points
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

// size / lineHeight multiplier / space above / space below / indent
const BLOCK_STYLES = {
  h1: { size: 20, lead: 1.3, before: 16, after: 8, indent: 0, bold: true },
  h2: { size: 16, lead: 1.3, before: 14, after: 6, indent: 0, bold: true },
  h3: { size: 13.5, lead: 1.3, before: 12, after: 5, indent: 0, bold: true },
  h4: { size: 12, lead: 1.3, before: 10, after: 4, indent: 0, bold: true },
  p: { size: 11, lead: 1.45, before: 0, after: 9, indent: 0, bold: false },
  li: { size: 11, lead: 1.45, before: 0, after: 4, indent: 18, bold: false },
  quote: { size: 11, lead: 1.45, before: 4, after: 9, indent: 24, bold: false },
};

const HEADING_TAGS = { h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h4", h6: "h4" };

/** Flatten an element into styled runs: [{ text, bold, italic }, …]. */
function inlineRuns(node, inherited) {
  const runs = [];
  const kids = node.childNodes || [];
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.nodeType === 3) {
      runs.push({ text: child.nodeValue || "", bold: inherited.bold, italic: inherited.italic });
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = String(child.tagName || "").toLowerCase();
    if (tag === "br") {
      runs.push({ text: " ", bold: inherited.bold, italic: inherited.italic });
      continue;
    }
    if (tag === "img") continue; // images aren't carried into the PDF
    // Nested lists are emitted as their own blocks, so don't inline them here
    // as well — that would print every sub-item twice.
    if (tag === "ul" || tag === "ol") continue;
    runs.push(
      ...inlineRuns(child, {
        bold: inherited.bold || tag === "strong" || tag === "b" || tag === "th",
        italic: inherited.italic || tag === "em" || tag === "i",
      })
    );
  }
  return runs;
}

function runsHaveText(runs) {
  return runs.some((r) => /\S/.test(r.text));
}

/** Turn the sanitized mammoth HTML into a flat list of layout blocks. */
function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const blocks = [];

  function pushBlock(kind, runs, prefix) {
    if (!runsHaveText(runs) && !prefix) return;
    blocks.push({ kind, runs, prefix: prefix || "" });
  }

  function walk(node, listPrefix) {
    const kids = node.childNodes || [];
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i];
      if (el.nodeType === 3) {
        // Loose text directly under the body still deserves a paragraph.
        if (/\S/.test(el.nodeValue || "")) {
          pushBlock("p", [{ text: el.nodeValue, bold: false, italic: false }], "");
        }
        continue;
      }
      if (el.nodeType !== 1) continue;
      const tag = String(el.tagName || "").toLowerCase();
      const base = { bold: false, italic: false };

      if (HEADING_TAGS[tag]) {
        pushBlock(HEADING_TAGS[tag], inlineRuns(el, { bold: true, italic: false }), "");
      } else if (tag === "p") {
        pushBlock("p", inlineRuns(el, base), "");
      } else if (tag === "ul" || tag === "ol") {
        const ordered = tag === "ol";
        let n = 1;
        const items = el.children || [];
        for (let j = 0; j < items.length; j++) {
          const li = items[j];
          if (String(li.tagName || "").toLowerCase() !== "li") continue;
          const prefix = ordered ? `${n}. ` : "• ";
          n += 1;
          pushBlock("li", inlineRuns(li, base), prefix);
          // Nested lists inside the <li> still need their own blocks.
          const nested = li.querySelectorAll ? li.querySelectorAll(":scope > ul, :scope > ol") : [];
          for (let k = 0; k < nested.length; k++) walk({ childNodes: [nested[k]] }, null);
        }
      } else if (tag === "table") {
        const rows = el.querySelectorAll ? el.querySelectorAll("tr") : [];
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].children || [];
          const runs = [];
          for (let c = 0; c < cells.length; c++) {
            if (c > 0) runs.push({ text: "  |  ", bold: false, italic: false });
            runs.push(...inlineRuns(cells[c], base));
          }
          pushBlock("p", runs, "");
        }
      } else if (tag === "blockquote") {
        pushBlock("quote", inlineRuns(el, base), "");
      } else if (tag === "pre") {
        pushBlock("p", inlineRuns(el, base), "");
      } else if (tag === "hr" || tag === "img" || tag === "script" || tag === "style") {
        // nothing to lay out
      } else {
        // div / section / anything mammoth emits as a wrapper.
        walk(el, listPrefix);
      }
    }
  }

  walk(doc.body, null);
  return blocks;
}

/** Split styled runs into drawable word tokens, collapsing runs of whitespace. */
function tokenize(runs, fonts, size) {
  const tokens = [];
  let pendingSpace = false;
  for (const run of runs) {
    const font = fonts[run.bold ? (run.italic ? "boldItalic" : "bold") : run.italic ? "italic" : "regular"];
    const text = toWinAnsi(run.text);
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        pendingSpace = tokens.length > 0;
        continue;
      }
      if (pendingSpace) {
        tokens.push({ text: " ", font, width: font.widthOfTextAtSize(" ", size), space: true });
        pendingSpace = false;
      }
      tokens.push({ text: part, font, width: font.widthOfTextAtSize(part, size) });
    }
  }
  return tokens;
}

/** Break a token that is wider than the line into pieces that fit. */
function hardBreak(token, size, maxWidth) {
  const out = [];
  let buf = "";
  for (const ch of token.text) {
    const next = buf + ch;
    if (buf && token.font.widthOfTextAtSize(next, size) > maxWidth) {
      out.push({ text: buf, font: token.font, width: token.font.widthOfTextAtSize(buf, size) });
      buf = ch;
    } else {
      buf = next;
    }
  }
  if (buf) out.push({ text: buf, font: token.font, width: token.font.widthOfTextAtSize(buf, size) });
  return out;
}

/** Greedy word wrap; returns an array of lines, each an array of tokens. */
function wrap(tokens, size, maxWidth) {
  const lines = [];
  let line = [];
  let width = 0;

  const place = (tok) => {
    if (tok.space && line.length === 0) return; // no leading spaces
    if (width + tok.width > maxWidth && line.length > 0) {
      lines.push(line);
      line = [];
      width = 0;
      if (tok.space) return;
    }
    line.push(tok);
    width += tok.width;
  };

  for (const tok of tokens) {
    if (!tok.space && tok.width > maxWidth) {
      for (const piece of hardBreak(tok, size, maxWidth)) place(piece);
    } else {
      place(tok);
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

async function buildPdf(html, title) {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(toWinAnsi(title));

  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const ink = rgb(0.09, 0.09, 0.09);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  let blocks = htmlToBlocks(html);
  if (blocks.length === 0) {
    blocks = [{ kind: "p", runs: [{ text: "(This document appears to be empty.)", bold: false, italic: false }], prefix: "" }];
  }

  let first = true;
  for (const block of blocks) {
    const style = BLOCK_STYLES[block.kind] || BLOCK_STYLES.p;
    const lineHeight = style.size * style.lead;
    const indent = style.indent;
    const maxWidth = CONTENT_W - indent;

    if (!first && style.before) y -= style.before;
    first = false;

    const tokens = tokenize(block.runs, fonts, style.size);
    const lines = wrap(tokens, style.size, maxWidth);
    if (lines.length === 0 && !block.prefix) continue;
    if (lines.length === 0) lines.push([]);

    const prefixFont = fonts.regular;
    const prefixWidth = block.prefix ? prefixFont.widthOfTextAtSize(toWinAnsi(block.prefix), style.size) : 0;

    for (let i = 0; i < lines.length; i++) {
      if (y - lineHeight < MARGIN) newPage();
      y -= lineHeight;

      let x = MARGIN + indent;
      if (block.prefix) {
        if (i === 0) {
          page.drawText(toWinAnsi(block.prefix), {
            x: MARGIN + indent - prefixWidth,
            y,
            size: style.size,
            font: prefixFont,
            color: ink,
          });
        }
      }
      for (const tok of lines[i]) {
        if (tok.text !== " ") {
          page.drawText(tok.text, { x, y, size: style.size, font: tok.font, color: ink });
        }
        x += tok.width;
      }
    }

    y -= style.after;
  }

  return doc.save();
}

/* ------------------------------------------------------------------ */

export default function WordToPdf() {
  const [html, setHtml] = useState("");
  const [name, setName] = useState("document");
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const urlRef = useRef("");
  const runRef = useRef(0);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function revokePdf() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
    setPdfUrl("");
  }

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
    const runId = runRef.current + 1;
    runRef.current = runId;

    setBusy(true);
    setError("");
    setPdfError("");
    setHtml("");
    revokePdf();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      // A .docx is untrusted input and mammoth does not sanitize: it passes through
      // scripts/event handlers and does not validate link schemes (javascript:).
      // This HTML is both rendered here and written into a same-origin iframe.
      const safe = DOMPurify.sanitize(result.value || "", {
        USE_PROFILES: { html: true },
        ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):|^[^a-z]*$/i,
      });
      if (runRef.current !== runId) return;
      const body = safe || "<p>(This document appears to be empty.)</p>";
      const docName = file.name.replace(/\.docx$/i, "");
      setHtml(body);
      setName(docName);

      // Build real PDF bytes so the download link works everywhere, including
      // iOS in-app browsers where window.print() is a dead end.
      setBuilding(true);
      try {
        const bytes = await buildPdf(body, docName);
        if (runRef.current !== runId) return;
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        urlRef.current = url;
        setPdfUrl(url);
      } catch {
        if (runRef.current !== runId) return;
        setPdfError("Couldn't build a downloadable PDF from this document — use “Save as PDF (print)” instead.");
      } finally {
        if (runRef.current === runId) setBuilding(false);
      }
    } catch {
      if (runRef.current === runId) {
        setError("Couldn't read that Word file — it may be corrupted or not a real .docx.");
      }
    } finally {
      if (runRef.current === runId) setBusy(false);
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
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(name)}</title>` +
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
            {pdfUrl ? (
              <a className="btn btn-success" href={pdfUrl} download={`${name}.pdf`}>
                ↓ Download PDF
              </a>
            ) : (
              <button type="button" className="btn btn-success" disabled>
                {building ? "Building PDF…" : "↓ Download PDF"}
              </button>
            )}
            <button type="button" className="btn" onClick={savePdf}>
              Save as PDF (print)
            </button>
          </div>
          {pdfError && <p className="tool-error" role="alert">{pdfError}</p>}
          <p className="tool-note">
            <strong>Download PDF</strong> makes the file right here — text, headings and lists are
            laid out in Helvetica, so fonts, images and colours from Word aren&rsquo;t carried over.
            Want the document to look exactly like the preview below? Use{" "}
            <strong>Save as PDF (print)</strong> and choose <strong>“Save as PDF”</strong> as the
            destination in the print dialog.
          </p>
          <div className="doc-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
    </div>
  );
}
