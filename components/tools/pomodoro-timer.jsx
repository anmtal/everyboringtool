"use client";

import { useState, useEffect, useRef } from "react";

const MODES = {
  work: { label: "Focus", accent: "#ef4444", defaultMin: 25 },
  short: { label: "Short break", accent: "#22c55e", defaultMin: 5 },
  long: { label: "Long break", accent: "#3b82f6", defaultMin: 15 },
};

const SESSIONS_BEFORE_LONG = 4;

function pad(n) {
  return String(n).padStart(2, "0");
}

// Parse a minutes input, falling back to a default and clamping to a sane
// range so we never end up with NaN, zero, or an absurdly long timer.
function toMinutes(str, fallback) {
  const n = parseInt(str, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 180);
}

export default function PomodoroTimer() {
  const [workMin, setWorkMin] = useState("25");
  const [shortMin, setShortMin] = useState("5");
  const [longMin, setLongMin] = useState("15");

  const [mode, setMode] = useState("work");
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.defaultMin * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0); // completed focus sessions

  const deadlineRef = useRef(null); // timestamp (ms) the current phase ends
  const tickRef = useRef(null); // always-fresh tick callback
  const originalTitleRef = useRef("");

  function durationFor(m) {
    if (m === "work") return toMinutes(workMin, MODES.work.defaultMin);
    if (m === "short") return toMinutes(shortMin, MODES.short.defaultMin);
    return toMinutes(longMin, MODES.long.defaultMin);
  }

  // Begin a phase: set its mode, full duration and a fresh deadline. The
  // running flag is left untouched so auto-cycling keeps the clock going.
  function startPhase(m) {
    const secs = durationFor(m) * 60;
    setMode(m);
    setSecondsLeft(secs);
    deadlineRef.current = Date.now() + secs * 1000;
  }

  // Called when a phase reaches zero: advance to the next phase in the cycle.
  function advance() {
    if (mode === "work") {
      const nextCompleted = completed + 1;
      setCompleted(nextCompleted);
      const goLong = nextCompleted % SESSIONS_BEFORE_LONG === 0;
      startPhase(goLong ? "long" : "short");
    } else {
      startPhase("work");
    }
  }

  // The tick recomputes from an absolute deadline so the timer stays accurate
  // even if setInterval fires late (e.g. a backgrounded tab throttles it).
  function tick() {
    if (deadlineRef.current == null) return;
    const remaining = Math.max(
      0,
      Math.round((deadlineRef.current - Date.now()) / 1000)
    );
    if (remaining > 0) {
      setSecondsLeft(remaining);
    } else {
      advance();
    }
  }
  tickRef.current = tick;

  // Single interval, alive only while running. Cleared on pause and unmount.
  useEffect(() => {
    if (!running) return undefined;
    if (deadlineRef.current == null) {
      deadlineRef.current = Date.now() + secondsLeft * 1000;
    }
    const id = setInterval(() => {
      if (tickRef.current) tickRef.current();
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Remember and restore the page title so we can show the countdown in the tab.
  useEffect(() => {
    originalTitleRef.current = document.title;
    return () => {
      document.title = originalTitleRef.current;
    };
  }, []);

  useEffect(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    if (running) {
      document.title = `${pad(mins)}:${pad(secs)} - ${MODES[mode].label}`;
    } else {
      document.title = originalTitleRef.current;
    }
  }, [secondsLeft, running, mode]);

  function handleStartPause() {
    if (running) {
      // Pause: freeze remaining time and drop the deadline.
      setRunning(false);
      deadlineRef.current = null;
    } else {
      // Resume/start from whatever time is on the clock.
      deadlineRef.current = Date.now() + secondsLeft * 1000;
      setRunning(true);
    }
  }

  function handleReset() {
    setRunning(false);
    deadlineRef.current = null;
    setMode("work");
    setSecondsLeft(durationFor("work") * 60);
    setCompleted(0);
  }

  function handleSkip() {
    // Jump straight to the next phase without changing the running state.
    advance();
  }

  // Live-update the clock when the duration for the current mode is edited
  // while the timer is idle, so the display reflects the new setting.
  function updateWork(v) {
    setWorkMin(v);
    if (!running && mode === "work") {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) setSecondsLeft(Math.min(n, 180) * 60);
    }
  }
  function updateShort(v) {
    setShortMin(v);
    if (!running && mode === "short") {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) setSecondsLeft(Math.min(n, 180) * 60);
    }
  }
  function updateLong(v) {
    setLongMin(v);
    if (!running && mode === "long") {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) setSecondsLeft(Math.min(n, 180) * 60);
    }
  }

  const accent = MODES[mode].accent;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalSecs = Math.max(1, durationFor(mode) * 60);
  const progress = Math.min(1, Math.max(0, 1 - secondsLeft / totalSecs));
  const cyclePos = completed % SESSIONS_BEFORE_LONG; // filled dots this round

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pomo-work">
              Focus (minutes)
            </label>
            <input
              className="tool-input"
              id="pomo-work"
              type="number"
              min="1"
              max="180"
              inputMode="numeric"
              value={workMin}
              onChange={(e) => updateWork(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pomo-short">
              Short break (minutes)
            </label>
            <input
              className="tool-input"
              id="pomo-short"
              type="number"
              min="1"
              max="180"
              inputMode="numeric"
              value={shortMin}
              onChange={(e) => updateShort(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pomo-long">
              Long break (minutes)
            </label>
            <input
              className="tool-input"
              id="pomo-long"
              type="number"
              min="1"
              max="180"
              inputMode="numeric"
              value={longMin}
              onChange={(e) => updateLong(e.target.value)}
            />
          </div>
        </div>
        <p className="tool-note">
          Auto-cycles focus into a short break, and takes a long break after
          every {SESSIONS_BEFORE_LONG} focus sessions.
        </p>
      </div>

      <div
        style={{
          marginTop: "1rem",
          padding: "1.75rem 1.25rem",
          borderRadius: "16px",
          border: `1px solid ${accent}`,
          background: `${accent}14`,
          textAlign: "center",
        }}
      >
        <span
          aria-live="polite"
          style={{
            display: "inline-block",
            background: accent,
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
          }}
        >
          {MODES[mode].label}
        </span>

        <div
          role="timer"
          aria-label={`${minutes} minutes ${seconds} seconds remaining`}
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            fontSize: "clamp(3.5rem, 16vw, 6rem)",
            lineHeight: 1.05,
            margin: "0.5rem 0 0.25rem",
            color: "currentColor",
          }}
        >
          {pad(minutes)}:{pad(seconds)}
        </div>

        {/* Progress bar for the current phase */}
        <div
          aria-hidden="true"
          style={{
            height: "6px",
            width: "100%",
            maxWidth: "320px",
            margin: "0.5rem auto 0.9rem",
            borderRadius: "999px",
            background: "rgba(128,128,128,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: accent,
              transition: "width 0.25s linear",
            }}
          />
        </div>

        {/* Session dots: progress toward the next long break */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "center",
          }}
        >
          {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
            <span
              key={i}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background:
                  i < cyclePos ? MODES.work.accent : "rgba(128,128,128,0.3)",
                border: `1px solid ${
                  i < cyclePos ? MODES.work.accent : "rgba(128,128,128,0.4)"
                }`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleStartPause}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button type="button" className="btn" onClick={handleSkip}>
          Skip
        </button>
        <button type="button" className="btn" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {completed}
          </div>
          <div className="tool-stat-label">
            {completed === 1 ? "Focus session done" : "Focus sessions done"}
          </div>
        </div>
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {cyclePos}/{SESSIONS_BEFORE_LONG}
          </div>
          <div className="tool-stat-label">Until long break</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{MODES[mode].label}</div>
          <div className="tool-stat-label">Current mode</div>
        </div>
      </div>

      <p className="tool-note">
        The timer keeps running while this tab is in the background, and the tab
        title shows your remaining time.
      </p>
    </div>
  );
}
