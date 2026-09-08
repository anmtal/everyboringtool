"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const SEPARATORS = [
  { value: "newline", label: "New line" },
  { value: "space", label: "Space" },
  { value: "comma", label: "Comma + space" },
  { value: "none", label: "Nothing (join directly)" },
  { value: "custom", label: "Custom…" },
];

function separatorString(sep, custom) {
  switch (sep) {
    case "newline":
      return "\n";
    case "space":
      return " ";
    case "comma":
      return ", ";
    case "none":
      return "";
    case "custom":
      // Allow common escape sequences so users can type \n or \t.
      return custom
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r");
    default:
      return "\n";
  }
}

function buildOutput(text, count, sep, custom, numbered, startAt) {
  const n = Math.floor(count);
  if (!text || !Number.isFinite(n) || n < 1) return "";
  const joiner = separatorString(sep, custom);
  const start = Number.isFinite(startAt) ? Math.floor(startAt) : 1;
  const parts = new Array(n);
  for (let i = 0; i < n; i++) {
    parts[i] = numbered ? `${start + i}. ${text}` : text;
  }
  return parts.join(joiner);
}

export default function TextRepeater() {
  const [text, setText] = useState("I will not repeat myself.");
  const [count, setCount] = useState(10);
  const [sep, setSep] = useState("newline");
  const [custom, setCustom] = useState(" | ");
  const [numbered, setNumbered] = useState(false);
  const [startAt, setStartAt] = useState(1);
  const [copied, setCopied] = useState(false);

  const countNum = useMemo(() => {
    const n = parseInt(count, 10);
    return Number.isFinite(n) ? n : NaN;
  }, [count]);

  const tooMany = Number.isFinite(countNum) && countNum > 100000;

  const output = useMemo(() => {
    if (tooMany) return "";
    return buildOutput(
      text,
      countNum,
      sep,
      custom,
      numbered,
      parseInt(startAt, 10)
    );
  }, [text, countNum, sep, custom, numbered, startAt, tooMany]);

  const stats = useMemo(() => {
    return {
      characters: output.length,
      lines: output ? output.split(/\r\n|\r|\n/).length : 0,
    };
  }, [output]);

  const fmt = (v) => v.toLocaleString("en-US");

  function reset() {
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

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repeated-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const showResult = text.trim().length > 0 && Number.isFinite(countNum) && countNum >= 1 && !tooMany;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="tr-text">
            Text to repeat
          </label>
          <textarea
            id="tr-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              reset();
            }}
            placeholder="Type or paste the text you want to repeat…"
            rows={4}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tr-count">
              Number of times
            </label>
            <input
              id="tr-count"
              className="tool-input"
              type="number"
              min={1}
              max={100000}
              value={count}
              onChange={(e) => {
                setCount(e.target.value);
                reset();
              }}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="tr-sep">
              Separate copies with
            </label>
            <select
              id="tr-sep"
              className="tool-select"
              value={sep}
              onChange={(e) => {
                setSep(e.target.value);
                reset();
              }}
            >
              {SEPARATORS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sep === "custom" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="tr-custom">
              Custom separator
            </label>
            <input
              id="tr-custom"
              className="tool-input"
              type="text"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                reset();
              }}
              placeholder="e.g.  |  or \n for a new line"
            />
            <p className="tool-note">
              Type <code>\n</code> for a new line, <code>\t</code> for a tab.
            </p>
          </div>
        ) : null}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tr-numbered">
              Add a number before each copy
            </label>
            <select
              id="tr-numbered"
              className="tool-select"
              value={numbered ? "yes" : "no"}
              onChange={(e) => {
                setNumbered(e.target.value === "yes");
                reset();
              }}
            >
              <option value="no">No</option>
              <option value="yes">Yes (1. 2. 3. …)</option>
            </select>
          </div>

          {numbered ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="tr-start">
                Start numbering at
              </label>
              <input
                id="tr-start"
                className="tool-input"
                type="number"
                value={startAt}
                onChange={(e) => {
                  setStartAt(e.target.value);
                  reset();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {tooMany ? (
        <p className="tool-error" role="status" aria-live="polite">
          That is a lot of copies. Please use 100,000 or fewer so your browser
          stays responsive.
        </p>
      ) : null}

      {showResult ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy result"}
            </button>
            <button className="btn" type="button" onClick={handleDownload}>
              Download .txt
            </button>
          </div>
          <label className="tool-label" htmlFor="tr-output">
            Repeated text
          </label>
          <pre className="tool-output" id="tr-output">
            {output}
          </pre>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(countNum)}</div>
              <div className="tool-stat-label">Copies</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(stats.characters)}</div>
              <div className="tool-stat-label">Characters</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(stats.lines)}</div>
              <div className="tool-stat-label">Lines</div>
            </div>
          </div>
        </div>
      ) : !tooMany ? (
        <p className="tool-note" role="status" aria-live="polite">
          Enter some text and how many times to repeat it, then your result
          appears here ready to copy or download.
        </p>
      ) : null}

      <p className="tool-note">
        The text repeater duplicates whatever you type as many times as you ask,
        joining the copies with the separator you choose. Everything runs
        privately in your browser, so nothing you enter is uploaded or stored.
      </p>
    </div>
  );
}
