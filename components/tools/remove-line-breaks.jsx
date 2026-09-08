"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = `The quick brown fox
jumps over the
lazy dog.

Pack my box with
five dozen liquor
jugs.`;

// What to put in place of each removed line break.
const REPLACERS = [
  { value: "space", label: "A single space" },
  { value: "none", label: "Nothing (join directly)" },
  { value: "comma", label: "Comma + space" },
  { value: "custom", label: "Custom text…" },
];

function collapseSpaces(text) {
  // Collapse runs of spaces/tabs into one, but leave newlines alone.
  return text.replace(/[ \t\f\v]+/g, " ");
}

function process(input, opts) {
  const { replacer, custom, keepParagraphs, removeEmpty, trimLines, collapse } = opts;

  if (!input) return "";

  // Normalize all newline styles to \n first.
  let text = input.replace(/\r\n|\r/g, "\n");

  // Determine the joiner used to replace single line breaks.
  let joiner;
  switch (replacer) {
    case "none":
      joiner = "";
      break;
    case "comma":
      joiner = ", ";
      break;
    case "custom":
      joiner = custom;
      break;
    case "space":
    default:
      joiner = " ";
      break;
  }

  if (keepParagraphs) {
    // A "paragraph" is a block separated by one or more blank lines.
    const paragraphs = text.split(/\n[ \t]*\n+/);
    const rebuilt = paragraphs
      .map((para) => {
        let lines = para.split("\n");
        if (trimLines) lines = lines.map((l) => l.trim());
        if (removeEmpty) lines = lines.filter((l) => l.length > 0);
        return lines.join(joiner);
      })
      .filter((para) => (removeEmpty ? para.trim().length > 0 : true))
      .join("\n\n");
    return collapse ? collapseSpaces(rebuilt).replace(/ *\n */g, "\n") : rebuilt;
  }

  // No paragraph preservation: flatten everything into one line.
  let lines = text.split("\n");
  if (trimLines) lines = lines.map((l) => l.trim());
  if (removeEmpty) lines = lines.filter((l) => l.length > 0);
  let out = lines.join(joiner);
  if (collapse) out = collapseSpaces(out);
  return out;
}

export default function RemoveLineBreaks() {
  const [text, setText] = useState(EXAMPLE);
  const [replacer, setReplacer] = useState("space");
  const [custom, setCustom] = useState(" | ");
  const [keepParagraphs, setKeepParagraphs] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [trimLines, setTrimLines] = useState(true);
  const [collapse, setCollapse] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () =>
      process(text, {
        replacer,
        custom,
        keepParagraphs,
        removeEmpty,
        trimLines,
        collapse,
      }),
    [text, replacer, custom, keepParagraphs, removeEmpty, trimLines, collapse]
  );

  const stats = useMemo(() => {
    const inBreaks = (text.match(/\r\n|\r|\n/g) || []).length;
    const outBreaks = (output.match(/\n/g) || []).length;
    return {
      removed: Math.max(0, inBreaks - outBreaks),
      inChars: text.length,
      outChars: output.length,
    };
  }, [text, output]);

  const fmt = (n) => n.toLocaleString("en-US");

  function bump() {
    setCopied(false);
  }

  function handleClear() {
    setText("");
    setCopied(false);
  }

  function handleExample() {
    setText(EXAMPLE);
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
        <div className="tool-field">
          <label className="tool-label" htmlFor="rlb-input">
            Your text
          </label>
          <textarea
            id="rlb-input"
            className="tool-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              bump();
            }}
            placeholder="Paste text with unwanted line breaks here…"
            rows={8}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rlb-replacer">
              Replace each line break with
            </label>
            <select
              id="rlb-replacer"
              className="tool-select"
              value={replacer}
              onChange={(e) => {
                setReplacer(e.target.value);
                bump();
              }}
            >
              {REPLACERS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {replacer === "custom" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="rlb-custom">
                Custom separator
              </label>
              <input
                id="rlb-custom"
                className="tool-input"
                type="text"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  bump();
                }}
                placeholder=" | "
              />
            </div>
          ) : null}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rlb-keep-para">
            <input
              id="rlb-keep-para"
              type="checkbox"
              checked={keepParagraphs}
              onChange={(e) => {
                setKeepParagraphs(e.target.checked);
                bump();
              }}
            />{" "}
            Keep paragraph breaks (blank lines stay as paragraph splits)
          </label>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rlb-remove-empty">
            <input
              id="rlb-remove-empty"
              type="checkbox"
              checked={removeEmpty}
              onChange={(e) => {
                setRemoveEmpty(e.target.checked);
                bump();
              }}
            />{" "}
            Remove empty lines
          </label>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rlb-trim">
            <input
              id="rlb-trim"
              type="checkbox"
              checked={trimLines}
              onChange={(e) => {
                setTrimLines(e.target.checked);
                bump();
              }}
            />{" "}
            Trim leading/trailing spaces on each line
          </label>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rlb-collapse">
            <input
              id="rlb-collapse"
              type="checkbox"
              checked={collapse}
              onChange={(e) => {
                setCollapse(e.target.checked);
                bump();
              }}
            />{" "}
            Collapse repeated spaces into one
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleExample}>
          Load example
        </button>
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
              {copied ? "Copied!" : "Copy result"}
            </button>
          </div>
          <label className="tool-label" htmlFor="rlb-output">
            Cleaned text
          </label>
          <pre className="tool-output" id="rlb-output">
            {output}
          </pre>
        </div>
      ) : (
        <p className="tool-note">
          Paste some text above to strip out its line breaks. Try the “Load
          example” button to see how the options work.
        </p>
      )}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.removed)}</div>
          <div className="tool-stat-label">Line breaks removed</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.inChars)}</div>
          <div className="tool-stat-label">Input characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.outChars)}</div>
          <div className="tool-stat-label">Output characters</div>
        </div>
      </div>

      <p className="tool-note">
        Great for un-wrapping text copied from PDFs, emails, or code editors that
        insert a hard return at the end of every line. Keep “paragraph breaks” on
        to turn wrapped lines back into clean paragraphs, or turn it off to
        flatten everything onto a single line. All processing happens in your
        browser — nothing you paste is uploaded.
      </p>
    </div>
  );
}
