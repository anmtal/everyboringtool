"use client";

import { useMemo, useState } from "react";

const SPEED_OPTIONS = [
  { value: "150", label: "Slow (150 wpm)" },
  { value: "200", label: "Average (200 wpm)" },
  { value: "250", label: "Fast (250 wpm)" },
];

const SPEAKING_WPM = 130;

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "0 sec";

  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  if (minutes <= 0) return `${seconds} sec`;
  if (seconds <= 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

export default function ReadingTimeCalculator() {
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState("200");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? (trimmed.match(/\S+/g) || []).length : 0;
    const characters = text.length;

    const wpm = Number(speed) || 200;
    const readingSeconds = words > 0 ? (words / wpm) * 60 : 0;
    const speakingSeconds = words > 0 ? (words / SPEAKING_WPM) * 60 : 0;

    return {
      words,
      characters,
      readingTime: formatDuration(readingSeconds),
      speakingTime: formatDuration(speakingSeconds),
    };
  }, [text, speed]);

  const fmt = (n) => n.toLocaleString("en-US");

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rtc-text">
            Your text
          </label>
          <textarea
            id="rtc-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here…"
            rows={10}
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rtc-speed">
            Reading speed
          </label>
          <select
            id="rtc-speed"
            className="tool-select"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
          >
            {SPEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Estimated reading time</div>
        <div className="tool-result-value">{stats.readingTime}</div>
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
          <div className="tool-stat-num">{stats.readingTime}</div>
          <div className="tool-stat-label">Reading time</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{stats.speakingTime}</div>
          <div className="tool-stat-label">Speaking time</div>
        </div>
      </div>

      <p className="tool-note">
        Reading time uses your selected speed; speaking time is estimated at
        about {SPEAKING_WPM} words per minute. Everything is counted live in your
        browser as you type.
      </p>
    </div>
  );
}
