"use client";

import { useMemo, useState } from "react";

export default function WordCounter() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();

    const words = trimmed ? (trimmed.match(/\S+/g) || []).length : 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;
    const sentences = trimmed
      ? (trimmed.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length
      : 0;
    const paragraphs = trimmed
      ? trimmed.split(/\n\s*\n+/).filter((p) => p.trim().length > 0).length
      : 0;

    const totalSeconds = words > 0 ? (words / 200) * 60 : 0;
    const minutes = Math.max(1, Math.ceil(totalSeconds / 60));
    const readingTime = words > 0 ? `${minutes} min` : "0 min";

    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime,
    };
  }, [text]);

  const fmt = (n) => n.toLocaleString("en-US");

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="wc-text">
            Your text
          </label>
          <textarea
            id="wc-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here…"
            rows={10}
          />
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.characters)}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.charactersNoSpaces)}</div>
          <div className="tool-stat-label">Characters (no spaces)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.sentences)}</div>
          <div className="tool-stat-label">Sentences</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.paragraphs)}</div>
          <div className="tool-stat-label">Paragraphs</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{stats.readingTime}</div>
          <div className="tool-stat-label">Reading time</div>
        </div>
      </div>

      <p className="tool-note">
        Reading time is estimated at about 200 words per minute. Everything is
        counted live in your browser as you type.
      </p>
    </div>
  );
}
