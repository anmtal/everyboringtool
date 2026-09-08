"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  PDFDocument,
  PDFRawStream,
  PDFName,
  PDFNumber,
  decodePDFRawStream,
} from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

// --- byte / string helpers (operate on PDF content streams as Latin-1) ---

function bytesToLatin1(u8) {
  let s = "";
  const CHUNK = 1 << 15;
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  return s;
}

function latin1ToBytes(s) {
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
  return u;
}

// Turn a PDF literal-string body (between the outer parens) into its characters.
function unescapeLiteral(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\") {
      const n = raw[i + 1];
      if (n === undefined) break;
      if (n >= "0" && n <= "7") {
        let oct = n;
        i++;
        for (let k = 0; k < 2; k++) {
          const d = raw[i + 1];
          if (d >= "0" && d <= "7") {
            oct += d;
            i++;
          } else break;
        }
        out += String.fromCharCode(parseInt(oct, 8) & 0xff);
      } else if (n === "n") {
        out += "\n";
        i++;
      } else if (n === "r") {
        out += "\r";
        i++;
      } else if (n === "t") {
        out += "\t";
        i++;
      } else if (n === "b") {
        out += "\b";
        i++;
      } else if (n === "f") {
        out += "\f";
        i++;
      } else if (n === "\n") {
        // line continuation
        i++;
      } else if (n === "\r") {
        i++;
        if (raw[i + 1] === "\n") i++;
      } else {
        out += n;
        i++;
      }
    } else {
      out += c;
    }
  }
  return out;
}

// Re-escape characters back into a PDF literal string body.
function escapeLiteral(t) {
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "\\" || c === "(" || c === ")") out += "\\" + c;
    else if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === "\t") out += "\\t";
    else out += c;
  }
  return out;
}

function hexToText(h) {
  const clean = h.replace(/[^0-9A-Fa-f]/g, "");
  const even = clean.length % 2 ? clean + "0" : clean;
  let t = "";
  for (let i = 0; i < even.length; i += 2) {
    t += String.fromCharCode(parseInt(even.substr(i, 2), 16));
  }
  return t;
}

function textToHex(t) {
  let h = "";
  for (let i = 0; i < t.length; i++) {
    h += (t.charCodeAt(i) & 0xff).toString(16).padStart(2, "0").toUpperCase();
  }
  return h;
}

// Replace every occurrence of `find` with `repl` in one decoded text run.
function replaceRun(text, find, repl, caseSensitive, counter) {
  if (!find) return text;
  let out = "";
  let i = 0;
  const hay = caseSensitive ? text : text.toLowerCase();
  const ndl = caseSensitive ? find : find.toLowerCase();
  while (i < text.length) {
    if (ndl.length && hay.startsWith(ndl, i)) {
      out += repl;
      i += find.length;
      counter.n++;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}

// Walk a content stream, rewriting the text inside every literal `(...)` and
// hex `<...>` string operand. `<<` (dictionaries) are passed through untouched.
function rewriteContent(s, find, repl, caseSensitive, counter) {
  let out = "";
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const ch = s[j];
        if (ch === "\\") {
          j += 2;
          continue;
        }
        if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      const raw = s.slice(i + 1, j);
      const text = unescapeLiteral(raw);
      const nt = replaceRun(text, find, repl, caseSensitive, counter);
      out += "(" + escapeLiteral(nt) + ")";
      i = j + 1;
      continue;
    }
    if (c === "<" && s[i + 1] === "<") {
      out += "<<";
      i += 2;
      continue;
    }
    if (c === "<") {
      let j = i + 1;
      while (j < n && s[j] !== ">") j++;
      const raw = s.slice(i + 1, j);
      const text = hexToText(raw);
      const nt = replaceRun(text, find, repl, caseSensitive, counter);
      out += "<" + textToHex(nt) + ">";
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Collect the plain text of every string operand in a content stream — used to
// preview how many matches exist and to warn when a PDF has no editable text.
function extractRuns(s) {
  const runs = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const ch = s[j];
        if (ch === "\\") {
          j += 2;
          continue;
        }
        if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      runs.push(unescapeLiteral(s.slice(i + 1, j)));
      i = j + 1;
      continue;
    }
    if (c === "<" && s[i + 1] === "<") {
      i += 2;
      continue;
    }
    if (c === "<") {
      let j = i + 1;
      while (j < n && s[j] !== ">") j++;
      runs.push(hexToText(s.slice(i + 1, j)));
      i = j + 1;
      continue;
    }
    i++;
  }
  return runs;
}

const TEXT_OP = /Tj|TJ/;

export default function FindAndReplacePdf() {
  const [file, setFile] = useState(null);
  const [bytes, setBytes] = useState(null); // Uint8Array of original PDF
  const [pageCount, setPageCount] = useState(0);
  const [docText, setDocText] = useState(""); // all extracted runs, \n-joined
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, count }

  const resultUrlRef = useRef("");

  useEffect(
    () => () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    []
  );

  function clearResult() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
    setResult(null);
  }

  function reset() {
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setDocText("");
    setStatus("");
    clearResult();
  }

  async function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = "";
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
      const buf = new Uint8Array(await chosen.arrayBuffer());
      const doc = await PDFDocument.load(buf);
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");

      // Extract editable text runs for the live match preview.
      const runs = [];
      for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFRawStream) {
          let decoded;
          try {
            decoded = decodePDFRawStream(obj).decode();
          } catch {
            continue;
          }
          const s = bytesToLatin1(decoded);
          if (!TEXT_OP.test(s)) continue;
          for (const r of extractRuns(s)) runs.push(r);
        }
      }

      setFile(chosen);
      setBytes(buf);
      setPageCount(count);
      setDocText(runs.join("\n"));
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  // Live count of matches in the extracted text (informational only).
  const matchCount = useMemo(() => {
    if (!docText || !find) return 0;
    const hay = caseSensitive ? docText : docText.toLowerCase();
    const ndl = caseSensitive ? find : find.toLowerCase();
    if (!ndl) return 0;
    let n = 0;
    let idx = hay.indexOf(ndl);
    while (idx !== -1) {
      n++;
      idx = hay.indexOf(ndl, idx + ndl.length);
    }
    return n;
  }, [docText, find, caseSensitive]);

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  async function runReplace() {
    if (!bytes || !find) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Replacing text…");
    try {
      const doc = await PDFDocument.load(bytes);
      const counter = { n: 0 };

      for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
        if (!(obj instanceof PDFRawStream)) continue;
        let decoded;
        try {
          decoded = decodePDFRawStream(obj).decode();
        } catch {
          continue;
        }
        const s = bytesToLatin1(decoded);
        if (!TEXT_OP.test(s)) continue;

        const before = counter.n;
        const ns = rewriteContent(s, find, replace, caseSensitive, counter);
        if (counter.n > before) {
          const nb = latin1ToBytes(ns);
          const dict = obj.dict;
          // We wrote decoded (uncompressed) bytes, so drop the filters.
          dict.delete(PDFName.of("Filter"));
          dict.delete(PDFName.of("DecodeParms"));
          dict.set(PDFName.of("Length"), PDFNumber.of(nb.length));
          doc.context.assign(ref, PDFRawStream.of(dict, nb));
        }
      }

      if (counter.n === 0) {
        setError(
          `No editable occurrences of “${find}” were found and replaced. If you can see the text on the page, it may be part of a scanned image or a subset font that stores glyph codes instead of readable characters — those can't be edited here.`
        );
        return;
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url, count: counter.n });
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Something went wrong editing that PDF. It may be corrupted or use an unusual internal structure."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const canRun = !!bytes && !!find && !busy;
  const lengthWarn =
    find && replace && replace.length > find.length && matchCount > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fr-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="fr-file"
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

      {!file && !error && (
        <p className="tool-note">
          Upload a text-based PDF, type the text you want to find and what to
          replace it with, and download the edited file. Everything happens in
          your browser.
        </p>
      )}

      {file && pageCount > 0 && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(pageCount)}</div>
              <div className="tool-stat-label">
                {pageCount === 1 ? "Page" : "Pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {find ? NUM_FMT.format(matchCount) : "—"}
              </div>
              <div className="tool-stat-label">
                {find ? "Matches found" : "Type text to find"}
              </div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="fr-find">
                  Find this text
                </label>
                <input
                  className="tool-input"
                  id="fr-find"
                  type="text"
                  value={find}
                  placeholder="e.g. 2024"
                  onChange={(e) => {
                    setFind(e.target.value);
                    if (error) setError("");
                    clearResult();
                  }}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="fr-replace">
                  Replace with
                </label>
                <input
                  className="tool-input"
                  id="fr-replace"
                  type="text"
                  value={replace}
                  placeholder="e.g. 2025"
                  onChange={(e) => {
                    setReplace(e.target.value);
                    if (error) setError("");
                    clearResult();
                  }}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="fr-case">
                  Case
                </label>
                <select
                  className="tool-select"
                  id="fr-case"
                  value={caseSensitive ? "yes" : "no"}
                  onChange={(e) => {
                    setCaseSensitive(e.target.value === "yes");
                    clearResult();
                  }}
                >
                  <option value="yes">Match case (exact)</option>
                  <option value="no">Ignore case</option>
                </select>
              </div>
            </div>
          </div>

          {find && matchCount === 0 && (
            <p className="tool-note">
              No matches for “{find}” in this PDF&apos;s editable text. The text
              may be inside a scanned image or a subset font, which can&apos;t be
              edited here.
            </p>
          )}

          {lengthWarn && (
            <p className="tool-note">
              Your replacement is longer than the text it replaces. The new text
              is placed at the same position, so longer words can overlap what
              follows — check the result before using it.
            </p>
          )}

          <p className="tool-note">
            Replaces every matching run of characters and keeps the original
            position and font. It edits the real text in the file, not an
            overlay — so it works best on PDFs that were exported from a
            document (invoices, letters, forms), not scans.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={runReplace}
              disabled={!canRun}
            >
              {busy ? "Working…" : "Find & replace"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}-edited.pdf`}
              >
                ↓ Download edited PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Replaced {NUM_FMT.format(result.count)}{" "}
                {result.count === 1 ? "occurrence" : "occurrences"} of “{find}”
                with “{replace}”.
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
