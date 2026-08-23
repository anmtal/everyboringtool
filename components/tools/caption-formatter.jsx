"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Braille Pattern Blank (U+2800) renders as an invisible, blank glyph but is a
// real, non-whitespace character. Instagram trims lines that contain only
// spaces or zero-width characters, which collapses the blank lines between
// paragraphs when a caption is pasted. Putting this character on each blank
// line keeps the line "non-empty" so the paragraph spacing survives.
const INVISIBLE = "⠀";

// Zero-width and invisible characters we strip when clearing formatting.
const INVISIBLE_CLASS = /[⠀​‌‍﻿]/g;

// Instagram's public limits, shown for reference.
const CHAR_LIMIT = 2200;
const HASHTAG_LIMIT = 30;

// Normalise any newline style to "\n" and return the lines.
function splitLines(str) {
  return str.split(/\r\n|\r|\n/);
}

// Replace every blank / whitespace-only line with the invisible character so
// the spacing between paragraphs survives pasting into Instagram.
function preserveLineBreaks(str) {
  if (!str) return "";
  return splitLines(str)
    .map((line) => (line.trim() === "" ? INVISIBLE : line))
    .join("\n");
}

// Count hashtags the way Instagram does: a "#" at the start of the caption or
// after whitespace, followed by one or more letters, numbers or underscores.
function countHashtags(str) {
  if (!str) return 0;
  const re = /(^|\s)#[\p{L}\p{N}_]+/gu;
  let count = 0;
  while (re.exec(str) !== null) count++;
  return count;
}

export default function CaptionFormatter() {
  const [text, setText] = useState("");
  const [preserve, setPreserve] = useState(true);
  const [copied, setCopied] = useState(false);

  // The copyable output is the input with the "preserve line breaks" transform
  // applied when the toggle is on.
  const output = useMemo(
    () => (preserve ? preserveLineBreaks(text) : text),
    [text, preserve]
  );

  const stats = useMemo(() => {
    const value = output || "";
    // True character count with correct emoji / surrogate-pair handling. This
    // includes the invisible characters, exactly as Instagram will count them.
    const chars = Array.from(value).length;
    // Strip invisible characters before counting words so blank spacer lines
    // are not mistaken for words.
    const visible = value.replace(INVISIBLE_CLASS, "");
    const words = visible.trim() === "" ? 0 : visible.trim().split(/\s+/).length;
    const lines = value === "" ? 0 : splitLines(value).length;
    const hashtags = countHashtags(value);
    return { chars, words, lines, hashtags };
  }, [output]);

  const fmt = (n) => n.toLocaleString("en-US");

  const overChars = stats.chars > CHAR_LIMIT;
  const overHashtags = stats.hashtags > HASHTAG_LIMIT;

  function updateText(next) {
    setText(next);
    setCopied(false);
  }

  // Turn every non-empty line into a bulleted list item, without doubling up
  // bullets on lines that already have one.
  function addBullets() {
    const next = splitLines(text)
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed === "") return line;
        if (/^[•\-*]\s/.test(trimmed)) return line;
        return "• " + line.replace(/^\s+/, "");
      })
      .join("\n");
    updateText(next);
  }

  // Remove bullets and any invisible spacer characters and turn the toggle off,
  // returning the caption to clean plain text.
  function clearFormatting() {
    const next = splitLines(text)
      .map((line) =>
        line.replace(INVISIBLE_CLASS, "").replace(/^\s*[•\-*]\s+/, "")
      )
      .join("\n");
    setPreserve(false);
    updateText(next);
  }

  function clearAll() {
    updateText("");
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

  const hasText = text.length > 0;
  const blankLines = useMemo(
    () => splitLines(text).filter((l) => l.trim() === "").length,
    [text]
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="cf-input">
            Your caption
          </label>
          <textarea
            id="cf-input"
            className="tool-textarea"
            rows={8}
            placeholder="Write or paste your caption here…"
            value={text}
            onChange={(e) => updateText(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-preserve">
              Line breaks
            </label>
            <label
              htmlFor="cf-preserve"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              <input
                id="cf-preserve"
                type="checkbox"
                checked={preserve}
                onChange={(e) => {
                  setPreserve(e.target.checked);
                  setCopied(false);
                }}
              />
              Preserve line breaks for Instagram
            </label>
            <p className="tool-note" style={{ marginTop: "0.4rem" }}>
              {preserve
                ? "Blank lines get an invisible character so paragraph spacing survives pasting."
                : "Output is left exactly as typed."}
            </p>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={addBullets} disabled={!hasText}>
          Add bullet points
        </button>
        <button
          className="btn"
          type="button"
          onClick={clearFormatting}
          disabled={!hasText}
        >
          Clear formatting
        </button>
        <button className="btn" type="button" onClick={clearAll} disabled={!hasText}>
          Clear all
        </button>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={overChars ? { color: "#dc2626" } : undefined}
          >
            {fmt(stats.chars)}
          </div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={overHashtags ? { color: "#dc2626" } : undefined}
          >
            {fmt(stats.hashtags)}
          </div>
          <div className="tool-stat-label">Hashtags</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.lines)}</div>
          <div className="tool-stat-label">Lines</div>
        </div>
      </div>

      {overChars && (
        <p className="tool-error">
          Your caption is {fmt(stats.chars - CHAR_LIMIT)} character
          {stats.chars - CHAR_LIMIT === 1 ? "" : "s"} over Instagram's{" "}
          {fmt(CHAR_LIMIT)}-character caption limit.
        </p>
      )}
      {overHashtags && (
        <p className="tool-error">
          You have {fmt(stats.hashtags)} hashtags. Instagram only counts the
          first {HASHTAG_LIMIT} — extra hashtags are ignored.
        </p>
      )}

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">Formatted caption</p>
        {hasText ? (
          <>
            <pre className="tool-output" style={{ whiteSpace: "pre-wrap" }}>
              {output}
            </pre>
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy caption"}
              </button>
            </div>
            {preserve && blankLines > 0 && (
              <p className="tool-note" style={{ marginTop: "0.5rem" }}>
                Added an invisible spacer to {fmt(blankLines)} blank line
                {blankLines === 1 ? "" : "s"}. The output looks the same here but
                keeps its spacing when pasted into Instagram.
              </p>
            )}
          </>
        ) : (
          <p className="tool-note">
            Your formatted, copy-ready caption will appear here.
          </p>
        )}
      </div>

      <p className="tool-note">
        Instagram collapses the empty lines between paragraphs when you paste a
        caption. With the toggle on, each blank line is filled with a single
        invisible character (Braille Pattern Blank) so your spacing is kept.
        Characters and hashtags are counted the way Instagram counts them, with
        a 2,200-character caption limit and a 30-hashtag limit for reference.
      </p>
      <p className="tool-note">
        Everything runs live in your browser. Nothing you type is ever uploaded
        or stored.
      </p>
    </div>
  );
}
