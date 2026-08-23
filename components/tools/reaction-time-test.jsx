"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const ROUNDS = 5;
const MIN_DELAY = 1000;
const MAX_DELAY = 4000;

// Self-contained cards with explicit backgrounds + white text so every phase
// reads clearly in both light and dark mode without depending on theme tokens.
const PHASE_STYLES = {
  idle: { bg: "#334155", fg: "#ffffff" },
  waiting: { bg: "#b91c1c", fg: "#ffffff" },
  ready: { bg: "#16a34a", fg: "#ffffff" },
  tooSoon: { bg: "#b45309", fg: "#ffffff" },
  result: { bg: "#0f766e", fg: "#ffffff" },
};

function average(list) {
  if (!list.length) return 0;
  const sum = list.reduce((a, b) => a + b, 0);
  return Math.round(sum / list.length);
}

export default function ReactionTimeTest() {
  const [phase, setPhase] = useState("idle");
  const [times, setTimes] = useState([]);
  const [lastTime, setLastTime] = useState(null);

  const timeoutRef = useRef(null);
  const readyAtRef = useRef(0);

  const clearPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Clean up any pending timer on unmount.
  useEffect(() => clearPending, [clearPending]);

  const startRound = useCallback(() => {
    clearPending();
    setPhase("waiting");
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      readyAtRef.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      setPhase("ready");
    }, delay);
  }, [clearPending]);

  const handleAction = useCallback(() => {
    if (phase === "idle" || phase === "tooSoon") {
      startRound();
      return;
    }

    if (phase === "waiting") {
      // Clicked before it turned green — void this attempt.
      clearPending();
      setPhase("tooSoon");
      return;
    }

    if (phase === "ready") {
      const nowT =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = nowT - readyAtRef.current;
      const ms = Math.max(0, Math.round(Number.isFinite(elapsed) ? elapsed : 0));
      setLastTime(ms);
      setTimes((prev) => {
        const next = [...prev, ms];
        setPhase(next.length >= ROUNDS ? "result" : "idle");
        return next;
      });
    }
    // phase === "result": ignore taps; the Restart button resets.
  }, [phase, startRound, clearPending]);

  const handleKeyDown = useCallback(
    (e) => {
      if (phase === "result") return;
      if (e.key === " " || e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleAction();
      }
    },
    [phase, handleAction]
  );

  const restart = useCallback(() => {
    clearPending();
    readyAtRef.current = 0;
    setTimes([]);
    setLastTime(null);
    setPhase("idle");
  }, [clearPending]);

  const roundNumber = Math.min(times.length + 1, ROUNDS);
  const avg = useMemo(() => average(times), [times]);
  const best = useMemo(
    () => (times.length ? Math.min(...times) : 0),
    [times]
  );

  const { title, sub } = useMemo(() => {
    switch (phase) {
      case "waiting":
        return { title: "Wait for green…", sub: "Don't click yet" };
      case "ready":
        return { title: "Click!", sub: "" };
      case "tooSoon":
        return {
          title: "Too soon — try again",
          sub: "You clicked before it turned green. Click to retry this round.",
        };
      case "result":
        return {
          title: `Average: ${avg} ms`,
          sub: "All 5 rounds complete. Press Restart to go again.",
        };
      case "idle":
      default:
        if (times.length === 0) {
          return {
            title: "Click to start",
            sub: "When the box turns green, click as fast as you can",
          };
        }
        return {
          title: `Click for round ${roundNumber} of ${ROUNDS}`,
          sub: lastTime !== null ? `Last round: ${lastTime} ms` : "",
        };
    }
  }, [phase, times.length, roundNumber, lastTime, avg]);

  const colors = PHASE_STYLES[phase] || PHASE_STYLES.idle;
  const isResult = phase === "result";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <span className="tool-label">
            Reaction test — round {Math.min(times.length + (isResult ? 0 : 1), ROUNDS)} of {ROUNDS}
          </span>
          <div
            role="button"
            tabIndex={isResult ? -1 : 0}
            aria-label={title}
            aria-live="polite"
            onClick={handleAction}
            onKeyDown={handleKeyDown}
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor: isResult ? "default" : "pointer",
              minHeight: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "10px",
              padding: "28px 20px",
              borderRadius: "12px",
              background: colors.bg,
              color: colors.fg,
              border: "1px solid rgba(255, 255, 255, 0.18)",
              transition: "background 90ms ease",
              outline: "none",
            }}
          >
            <div
              style={{
                fontSize: "30px",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            {sub ? (
              <div style={{ fontSize: "15px", opacity: 0.9, maxWidth: "36ch" }}>
                {sub}
              </div>
            ) : null}
            {phase === "idle" && times.length === 0 ? (
              <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "6px" }}>
                Tip: you can also use the Space or Enter key
              </div>
            ) : null}
          </div>
          <p className="tool-note">
            After you click start, wait for the box to turn green — the delay is
            random between 1 and 4 seconds. Clicking early doesn't count.
          </p>
        </div>
      </div>

      {times.length > 0 && (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{lastTime !== null ? lastTime : "—"}</div>
            <div className="tool-stat-label">Last (ms)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{best}</div>
            <div className="tool-stat-label">Best (ms)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{avg}</div>
            <div className="tool-stat-label">Average (ms)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {times.length}/{ROUNDS}
            </div>
            <div className="tool-stat-label">Rounds done</div>
          </div>
        </div>
      )}

      {times.length > 0 && (
        <div className="tool-result">
          <p className="tool-result-label">
            {isResult ? "Final results" : "Rounds so far"}
          </p>
          <div className="tool-result-value">
            {isResult ? `${avg} ms average` : `${times.length} of ${ROUNDS} done`}
          </div>
          <div className="tool-output" style={{ marginTop: "10px" }}>
            {times.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 0",
                }}
              >
                <span>Round {i + 1}</span>
                <span>{t} ms</span>
              </div>
            ))}
            {isResult && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0 2px",
                  marginTop: "6px",
                  borderTop: "1px solid rgba(127, 127, 127, 0.3)",
                  fontWeight: 700,
                }}
              >
                <span>Average</span>
                <span>{avg} ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={restart}>
          Restart
        </button>
      </div>

      <p className="tool-note">
        Reaction time is measured from the moment the box turns green until your
        click, using your browser's high-resolution timer. Everything runs
        locally — no times are uploaded or stored.
      </p>
    </div>
  );
}
