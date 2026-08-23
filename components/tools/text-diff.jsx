"use client";

import { useMemo, useState } from "react";

// Cap the LCS table size so pathological inputs can't freeze the tab.
// (rows+1) * (cols+1) cells; ~4M keeps memory/time well bounded.
const MAX_CELLS = 4000000;

function splitLines(text) {
  if (!text) return [];
  return text.split(/\r\n|\r|\n/);
}

// Line-by-line diff via the classic Longest Common Subsequence DP.
// Returns { ops, added, removed, tooLarge }.
function computeDiff(original, changed, ignoreWhitespace) {
  const aLines = splitLines(original);
  const bLines = splitLines(changed);
  const norm = (s) => (ignoreWhitespace ? s.trim() : s);
  const a = aLines.map(norm);
  const b = bLines.map(norm);
  const n = a.length;
  const m = b.length;

  if ((n + 1) * (m + 1) > MAX_CELLS) {
    return { ops: [], added: 0, removed: 0, tooLarge: true };
  }

  // dp[i][j] = LCS length of a[i..] and b[j..].
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i];
    const next = dp[i + 1];
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) row[j] = next[j + 1] + 1;
      else row[j] = next[j] >= row[j + 1] ? next[j] : row[j + 1];
    }
  }

  const ops = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", text: aLines[i], aNum: i + 1, bNum: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", text: aLines[i], aNum: i + 1, bNum: null });
      removed++;
      i++;
    } else {
      ops.push({ type: "add", text: bLines[j], aNum: null, bNum: j + 1 });
      added++;
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "remove", text: aLines[i], aNum: i + 1, bNum: null });
    removed++;
    i++;
  }
  while (j < m) {
    ops.push({ type: "add", text: bLines[j], aNum: null, bNum: j + 1 });
    added++;
    j++;
  }

  return { ops, added, removed, tooLarge: false };
}

const ADD_BG = "rgba(35, 134, 54, 0.18)";
const ADD_ACCENT = "#2ea043";
const REMOVE_BG = "rgba(248, 81, 73, 0.16)";
const REMOVE_ACCENT = "#f85149";

const rowStyle = (type) => {
  let background = "transparent";
  let borderColor = "transparent";
  if (type === "add") {
    background = ADD_BG;
    borderColor = ADD_ACCENT;
  } else if (type === "remove") {
    background = REMOVE_BG;
    borderColor = REMOVE_ACCENT;
  }
  return {
    display: "flex",
    alignItems: "flex-start",
    background,
    borderLeft: `3px solid ${borderColor}`,
    minHeight: "1.5em",
  };
};

const gutterStyle = {
  flex: "0 0 auto",
  width: "3.2em",
  textAlign: "right",
  padding: "0 0.5em",
  opacity: 0.55,
  userSelect: "none",
  whiteSpace: "pre",
};

const markerStyle = (type) => ({
  flex: "0 0 auto",
  width: "1.2em",
  textAlign: "center",
  userSelect: "none",
  fontWeight: 600,
  color:
    type === "add" ? ADD_ACCENT : type === "remove" ? REMOVE_ACCENT : "inherit",
});

const contentStyle = {
  flex: "1 1 auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  paddingRight: "0.5em",
};

export default function TextDiff() {
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [copied, setCopied] = useState(false);

  const { ops, added, removed, tooLarge } = useMemo(
    () => computeDiff(original, changed, ignoreWhitespace),
    [original, changed, ignoreWhitespace]
  );

  const hasInput = original.length > 0 || changed.length > 0;
  const unchanged = ops.filter((o) => o.type === "equal").length;
  const identical = hasInput && !tooLarge && added === 0 && removed === 0;

  const fmt = (n) => n.toLocaleString("en-US");

  function handleOriginal(e) {
    setOriginal(e.target.value);
    setCopied(false);
  }
  function handleChanged(e) {
    setChanged(e.target.value);
    setCopied(false);
  }
  function handleIgnoreWs(e) {
    setIgnoreWhitespace(e.target.checked);
    setCopied(false);
  }
  function handleSwap() {
    setOriginal(changed);
    setChanged(original);
    setCopied(false);
  }
  function handleClear() {
    setOriginal("");
    setChanged("");
    setCopied(false);
  }

  const marker = (type) => (type === "add" ? "+" : type === "remove" ? "-" : " ");

  const unifiedText = useMemo(() => {
    return ops.map((o) => marker(o.type) + " " + o.text).join("\n");
  }, [ops]);

  async function handleCopy() {
    if (!ops.length) return;
    try {
      await navigator.clipboard.writeText(unifiedText);
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
            <label className="tool-label" htmlFor="td-original">
              Original
            </label>
            <textarea
              id="td-original"
              className="tool-textarea"
              value={original}
              onChange={handleOriginal}
              placeholder="Paste the original text here…"
              rows={10}
              spellCheck={false}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="td-changed">
              Changed
            </label>
            <textarea
              id="td-changed"
              className="tool-textarea"
              value={changed}
              onChange={handleChanged}
              placeholder="Paste the changed text here…"
              rows={10}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" style={{ display: "flex", alignItems: "center", gap: "0.5em", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={handleIgnoreWs}
            />
            Ignore leading &amp; trailing whitespace
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSwap}>
          Swap sides
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
        {ops.length > 0 && !identical ? (
          <button
            className={copied ? "btn btn-success" : "btn btn-primary"}
            type="button"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy diff"}
          </button>
        ) : null}
      </div>

      {tooLarge ? (
        <div className="tool-error">
          These inputs are too large to diff line by line. Try comparing smaller
          sections of text.
        </div>
      ) : null}

      {!tooLarge && hasInput ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num" style={{ color: ADD_ACCENT }}>
              +{fmt(added)}
            </div>
            <div className="tool-stat-label">Added lines</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num" style={{ color: REMOVE_ACCENT }}>
              -{fmt(removed)}
            </div>
            <div className="tool-stat-label">Removed lines</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{fmt(unchanged)}</div>
            <div className="tool-stat-label">Unchanged lines</div>
          </div>
        </div>
      ) : null}

      {identical ? (
        <p className="tool-note">
          The two texts are identical{ignoreWhitespace ? " (ignoring leading and trailing whitespace)" : ""}.
        </p>
      ) : null}

      {!tooLarge && ops.length > 0 && !identical ? (
        <div className="tool-field">
          <label className="tool-result-label">Line-by-line diff</label>
          <div
            style={{
              border: "1px solid rgba(128, 128, 128, 0.35)",
              borderRadius: "8px",
              overflow: "auto",
              maxHeight: "520px",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {ops.map((o, idx) => (
              <div key={idx} style={rowStyle(o.type)}>
                <span style={gutterStyle}>{o.aNum == null ? "" : o.aNum}</span>
                <span style={gutterStyle}>{o.bNum == null ? "" : o.bNum}</span>
                <span style={markerStyle(o.type)}>{marker(o.type)}</span>
                <span style={contentStyle}>
                  {o.text.length ? o.text : " "}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        Paste two versions of any text to see exactly which lines were added or
        removed. Added lines are highlighted in green with a + and removed lines
        in red with a -. Everything runs live in your browser, and nothing you
        paste is ever uploaded.
      </p>
    </div>
  );
}
