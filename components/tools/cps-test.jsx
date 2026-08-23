"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const DURATIONS = [1, 5, 10, 60];

// Fun rating tiers keyed off clicks-per-second. rgba colors keep the badge
// readable in both light and dark themes.
function rateCps(cps) {
  if (cps <= 0) return { label: "No clicks yet", emoji: "🖱️", color: "rgba(127,127,127,0.9)" };
  if (cps < 3) return { label: "Warming up", emoji: "🐢", color: "rgba(59,130,246,1)" };
  if (cps < 5) return { label: "Casual clicker", emoji: "🙂", color: "rgba(16,185,129,1)" };
  if (cps < 7) return { label: "Getting quick", emoji: "⚡", color: "rgba(16,185,129,1)" };
  if (cps < 9) return { label: "Fast fingers", emoji: "🔥", color: "rgba(245,158,11,1)" };
  if (cps < 12) return { label: "Click machine", emoji: "🚀", color: "rgba(245,158,11,1)" };
  if (cps < 16) return { label: "Superhuman speed", emoji: "🦾", color: "rgba(239,68,68,1)" };
  return { label: "Are you a robot?", emoji: "🤖", color: "rgba(239,68,68,1)" };
}

export default function CpsTest() {
  const [duration, setDuration] = useState(5);
  const [status, setStatus] = useState("idle"); // idle | running | finished
  const [clicks, setClicks] = useState(0);
  const [remainingMs, setRemainingMs] = useState(5000);

  const startRef = useRef(null);
  const intervalRef = useRef(null);

  const durationMs = duration * 1000;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clean up any running interval on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  const finish = useCallback(() => {
    clearTimer();
    startRef.current = null;
    setRemainingMs(0);
    setStatus("finished");
  }, [clearTimer]);

  // Register a click on the play area. First click starts the clock; every
  // click after that increments the counter until time runs out.
  const handleClick = useCallback(() => {
    if (status === "finished") return;

    if (status === "idle") {
      const start = Date.now();
      startRef.current = start;
      setClicks(1);
      setRemainingMs(durationMs);
      setStatus("running");

      clearTimer();
      intervalRef.current = setInterval(() => {
        if (startRef.current === null) return;
        const left = durationMs - (Date.now() - startRef.current);
        if (left <= 0) {
          finish();
        } else {
          setRemainingMs(left);
        }
      }, 50);
      return;
    }

    // status === "running"
    setClicks((c) => c + 1);
  }, [status, durationMs, clearTimer, finish]);

  // Let keyboard users play too, without the browser scrolling on Space.
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === " " || e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return; // ignore auto-repeat from a held key
        handleClick();
      }
    },
    [handleClick]
  );

  const handleDurationChange = useCallback((e) => {
    const next = parseInt(e.target.value, 10);
    const safe = DURATIONS.includes(next) ? next : 5;
    clearTimer();
    startRef.current = null;
    setDuration(safe);
    setStatus("idle");
    setClicks(0);
    setRemainingMs(safe * 1000);
  }, [clearTimer]);

  const restart = useCallback(() => {
    clearTimer();
    startRef.current = null;
    setStatus("idle");
    setClicks(0);
    setRemainingMs(durationMs);
  }, [clearTimer, durationMs]);

  const cps = useMemo(() => {
    if (duration <= 0) return 0;
    const value = clicks / duration;
    return Number.isFinite(value) ? value : 0;
  }, [clicks, duration]);

  const rating = useMemo(() => rateCps(cps), [cps]);

  const secondsLeft =
    status === "running"
      ? (remainingMs / 1000).toFixed(1)
      : status === "finished"
      ? "0.0"
      : duration.toFixed(1);

  const progress =
    status === "idle"
      ? 0
      : Math.min(100, Math.max(0, (1 - remainingMs / durationMs) * 100));

  const areaLabel =
    status === "idle"
      ? "Click to start"
      : status === "running"
      ? "Click!"
      : "Time's up";

  const areaSub =
    status === "idle"
      ? "The timer starts on your first click"
      : status === "running"
      ? `${secondsLeft}s left`
      : "See your score below";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cps-duration">
              Test duration
            </label>
            <select
              id="cps-duration"
              className="tool-select"
              value={duration}
              onChange={handleDurationChange}
              disabled={status === "running"}
            >
              <option value={1}>1 second</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
            <p className="tool-note">
              Changing the duration resets the test.
            </p>
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label">Click area</span>
          <button
            type="button"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={`${areaLabel}. ${areaSub}. Clicks: ${clicks}.`}
            style={{
              width: "100%",
              minHeight: "240px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "24px",
              borderRadius: "14px",
              border:
                status === "running"
                  ? "2px solid rgba(59,130,246,0.9)"
                  : "2px dashed rgba(127,127,127,0.45)",
              background:
                status === "running"
                  ? "rgba(59,130,246,0.10)"
                  : status === "finished"
                  ? "rgba(16,185,129,0.10)"
                  : "rgba(127,127,127,0.06)",
              color: "inherit",
              cursor: status === "finished" ? "default" : "pointer",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "manipulation",
              transition: "background 80ms ease, border-color 80ms ease",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 700 }}>
              {areaLabel}
            </span>
            <span
              style={{
                fontSize: "56px",
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {clicks}
            </span>
            <span style={{ fontSize: "14px", opacity: 0.75 }}>{areaSub}</span>

            {/* Countdown progress bar */}
            <span
              aria-hidden="true"
              style={{
                width: "80%",
                maxWidth: "320px",
                height: "6px",
                marginTop: "6px",
                borderRadius: "999px",
                background: "rgba(127,127,127,0.2)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${progress}%`,
                  background:
                    status === "finished"
                      ? "rgba(16,185,129,0.9)"
                      : "rgba(59,130,246,0.9)",
                  transition: "width 60ms linear",
                }}
              />
            </span>
          </button>
          <p className="tool-note">
            Click as fast as you can until the timer hits zero. You can also
            tap Space or Enter when the area is focused.
          </p>
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{clicks}</div>
          <div className="tool-stat-label">Clicks</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{secondsLeft}s</div>
          <div className="tool-stat-label">
            {status === "finished" ? "Time" : "Time left"}
          </div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{cps.toFixed(2)}</div>
          <div className="tool-stat-label">Clicks / second</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{Math.round(cps * 60)}</div>
          <div className="tool-stat-label">Clicks / minute</div>
        </div>
      </div>

      {status === "finished" && (
        <div className="tool-result">
          <p className="tool-result-label">Your result</p>
          <div className="tool-result-value">{cps.toFixed(2)} CPS</div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "17px",
              fontWeight: 700,
              color: rating.color,
            }}
          >
            {rating.emoji} {rating.label}
          </p>
          <p className="tool-note">
            You landed {clicks} click{clicks === 1 ? "" : "s"} in {duration}{" "}
            second{duration === 1 ? "" : "s"} — that's {cps.toFixed(2)} clicks
            per second ({Math.round(cps * 60)} per minute). Press Restart to try
            again.
          </p>
        </div>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={restart}>
          {status === "finished" ? "Try again" : "Restart"}
        </button>
      </div>

      <p className="tool-note">
        CPS is your total clicks divided by the test length. Everything runs in
        your browser — nothing is uploaded or saved.
      </p>
    </div>
  );
}
