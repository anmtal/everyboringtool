"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Turn a single line of text into a clean URL slug.
// - NFD normalize + strip combining marks so accents become plain letters (é -> e)
// - drop a handful of common ligatures/symbols that NFD leaves intact
// - replace any run of non-alphanumeric characters with the chosen separator
// - collapse repeated separators and trim them from the ends
function slugifyLine(line, separator, lowercase) {
  if (!line) return "";

  let text = line;

  // A few characters do not decompose under NFD but have obvious slug forms.
  text = text
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/ø/g, "o")
    .replace(/Ø/g, "O")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[&]/g, " and ");

  // Decompose accented characters, then strip the combining diacritical marks
  // (the U+0300–U+036F range) so the base letters remain.
  text = text.normalize("NFD").replace(/[̀-ͯ]/g, "");

  if (lowercase) text = text.toLowerCase();

  // Escape the separator so it is safe inside the character class / regex below.
  const sep = separator === "_" ? "_" : "-";
  const sepEsc = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  text = text
    // Anything that is not a Latin letter or digit becomes the separator.
    .replace(/[^a-zA-Z0-9]+/g, sep)
    // Collapse repeated separators.
    .replace(new RegExp(sepEsc + "{2,}", "g"), sep)
    // Trim leading and trailing separators.
    .replace(new RegExp("^" + sepEsc + "+|" + sepEsc + "+$", "g"), "");

  return text;
}

export default function Slugify() {
  const [text, setText] = useState("");
  const [separator, setSeparator] = useState("-");
  const [lowercase, setLowercase] = useState(true);
  const [copied, setCopied] = useState(false);

  const { slugs, output } = useMemo(() => {
    if (!text) return { slugs: [], output: "" };
    // Keep every original line so input and output stay row-aligned.
    const lines = text.split(/\r\n|\r|\n/);
    const result = lines.map((line) => slugifyLine(line, separator, lowercase));
    return { slugs: result, output: result.join("\n") };
  }, [text, separator, lowercase]);

  const stats = useMemo(() => {
    const totalLines = text ? text.split(/\r\n|\r|\n/).length : 0;
    const nonEmptyIn = text
      ? text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "").length
      : 0;
    const validSlugs = slugs.filter((s) => s !== "").length;
    return { lines: totalLines, inputs: nonEmptyIn, slugs: validSlugs };
  }, [text, slugs]);

  const fmt = (n) => n.toLocaleString("en-US");

  function handleTextChange(e) {
    setText(e.target.value);
    setCopied(false);
  }

  function handleSeparatorChange(e) {
    setSeparator(e.target.value);
    setCopied(false);
  }

  function handleLowercaseChange(e) {
    setLowercase(e.target.checked);
    setCopied(false);
  }

  function handleClear() {
    setText("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="slug-separator">
              Word separator
            </label>
            <select
              id="slug-separator"
              className="tool-select"
              value={separator}
              onChange={handleSeparatorChange}
            >
              <option value="-">Hyphen ( - )</option>
              <option value="_">Underscore ( _ )</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="slug-lowercase">
              Letter case
            </label>
            <label
              htmlFor="slug-lowercase"
              className="tool-note"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
            >
              <input
                id="slug-lowercase"
                type="checkbox"
                checked={lowercase}
                onChange={handleLowercaseChange}
              />
              Force lowercase
            </label>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="slug-input">
            Titles or headings (one per line)
          </label>
          <textarea
            id="slug-input"
            className="tool-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder={"Paste one title per line, e.g.\nHello, World!\n10 Café Recipes You'll Love\nThe Ultimate Guide (2026)"}
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy slugs"}
            </button>
          </div>
          <label className="tool-label" htmlFor="slug-output">
            Slugs (one per line)
          </label>
          <pre className="tool-output" id="slug-output">
            {output}
          </pre>
        </div>
      ) : null}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.lines)}</div>
          <div className="tool-stat-label">Lines</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.inputs)}</div>
          <div className="tool-stat-label">Titles in</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.slugs)}</div>
          <div className="tool-stat-label">Slugs out</div>
        </div>
      </div>

      <p className="tool-note">
        Paste a whole list of titles or headings and each line becomes its own
        clean URL slug. Accents are flattened (café → cafe), punctuation is
        removed, spaces turn into your chosen separator, and repeats are
        collapsed. Everything runs live in your browser and nothing you paste is
        ever uploaded.
      </p>
    </div>
  );
}
