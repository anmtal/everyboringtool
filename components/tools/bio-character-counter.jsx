"use client";

import { useState, useMemo } from "react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram bio", limit: 150 },
  { id: "twitter", label: "X / Twitter bio", limit: 160 },
  { id: "tiktok", label: "TikTok bio", limit: 80 },
  { id: "youtube", label: "YouTube description", limit: 1000 },
  { id: "linkedin", label: "LinkedIn headline", limit: 220 },
];

export default function BioCharacterCounter() {
  const [text, setText] = useState("");
  const [platformId, setPlatformId] = useState("instagram");

  const platform = useMemo(
    () => PLATFORMS.find((p) => p.id === platformId) || PLATFORMS[0],
    [platformId]
  );
  const limit = platform.limit;

  const stats = useMemo(() => {
    const value = text || "";
    // True character count with correct emoji / surrogate-pair handling.
    const chars = Array.from(value).length;
    const words = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
    const lines = value === "" ? 0 : value.split(/\r\n|\r|\n/).length;
    return { chars, words, lines };
  }, [text]);

  const remaining = limit - stats.chars;
  const over = remaining < 0;
  const pct = limit > 0 ? Math.min(100, (stats.chars / limit) * 100) : 0;

  const fmt = (n) => n.toLocaleString("en-US");

  const barColor = over
    ? "#dc2626"
    : remaining <= Math.max(5, Math.round(limit * 0.1))
    ? "#d97706"
    : "currentColor";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bcc-platform">
              Platform
            </label>
            <select
              className="tool-select"
              id="bcc-platform"
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.limit} characters)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="bcc-text">
            Your bio
          </label>
          <textarea
            className="tool-textarea"
            id="bcc-text"
            rows={6}
            placeholder="Write or paste your bio here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">
          {over ? "Over limit by" : "Characters remaining"}
        </p>
        <div
          className="tool-result-value"
          style={over ? { color: "#dc2626" } : undefined}
        >
          {over ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)}
        </div>
        <p className="tool-note" style={{ marginTop: "0.35rem" }}>
          {fmt(stats.chars)} / {fmt(limit)} used &middot; {platform.label}
        </p>

        <div
          aria-hidden="true"
          style={{
            marginTop: "0.75rem",
            height: "8px",
            borderRadius: "999px",
            background: "rgba(128,128,128,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: "999px",
              background: barColor,
              transition: "width 0.15s ease",
            }}
          />
        </div>

        {over && (
          <p className="tool-error" style={{ marginTop: "0.6rem" }}>
            You are {fmt(Math.abs(remaining))} character
            {Math.abs(remaining) === 1 ? "" : "s"} over the {fmt(limit)}
            -character {platform.label} limit.
          </p>
        )}
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={over ? { color: "#dc2626" } : undefined}
          >
            {fmt(stats.chars)}
          </div>
          <div className="tool-stat-label">Characters used</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(limit)}</div>
          <div className="tool-stat-label">Limit</div>
        </div>
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={over ? { color: "#dc2626" } : undefined}
          >
            {over ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)}
          </div>
          <div className="tool-stat-label">Remaining</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
      </div>

      <p className="tool-note">
        Characters are counted with correct emoji handling, so a single emoji
        counts as one character just like it does on each platform. Limits shown
        are the standard public limits: Instagram bio 150, X / Twitter bio 160,
        TikTok bio 80, YouTube description 1,000 and LinkedIn headline 220
        characters.
      </p>
      <p className="tool-note">
        Everything runs live in your browser. Nothing you type is ever uploaded
        or stored.
      </p>
    </div>
  );
}
