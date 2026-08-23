"use client";

import { useState, useMemo } from "react";

export default function CharacterCounter() {
  const [text, setText] = useState("");
  const [limitRaw, setLimitRaw] = useState("");

  const stats = useMemo(() => {
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const lines = text === "" ? 0 : text.split(/\r\n|\r|\n/).length;
    return { characters, charactersNoSpaces, words, lines };
  }, [text]);

  const limit = useMemo(() => {
    const n = parseInt(limitRaw, 10);
    if (!Number.isFinite(n) || limitRaw.trim() === "") return null;
    return n;
  }, [limitRaw]);

  const remaining = limit === null ? null : limit - stats.characters;
  const over = remaining !== null && remaining < 0;

  const fmt = (n) => n.toLocaleString("en-US");

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="cc-text">
            Your text
          </label>
          <textarea
            className="tool-textarea"
            id="cc-text"
            rows={8}
            placeholder="Type or paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cc-limit">
              Character limit (optional)
            </label>
            <input
              className="tool-input"
              id="cc-limit"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="e.g. 280"
              value={limitRaw}
              onChange={(e) => setLimitRaw(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.characters)}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.charactersNoSpaces)}</div>
          <div className="tool-stat-label">Characters (no spaces)</div>
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

      {limit !== null && (
        <div className="tool-result">
          <p className="tool-result-label">
            {over ? "Over limit by" : "Remaining characters"}
          </p>
          <div
            className="tool-result-value"
            {...(over ? { style: { color: "var(--tool-error, #dc2626)" } } : {})}
          >
            {over ? fmt(Math.abs(remaining)) : fmt(remaining)}
          </div>
          {over && (
            <p className="tool-error">
              You are {fmt(Math.abs(remaining))} character
              {Math.abs(remaining) === 1 ? "" : "s"} over the {fmt(limit)}{" "}
              limit.
            </p>
          )}
        </div>
      )}

      <p className="tool-note">
        Everything is counted live in your browser. Nothing you type is ever
        uploaded or stored.
      </p>
    </div>
  );
}
