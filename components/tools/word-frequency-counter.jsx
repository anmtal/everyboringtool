"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "can", "could", "did", "do", "does", "doing", "for", "from", "had", "has",
  "have", "having", "he", "her", "here", "hers", "him", "his", "how", "i",
  "if", "in", "into", "is", "it", "its", "just", "me", "my", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "our", "ours",
  "out", "over", "own", "s", "she", "so", "some", "such", "t", "than", "that",
  "the", "their", "theirs", "them", "then", "there", "these", "they", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "we",
  "were", "what", "when", "where", "which", "while", "who", "whom", "why",
  "will", "with", "would", "you", "your", "yours", "about", "after", "again",
  "all", "am", "any", "because", "before", "below", "between", "both", "down",
  "during", "each", "few", "more", "most", "us", "shall", "should", "may",
  "might", "must",
]);

const SAMPLE =
  "The quick brown fox jumps over the lazy dog. The dog was not amused, " +
  "and the fox was quick to run. Quick thinking, that fox — quick, quick, quick!";

export default function WordFrequencyCounter() {
  const [text, setText] = useState(SAMPLE);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ignoreStop, setIgnoreStop] = useState(false);
  const [minLen, setMinLen] = useState(1);
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => {
    // Unicode-aware tokenizer: keeps accented words and internal apostrophes
    // (e.g. "café", "don’t") intact instead of splitting on them.
    const raw = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
    const totalWords = raw.length;

    const counts = new Map();
    for (const original of raw) {
      const key = ignoreCase ? original.toLowerCase() : original;
      if (ignoreStop && STOP_WORDS.has(key.toLowerCase())) continue;
      if (key.length < minLen) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    let countedWords = 0;
    for (const c of counts.values()) countedWords += c;

    const rows = Array.from(counts.entries())
      .map(([word, count]) => ({
        word,
        count,
        pct: countedWords > 0 ? (count / countedWords) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

    return {
      totalWords,
      uniqueWords: counts.size,
      countedWords,
      rows,
    };
  }, [text, ignoreCase, ignoreStop, minLen]);

  const fmt = (n) => n.toLocaleString("en-US");
  const pct = (n) => `${n.toFixed(2)}%`;
  const hasText = analysis.totalWords > 0;
  const hasRows = analysis.rows.length > 0;

  const buildCsv = () => {
    const header = "rank,word,count,percent\n";
    const body = analysis.rows
      .map((r, i) => {
        const safe = /[",\n]/.test(r.word)
          ? `"${r.word.replace(/"/g, '""')}"`
          : r.word;
        return `${i + 1},${safe},${r.count},${r.pct.toFixed(2)}`;
      })
      .join("\n");
    return header + body;
  };

  const downloadCsv = () => {
    const blob = new Blob([buildCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-frequency.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyResults = async () => {
    const lines = analysis.rows
      .map((r, i) => `${i + 1}. ${r.word} — ${r.count} (${r.pct.toFixed(2)}%)`)
      .join("\n");
    await copyText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="wfc-text">
            Your text
          </label>
          <textarea
            id="wfc-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here to count word frequency…"
            rows={9}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wfc-case">
              Case handling
            </label>
            <select
              id="wfc-case"
              className="tool-select"
              value={ignoreCase ? "ignore" : "match"}
              onChange={(e) => setIgnoreCase(e.target.value === "ignore")}
            >
              <option value="ignore">Ignore case (The = the)</option>
              <option value="match">Case-sensitive (The ≠ the)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="wfc-stop">
              Common words
            </label>
            <select
              id="wfc-stop"
              className="tool-select"
              value={ignoreStop ? "hide" : "keep"}
              onChange={(e) => setIgnoreStop(e.target.value === "hide")}
            >
              <option value="keep">Count all words</option>
              <option value="hide">Skip stop words (the, and, of…)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="wfc-min">
              Minimum length
            </label>
            <select
              id="wfc-min"
              className="tool-select"
              value={String(minLen)}
              onChange={(e) => setMinLen(Number(e.target.value))}
            >
              <option value="1">1+ characters</option>
              <option value="2">2+ characters</option>
              <option value="3">3+ characters</option>
              <option value="4">4+ characters</option>
              <option value="5">5+ characters</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasText ? fmt(analysis.totalWords) : "—"}
          </div>
          <div className="tool-stat-label">Total words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasText ? fmt(analysis.uniqueWords) : "—"}
          </div>
          <div className="tool-stat-label">Unique words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasText ? fmt(analysis.countedWords) : "—"}
          </div>
          <div className="tool-stat-label">Words counted</div>
        </div>
      </div>

      {hasRows ? (
        <>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={copyResults}>
              {copied ? "Copied!" : "Copy list"}
            </button>
            <button type="button" className="btn" onClick={downloadCsv}>
              Download CSV
            </button>
          </div>

          <div className="tool-output" role="status" aria-live="polite">
            {analysis.rows.slice(0, 100).map((r, i) => (
              <div
                key={r.word}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.15rem 0",
                }}
              >
                <span style={{ flex: "0 0 auto", opacity: 0.6, width: "2.5rem" }}>
                  {i + 1}.
                </span>
                <span
                  style={{
                    flex: "1 1 auto",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.word}
                </span>
                <span style={{ flex: "0 0 auto", opacity: 0.75 }}>
                  {fmt(r.count)}×
                </span>
                <span style={{ flex: "0 0 auto", width: "4.5rem", textAlign: "right" }}>
                  {pct(r.pct)}
                </span>
              </div>
            ))}
          </div>

          {analysis.rows.length > 100 ? (
            <p className="tool-note">
              Showing the top 100 of {fmt(analysis.rows.length)} unique words.
              Download the CSV for the full list.
            </p>
          ) : null}
        </>
      ) : hasText ? (
        <p className="tool-note">
          No words match your current filters — try lowering the minimum length
          or counting all words.
        </p>
      ) : (
        <p className="tool-note">
          Paste or type some text above to see how often each word appears,
          ranked from most to least frequent.
        </p>
      )}

      <p className="tool-note">
        Words are ranked by how many times they appear. Percentages are each
        word&apos;s share of the words counted (after your filters).
        Everything runs privately in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
