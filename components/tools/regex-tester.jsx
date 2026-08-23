"use client";

import { useMemo, useState, useEffect, useRef } from "react";

// Cap how many matches we enumerate.
// NOTE: this cap alone does NOT make the tool safe. A catastrophically
// backtracking pattern (e.g. /(a+)+$/ against "aaaaaaaaaaaaaaaaaaaaaaaaaaa!")
// never returns from a SINGLE exec() call, so no loop counter can help. The
// regex is therefore executed inside a Web Worker that we terminate on timeout,
// which is the only way to actually recover the tab.
const MAX_MATCHES = 5000;
const TIMEOUT_MS = 2000;

// Self-contained worker: receives {pattern, flagStr, input}, returns the same
// shape runRegex() does. Kept in sync with runRegex/describeMatch below, which
// remain as the fallback for browsers without Worker support.
const WORKER_SRC = `
const MAX_MATCHES = ${MAX_MATCHES};
function describeMatch(m) {
  const groups = [];
  for (let i = 1; i < m.length; i++) groups.push({ index: i, value: m[i] });
  const named = m.groups ? Object.keys(m.groups).map((n) => ({ name: n, value: m.groups[n] })) : [];
  return { text: m[0], index: m.index, end: m.index + m[0].length, groups, named };
}
self.onmessage = function (e) {
  const { pattern, flagStr, input } = e.data;
  if (!pattern) { self.postMessage({ ok: true, empty: true, matches: [], truncated: false }); return; }
  let regex;
  try { regex = new RegExp(pattern, flagStr); }
  catch (err) { self.postMessage({ ok: false, error: err.message }); return; }
  const matches = [];
  let truncated = false;
  try {
    if (regex.global) {
      let m; regex.lastIndex = 0;
      while ((m = regex.exec(input)) !== null) {
        matches.push(describeMatch(m));
        if (m.index === regex.lastIndex) regex.lastIndex += 1;
        if (matches.length >= MAX_MATCHES) { truncated = true; break; }
      }
    } else {
      const m = regex.exec(input);
      if (m !== null) matches.push(describeMatch(m));
    }
  } catch (err) { self.postMessage({ ok: false, error: err.message }); return; }
  self.postMessage({ ok: true, empty: false, matches: matches, truncated: truncated });
};
`;

const FLAG_DEFS = [
  { key: "g", label: "global (g)", hint: "Find all matches, not just the first" },
  { key: "i", label: "ignore case (i)", hint: "Case-insensitive matching" },
  { key: "m", label: "multiline (m)", hint: "^ and $ match line breaks" },
  { key: "s", label: "dotall (s)", hint: ". matches newline characters" },
];

// Two alternating highlight tints so neighbouring matches stay distinct.
// rgba over currentColor text keeps them readable in both light and dark mode.
const HL_A = "rgba(56, 139, 253, 0.30)";
const HL_A_BORDER = "rgba(56, 139, 253, 0.75)";
const HL_B = "rgba(219, 109, 40, 0.30)";
const HL_B_BORDER = "rgba(219, 109, 40, 0.80)";

function buildFlagString(flags) {
  return FLAG_DEFS.filter((f) => flags[f.key]).map((f) => f.key).join("");
}

// Run the regex and collect every match with its capture groups.
// Honours the user's flags exactly: without "g" only the first match is found,
// which is how a real RegExp behaves.
function runRegex(pattern, flagStr, input) {
  if (!pattern) {
    return { ok: true, empty: true, regex: null, matches: [], truncated: false };
  }

  let regex;
  try {
    regex = new RegExp(pattern, flagStr);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const matches = [];
  let truncated = false;

  try {
    if (regex.global) {
      let m;
      regex.lastIndex = 0;
      while ((m = regex.exec(input)) !== null) {
        matches.push(describeMatch(m));
        // Avoid an infinite loop on zero-length matches.
        if (m.index === regex.lastIndex) regex.lastIndex += 1;
        if (matches.length >= MAX_MATCHES) {
          truncated = true;
          break;
        }
      }
    } else {
      const m = regex.exec(input);
      if (m !== null) matches.push(describeMatch(m));
    }
  } catch (err) {
    return { ok: false, error: err.message, regex };
  }

  return { ok: true, empty: false, regex, matches, truncated };
}

function describeMatch(m) {
  // m[0] is the full match; m[1..] are numbered capture groups.
  const groups = [];
  for (let i = 1; i < m.length; i++) {
    groups.push({ index: i, value: m[i] });
  }
  const named = m.groups
    ? Object.keys(m.groups).map((name) => ({ name, value: m.groups[name] }))
    : [];
  return {
    text: m[0],
    index: m.index,
    end: m.index + m[0].length,
    groups,
    named,
  };
}

// Split the input into alternating plain / matched segments for highlighting.
// Matches from a single exec loop are ordered and never overlap.
function buildSegments(input, matches) {
  const segs = [];
  let cursor = 0;
  matches.forEach((mt, i) => {
    if (mt.index > cursor) {
      segs.push({ text: input.slice(cursor, mt.index), match: false });
    }
    segs.push({
      text: input.slice(mt.index, mt.end),
      match: true,
      order: i,
      zero: mt.index === mt.end,
    });
    cursor = Math.max(cursor, mt.end);
  });
  if (cursor < input.length) {
    segs.push({ text: input.slice(cursor), match: false });
  }
  return segs;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)\\.(\\w+)");
  const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false });
  const [input, setInput] = useState(
    "Contact us at hello@example.com or Support@Every.Boring or sales@acme.io."
  );
  const [copied, setCopied] = useState(false);

  const flagStr = useMemo(() => buildFlagString(flags), [flags]);

  // Execute in a terminable worker so a runaway pattern can never freeze the tab.
  const [result, setResult] = useState({ ok: true, empty: true, matches: [], truncated: false });
  const workerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    function kill() {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    }
    kill();

    if (typeof window === "undefined" || typeof Worker === "undefined") {
      setResult(runRegex(pattern, flagStr, input)); // legacy fallback
      return;
    }

    let url;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "application/javascript" }));
      const w = new Worker(url);
      workerRef.current = w;
      w.onmessage = (e) => { kill(); setResult(e.data); };
      w.onerror = () => { kill(); setResult({ ok: false, error: "Couldn't run that pattern." }); };
      timerRef.current = setTimeout(() => {
        kill();
        setResult({
          ok: false,
          error:
            "That pattern took too long and was stopped (over " + TIMEOUT_MS / 1000 +
            "s). It likely causes catastrophic backtracking — try making nested quantifiers like (a+)+ more specific.",
        });
      }, TIMEOUT_MS);
      w.postMessage({ pattern, flagStr, input });
    } catch {
      setResult(runRegex(pattern, flagStr, input));
    } finally {
      if (url) URL.revokeObjectURL(url);
    }

    return kill;
  }, [pattern, flagStr, input]);

  const segments = useMemo(() => {
    if (!result.ok || result.empty || result.matches.length === 0) return null;
    return buildSegments(input, result.matches);
  }, [result, input]);

  function toggleFlag(key) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    setCopied(false);
  }

  function handleClear() {
    setPattern("");
    setInput("");
    setCopied(false);
  }

  const matchCount = result.ok && !result.empty ? result.matches.length : 0;
  const groupCount =
    result.ok && !result.empty && result.matches.length > 0
      ? result.matches[0].groups.length
      : 0;

  const copyText = useMemo(() => {
    if (!result.ok || result.empty || result.matches.length === 0) return "";
    return result.matches
      .map((mt) => {
        const parts = [`#${mt.index}: ${JSON.stringify(mt.text)}`];
        mt.groups.forEach((g) =>
          parts.push(`  $${g.index} = ${g.value === undefined ? "(undefined)" : JSON.stringify(g.value)}`)
        );
        mt.named.forEach((g) =>
          parts.push(`  <${g.name}> = ${g.value === undefined ? "(undefined)" : JSON.stringify(g.value)}`)
        );
        return parts.join("\n");
      })
      .join("\n");
  }, [result]);

  async function handleCopy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  const fmt = (n) => n.toLocaleString("en-US");

  const hlStyle = (order, zero) => {
    const even = order % 2 === 0;
    return {
      background: zero ? "transparent" : even ? HL_A : HL_B,
      borderRadius: "3px",
      boxShadow: zero
        ? `inset 2px 0 0 ${even ? HL_A_BORDER : HL_B_BORDER}`
        : `inset 0 -2px 0 ${even ? HL_A_BORDER : HL_B_BORDER}`,
      padding: zero ? "0" : "0.05em 0.05em",
    };
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rx-pattern">
            Regular expression
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4em",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
            }}
          >
            <span style={{ opacity: 0.55, fontSize: "1.1em" }}>/</span>
            <input
              id="rx-pattern"
              className="tool-input"
              type="text"
              value={pattern}
              onChange={(e) => {
                setPattern(e.target.value);
                setCopied(false);
              }}
              placeholder="e.g. \d{3}-\d{4}"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              style={{ fontFamily: "inherit" }}
            />
            <span style={{ opacity: 0.55, fontSize: "1.1em" }}>
              /{flagStr}
            </span>
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label">Flags</span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75em 1.25em",
            }}
          >
            {FLAG_DEFS.map((f) => (
              <label
                key={f.key}
                title={f.hint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4em",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={flags[f.key]}
                  onChange={() => toggleFlag(f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rx-input">
            Test string
          </label>
          <textarea
            id="rx-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder="Type or paste the text you want to test against…"
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
        {matchCount > 0 ? (
          <button
            className={copied ? "btn btn-success" : "btn btn-primary"}
            type="button"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy matches"}
          </button>
        ) : null}
      </div>

      {!result.ok ? (
        <div className="tool-error">Invalid regular expression: {result.error}</div>
      ) : null}

      {result.ok && !result.empty ? (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{fmt(matchCount)}</div>
            <div className="tool-stat-label">
              {matchCount === 1 ? "Match" : "Matches"}
            </div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{fmt(groupCount)}</div>
            <div className="tool-stat-label">Capture groups</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{flags.g ? "on" : "off"}</div>
            <div className="tool-stat-label">Global flag</div>
          </div>
        </div>
      ) : null}

      {result.truncated ? (
        <p className="tool-note">
          Showing the first {fmt(MAX_MATCHES)} matches. Refine your pattern to see
          fewer results.
        </p>
      ) : null}

      {result.ok && result.empty ? (
        <p className="tool-note">
          Enter a regular expression above to start matching.
        </p>
      ) : null}

      {result.ok && !result.empty && input.length > 0 ? (
        <div className="tool-field">
          <label className="tool-result-label">Highlighted test string</label>
          <div
            className="tool-output"
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.7,
            }}
          >
            {segments && matchCount > 0 ? (
              segments.map((s, i) =>
                s.match ? (
                  <span key={i} style={hlStyle(s.order, s.zero)}>
                    {s.zero ? "​" : s.text}
                  </span>
                ) : (
                  <span key={i}>{s.text}</span>
                )
              )
            ) : (
              <span style={{ opacity: 0.6 }}>{input}</span>
            )}
          </div>
        </div>
      ) : null}

      {result.ok && matchCount === 0 && !result.empty && input.length > 0 ? (
        <p className="tool-note">No matches found in the test string.</p>
      ) : null}

      {matchCount > 0 ? (
        <div className="tool-field">
          <label className="tool-result-label">
            Matches &amp; capture groups
          </label>
          <div
            className="tool-output"
            style={{ display: "flex", flexDirection: "column", gap: "0.75em" }}
          >
            {result.matches.map((mt, i) => (
              <div
                key={i}
                style={{
                  borderLeft: `3px solid ${
                    i % 2 === 0 ? HL_A_BORDER : HL_B_BORDER
                  }`,
                  paddingLeft: "0.6em",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5em", alignItems: "baseline" }}>
                  <span style={{ opacity: 0.6 }}>Match {i + 1}</span>
                  <span style={{ fontWeight: 600, wordBreak: "break-all" }}>
                    {mt.text === "" ? "(empty match)" : mt.text}
                  </span>
                  <span style={{ opacity: 0.6, fontSize: "0.85em" }}>
                    at index {mt.index}
                  </span>
                </div>
                {mt.groups.length > 0 || mt.named.length > 0 ? (
                  <div style={{ marginTop: "0.3em", paddingLeft: "0.4em" }}>
                    {mt.groups.map((g) => (
                      <div key={`g${g.index}`} style={{ opacity: 0.9 }}>
                        <span style={{ opacity: 0.6 }}>${g.index}</span>{" "}
                        {g.value === undefined ? (
                          <span style={{ opacity: 0.5 }}>(no match)</span>
                        ) : g.value === "" ? (
                          <span style={{ opacity: 0.5 }}>(empty)</span>
                        ) : (
                          <span style={{ wordBreak: "break-all" }}>{g.value}</span>
                        )}
                      </div>
                    ))}
                    {mt.named.map((g) => (
                      <div key={`n${g.name}`} style={{ opacity: 0.9 }}>
                        <span style={{ opacity: 0.6 }}>&lt;{g.name}&gt;</span>{" "}
                        {g.value === undefined ? (
                          <span style={{ opacity: 0.5 }}>(no match)</span>
                        ) : g.value === "" ? (
                          <span style={{ opacity: 0.5 }}>(empty)</span>
                        ) : (
                          <span style={{ wordBreak: "break-all" }}>{g.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        Build any JavaScript-style regular expression, toggle the g, i, m, and s
        flags, and see every match highlighted live inside your test string along
        with its capture groups and position. Everything runs entirely in your
        browser — nothing you type is ever uploaded.
      </p>
    </div>
  );
}
