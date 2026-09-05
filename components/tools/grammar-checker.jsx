"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";
import { createEngine, norm } from "../../lib/grammarEngine";

// Dictionary (lazy, cached at module scope) + engine built once it is loaded.
// Spelling reuses the site's bundled 168k-word list; the user's text is never
// sent anywhere — everything runs locally in the browser.
let ENGINE = null;
let enginePromise = null;
function loadEngine() {
  if (ENGINE) return Promise.resolve(ENGINE);
  if (!enginePromise) {
    enginePromise = fetch("/words/dict.txt")
      .then((r) => {
        if (!r.ok) throw new Error("dict-load");
        return r.text();
      })
      .then((txt) => {
        const set = new Set();
        let start = 0;
        for (let i = 0; i < txt.length; i++) {
          if (txt.charCodeAt(i) === 10) {
            const w = txt.slice(start, i).trim();
            if (w) set.add(w);
            start = i + 1;
          }
        }
        const last = txt.slice(start).trim();
        if (last) set.add(last);
        ENGINE = createEngine(set);
        return ENGINE;
      });
  }
  return enginePromise;
}

// Issue colours live in globals.css (--gc-*) so the dark-mode overrides there
// keep every label above the AA contrast threshold in both themes.
const TYPE_COLOR = {
  spelling: "var(--gc-spelling)",
  grammar: "var(--gc-grammar)",
  style: "var(--gc-style)",
};

export default function GrammarChecker() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null); // { issues, stats } | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [ignoreNames, setIgnoreNames] = useState(true);
  const [lateSuggestions, setLateSuggestions] = useState({}); // issue id -> string[]
  const ignoredWords = useRef(new Set());
  const dismissed = useRef(new Set());

  const run = useCallback(
    async (nextText) => {
      const value = nextText != null ? nextText : text;
      setLateSuggestions({}); // issue ids are regenerated on every run
      if (!value.trim()) {
        setResult({ issues: [], stats: { words: 0, sentences: 0, spelling: 0, grammar: 0, style: 0 } });
        return;
      }
      setBusy(true);
      setError("");
      try {
        const engine = await loadEngine();
        await new Promise((r) => setTimeout(r, 0)); // let the spinner paint first
        setResult(
          engine.analyze(value, {
            ignoreNames,
            ignoredWords: ignoredWords.current,
            dismissed: dismissed.current,
          })
        );
      } catch (e) {
        setError(
          "Couldn't load the dictionary. Check your connection and try again — it's about 1.6 MB the first time, then cached."
        );
      } finally {
        setBusy(false);
      }
    },
    [text, ignoreNames]
  );

  const applyFix = useCallback(
    (issue, replacement) => {
      const next = text.slice(0, issue.start) + replacement + text.slice(issue.end);
      setText(next);
      run(next);
    },
    [text, run]
  );

  const ignoreWord = useCallback(
    (issue) => {
      ignoredWords.current.add(norm(issue.bad));
      run();
    },
    [run]
  );

  // Beyond the first 25 misspellings the engine defers the (costly) suggestion
  // search, so it runs here only for the word the user actually asks about.
  const showSuggestions = useCallback((issue) => {
    if (!ENGINE) return;
    let list = ENGINE.suggest(issue.bad);
    if (issue.capFirst) list = list.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    setLateSuggestions((prev) => ({ ...prev, [issue.id]: list }));
  }, []);

  const dismiss = useCallback(
    (issue) => {
      dismissed.current.add(issue.type + "|" + issue.message + "|" + issue.bad);
      run();
    },
    [run]
  );

  const fixAll = useCallback(() => {
    if (!result) return;
    const fixable = result.issues
      .filter((i) => i.fix != null)
      .sort((a, b) => b.start - a.start); // apply back-to-front so offsets stay valid
    if (!fixable.length) return;
    let next = text;
    for (const i of fixable) next = next.slice(0, i.start) + i.fix + next.slice(i.end);
    setText(next);
    run(next);
  }, [result, text, run]);

  const clearAll = useCallback(() => {
    setText("");
    setResult(null);
    setError("");
    setLateSuggestions({});
    ignoredWords.current = new Set();
    dismissed.current = new Set();
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await copyText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  }, [text]);

  const segments = useMemo(() => {
    if (!result || !result.issues.length) return null;
    const parts = [];
    let cursor = 0;
    for (const i of result.issues) {
      if (i.start < cursor) continue;
      if (i.start > cursor) parts.push({ text: text.slice(cursor, i.start), key: "t" + cursor });
      parts.push({ text: text.slice(i.start, i.end), mark: i.type, key: "m" + i.id });
      cursor = i.end;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), key: "t" + cursor });
    return parts;
  }, [result, text]);

  const autoFixable = result ? result.issues.filter((i) => i.fix != null).length : 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="gc-input">
            Your text
          </label>
          <textarea
            id="gc-input"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here, then press “Check text”."
            rows={9}
            spellCheck={false}
          />
        </div>

        <label className="tool-label" htmlFor="gc-names" style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: 8 }}>
          <input
            id="gc-names"
            type="checkbox"
            checked={ignoreNames}
            onChange={(e) => setIgnoreNames(e.target.checked)}
          />
          Ignore capitalised words mid-sentence (names, brands)
        </label>

        <div className="tool-actions">
          <button className="btn btn-primary" type="button" onClick={() => run()} disabled={busy}>
            {busy ? "Checking…" : "Check text"}
          </button>
          <button className="btn" type="button" onClick={fixAll} disabled={busy || autoFixable === 0}>
            Fix all fixable{autoFixable ? ` (${autoFixable})` : ""}
          </button>
          <button className="btn" type="button" onClick={onCopy} disabled={!text}>
            {copied ? "Copied!" : "Copy text"}
          </button>
          <button className="btn" type="button" onClick={clearAll} disabled={!text && !result}>
            Clear
          </button>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num" style={{ color: TYPE_COLOR.spelling }}>{result.stats.spelling}</div>
              <div className="tool-stat-label">Spelling</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num" style={{ color: TYPE_COLOR.grammar }}>{result.stats.grammar}</div>
              <div className="tool-stat-label">Grammar</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num" style={{ color: TYPE_COLOR.style }}>{result.stats.style}</div>
              <div className="tool-stat-label">Style</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.stats.words}</div>
              <div className="tool-stat-label">Words</div>
            </div>
          </div>

          {result.issues.length === 0 ? (
            <div className="tool-result" role="status" aria-live="polite" style={{ textAlign: "center" }}>
              <div className="tool-result-value">No issues found ✓</div>
              <p className="tool-note" style={{ marginBottom: 0 }}>
                Nothing flagged in {result.stats.words} word{result.stats.words === 1 ? "" : "s"}.
              </p>
            </div>
          ) : (
            <>
              {segments && (
                <div
                  className="tool-result"
                  aria-hidden="true"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7 }}
                >
                  {segments.map((p) =>
                    p.mark ? (
                      <mark
                        key={p.key}
                        title={p.mark}
                        style={{ background: "transparent", color: "inherit", borderBottom: `2px solid ${TYPE_COLOR[p.mark]}`, padding: 0 }}
                      >
                        {p.text}
                      </mark>
                    ) : (
                      <span key={p.key}>{p.text}</span>
                    )
                  )}
                </div>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0" }}>
                {result.issues.map((i) => {
                  // null = the engine deferred the search; [] = it found nothing.
                  const sugg = i.suggestions === null ? lateSuggestions[i.id] || null : i.suggestions;
                  return (
                  <li
                    key={i.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderLeft: `3px solid ${TYPE_COLOR[i.type]}`,
                      borderRadius: "var(--r-xs)",
                      padding: "10px 12px",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: TYPE_COLOR[i.type] }}>
                        {i.type}
                      </span>
                      <span style={{ fontWeight: 600 }}>“{i.bad.trim() || "␣"}”</span>
                      <span className="tool-note" style={{ margin: 0 }}>{i.message}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {sugg && sugg.length > 0 ? (
                        sugg.map((s, k) => (
                          <button key={k} type="button" className="btn btn-sm" onClick={() => applyFix(i, s)}>
                            {i.type === "spelling"
                              ? s
                              : s.trim() === ""
                              ? "Remove"
                              : `Change to “${s.trim()}”`}
                          </button>
                        ))
                      ) : sugg === null ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => showSuggestions(i)}
                        >
                          Show suggestions
                        </button>
                      ) : i.type === "spelling" ? (
                        <span className="tool-note" style={{ margin: 0 }}>No suggestion — check manually.</span>
                      ) : null}
                      {i.type === "spelling" ? (
                        <button type="button" className="btn btn-sm" onClick={() => ignoreWord(i)}>Ignore word</button>
                      ) : (
                        <button type="button" className="btn btn-sm" onClick={() => dismiss(i)}>Ignore</button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      <p className="tool-note" style={{ marginTop: "0.75rem" }}>
        Spelling uses a 168,000-word English dictionary; grammar and style use a set of
        built-in rules. Everything runs locally in your browser — your text is never
        uploaded. It catches most real mistakes but isn’t a substitute for a careful
        human read.
      </p>
    </div>
  );
}
