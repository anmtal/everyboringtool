"use client";

import { useMemo, useState } from "react";

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
  "during", "each", "few", "more", "most", "she's", "he's", "it's", "i'm",
  "don't", "us", "shall", "should", "may", "might", "must",
]);

export default function KeywordDensityChecker() {
  const [text, setText] = useState("");

  const analysis = useMemo(() => {
    const tokens = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];
    const totalWords = tokens.length;

    const counts = new Map();
    let countedWords = 0;

    for (const word of tokens) {
      if (STOP_WORDS.has(word) || word.length < 2) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
      countedWords += 1;
    }

    const keywords = Array.from(counts.entries())
      .map(([word, count]) => ({
        word,
        count,
        density: totalWords > 0 ? (count / totalWords) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, 15);

    return {
      totalWords,
      uniqueKeywords: counts.size,
      countedWords,
      keywords,
    };
  }, [text]);

  const fmt = (n) => n.toLocaleString("en-US");
  const pct = (n) => `${n.toFixed(2)}%`;

  const hasText = analysis.totalWords > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="kd-text">
            Your text
          </label>
          <textarea
            id="kd-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your content here to see keyword density…"
            rows={10}
          />
        </div>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">Total words</p>
        <div className="tool-result-value">
          {hasText ? fmt(analysis.totalWords) : "—"}
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasText ? fmt(analysis.totalWords) : "—"}
          </div>
          <div className="tool-stat-label">Total words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasText ? fmt(analysis.uniqueKeywords) : "—"}
          </div>
          <div className="tool-stat-label">Unique keywords</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasText ? fmt(analysis.countedWords) : "—"}
          </div>
          <div className="tool-stat-label">Keyword words (no stop words)</div>
        </div>
      </div>

      {hasText && analysis.keywords.length > 0 ? (
        <div className="tool-output">
          {analysis.keywords.map((k, i) => (
            <div
              key={k.word}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.15rem 0",
              }}
            >
              <span style={{ flex: "0 0 auto", opacity: 0.6, width: "2rem" }}>
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
                {k.word}
              </span>
              <span style={{ flex: "0 0 auto", opacity: 0.75 }}>
                {fmt(k.count)}×
              </span>
              <span style={{ flex: "0 0 auto", width: "4.5rem", textAlign: "right" }}>
                {pct(k.density)}
              </span>
            </div>
          ))}
        </div>
      ) : hasText ? (
        <p className="tool-note">
          No keywords found — the text only contains common stop words.
        </p>
      ) : null}

      <p className="tool-note">
        Density is each keyword&apos;s share of the total word count
        (count ÷ total words × 100). Common stop words like &ldquo;the&rdquo;,
        &ldquo;and&rdquo;, and &ldquo;of&rdquo; are ignored. Everything is
        analyzed live in your browser as you type.
      </p>
    </div>
  );
}
