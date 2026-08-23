"use client";

import { useMemo, useState } from "react";

// Escape a string so it can be used as a literal inside a RegExp.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Turn every "$" in a literal replacement into "$$" so String.replace does not
// treat sequences like $1 or $& as substitution patterns when regex mode is off.
function escapeReplacement(str) {
  return str.replace(/\$/g, "$$$$");
}

// Hard cap on how many matches we enumerate while counting, so a pattern that
// can match a zero-length string against a huge input can never freeze the tab.
const MAX_COUNT = 1000000;

function computeResult(source, find, options) {
  const { matchCase, wholeWord, useRegex, replace } = options;

  // Nothing to do until there is both source text and something to find.
  if (!source) {
    return { ok: true, output: "", count: 0, empty: true };
  }
  if (!find) {
    return { ok: true, output: source, count: 0, empty: true };
  }

  let pattern = useRegex ? find : escapeRegex(find);
  if (wholeWord) {
    // Wrap in a non-capturing group so alternation inside a regex pattern
    // still binds correctly between the word boundaries.
    pattern = `\\b(?:${pattern})\\b`;
  }

  const flags = "g" + (matchCase ? "" : "i");

  let regex;
  try {
    regex = new RegExp(pattern, flags);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  // Count occurrences with a manual exec loop that steps over zero-length
  // matches, mirroring how String.replace itself advances.
  let count = 0;
  let m;
  regex.lastIndex = 0;
  try {
    while ((m = regex.exec(source)) !== null) {
      count += 1;
      if (m.index === regex.lastIndex) regex.lastIndex += 1;
      if (count >= MAX_COUNT) break;
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }

  // In regex mode the replacement keeps $1, $&, etc.; in literal mode those
  // sequences are escaped so they insert verbatim.
  const replacement = useRegex ? replace : escapeReplacement(replace);

  let output;
  regex.lastIndex = 0;
  try {
    output = source.replace(regex, replacement);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  return { ok: true, output, count, empty: false, truncated: count >= MAX_COUNT };
}

export default function FindAndReplace() {
  const [source, setSource] = useState("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => computeResult(source, find, { matchCase, wholeWord, useRegex, replace }),
    [source, find, replace, matchCase, wholeWord, useRegex]
  );

  const clearCopied = () => setCopied(false);

  function handleClear() {
    setSource("");
    setFind("");
    setReplace("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!result.ok || !result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  const fmt = (n) => n.toLocaleString("en-US");

  const showResult = result.ok && !result.empty;
  const canCopy = result.ok && result.output.length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="far-source">
            Source text
          </label>
          <textarea
            id="far-source"
            className="tool-textarea"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              clearCopied();
            }}
            placeholder="Type or paste the text you want to search through…"
            rows={8}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="far-find">
              Find
            </label>
            <input
              id="far-find"
              className="tool-input"
              type="text"
              value={find}
              onChange={(e) => {
                setFind(e.target.value);
                clearCopied();
              }}
              placeholder={useRegex ? "e.g. \\d{3}-\\d{4}" : "Text to find"}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="far-replace">
              Replace with
            </label>
            <input
              id="far-replace"
              className="tool-input"
              type="text"
              value={replace}
              onChange={(e) => {
                setReplace(e.target.value);
                clearCopied();
              }}
              placeholder={useRegex ? "Replacement (use $1 for groups)" : "Replacement text"}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label">Options</span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75em 1.25em",
            }}
          >
            <label
              style={{ display: "flex", alignItems: "center", gap: "0.4em", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => {
                  setMatchCase(e.target.checked);
                  clearCopied();
                }}
              />
              Match case
            </label>
            <label
              style={{ display: "flex", alignItems: "center", gap: "0.4em", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => {
                  setWholeWord(e.target.checked);
                  clearCopied();
                }}
              />
              Whole word
            </label>
            <label
              style={{ display: "flex", alignItems: "center", gap: "0.4em", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => {
                  setUseRegex(e.target.checked);
                  clearCopied();
                }}
              />
              Use regex
            </label>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
        {canCopy ? (
          <button
            className={copied ? "btn btn-success" : "btn btn-primary"}
            type="button"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy result"}
          </button>
        ) : null}
      </div>

      {!result.ok ? (
        <div className="tool-error">Invalid regular expression: {result.error}</div>
      ) : null}

      {showResult ? (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{fmt(result.count)}</div>
            <div className="tool-stat-label">
              {result.count === 1 ? "Replacement" : "Replacements"}
            </div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{fmt(source.length)}</div>
            <div className="tool-stat-label">Source chars</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{fmt(result.output.length)}</div>
            <div className="tool-stat-label">Result chars</div>
          </div>
        </div>
      ) : null}

      {result.ok && result.truncated ? (
        <p className="tool-note">
          Stopped counting at {fmt(MAX_COUNT)} matches — the result still contains
          every replacement.
        </p>
      ) : null}

      {showResult && result.count === 0 ? (
        <p className="tool-note">No matches found for your search.</p>
      ) : null}

      {showResult ? (
        <div className="tool-field">
          <label className="tool-result-label" htmlFor="far-output">
            Result
          </label>
          <pre className="tool-output" id="far-output" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {result.output}
          </pre>
        </div>
      ) : null}

      {result.ok && result.empty ? (
        <p className="tool-note">
          Paste your text above, then enter what to find and what to replace it
          with to see the result instantly.
        </p>
      ) : null}

      <p className="tool-note">
        Find and replace text with optional case-sensitive matching, whole-word
        matching, and full regular-expression support (including $1 backreferences
        in the replacement). Everything runs entirely in your browser — nothing you
        type is ever uploaded.
      </p>
    </div>
  );
}
