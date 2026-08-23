"use client";

import { useState, useMemo } from "react";

const STANDARD_LIMIT = 280;
const PREMIUM_LIMIT = 4000;
const URL_WEIGHT = 23;

// Matches http:// and https:// links up to the next whitespace.
const URL_REGEX = /https?:\/\/[^\s]+/gi;

export default function TweetCharacterCounter() {
  const [text, setText] = useState("");
  const [premium, setPremium] = useState(false);

  const limit = premium ? PREMIUM_LIMIT : STANDARD_LIMIT;

  const stats = useMemo(() => {
    const value = text || "";

    // Plain JS string length (UTF-16 code units).
    const plainLength = value.length;

    // True character count with correct emoji / surrogate-pair handling.
    const trueChars = Array.from(value).length;

    // X weighting: each http(s) URL counts as a fixed 23 characters
    // regardless of its real length, everything else by true char count.
    const urls = value.match(URL_REGEX) || [];
    const withoutUrls = value.replace(URL_REGEX, "");
    const weighted = Array.from(withoutUrls).length + urls.length * URL_WEIGHT;

    return {
      plainLength,
      trueChars,
      urlCount: urls.length,
      weighted,
    };
  }, [text]);

  const remaining = limit - stats.weighted;
  const over = remaining < 0;
  const pct = limit > 0 ? Math.min(100, (stats.weighted / limit) * 100) : 0;

  const fmt = (n) => n.toLocaleString("en-US");

  const barColor = over
    ? "#dc2626"
    : remaining <= 20
    ? "#d97706"
    : "currentColor";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="tcc-text">
            Your tweet
          </label>
          <textarea
            className="tool-textarea"
            id="tcc-text"
            rows={7}
            placeholder="Write or paste your post here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tcc-premium">
              Character limit
            </label>
            <label
              htmlFor="tcc-premium"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              <input
                id="tcc-premium"
                type="checkbox"
                checked={premium}
                onChange={(e) => setPremium(e.target.checked)}
              />
              X Premium (4,000 characters)
            </label>
            <p className="tool-note" style={{ marginTop: "0.4rem" }}>
              {premium
                ? "Using the 4,000-character X Premium limit."
                : "Using the standard 280-character limit."}
            </p>
          </div>
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
          {fmt(stats.weighted)} / {fmt(limit)} used
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
            -character limit.
          </p>
        )}
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={over ? { color: "#dc2626" } : undefined}
          >
            {fmt(stats.weighted)}
          </div>
          <div className="tool-stat-label">Weighted (X count)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.trueChars)}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.plainLength)}</div>
          <div className="tool-stat-label">Plain length</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.urlCount)}</div>
          <div className="tool-stat-label">
            Link{stats.urlCount === 1 ? "" : "s"} (23 each)
          </div>
        </div>
      </div>

      <p className="tool-note">
        X shortens every http(s) link to 23 characters, so the weighted count
        treats each link as 23 no matter how long the URL really is. Emoji and
        other multi-byte symbols are counted as single characters. The plain
        length is the raw JavaScript string length for reference.
      </p>
      <p className="tool-note">
        Everything runs live in your browser. Nothing you type is ever uploaded
        or stored.
      </p>
    </div>
  );
}
