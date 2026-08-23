"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0); // milliseconds
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]); // array of cumulative ms at each lap

  const rafRef = useRef(null);
  const startRef = useRef(0); // performance.now() reference when (re)started
  const baseRef = useRef(0); // accumulated ms before current run
  const runningRef = useRef(false);

  const tick = useCallback(() => {
    if (!runningRef.current) return;
    const now = performance.now();
    setElapsed(baseRef.current + (now - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const now = performance.now();
    baseRef.current = baseRef.current + (now - startRef.current);
    setElapsed(baseRef.current);
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    baseRef.current = 0;
    startRef.current = 0;
    setElapsed(0);
    setLaps([]);
  }, []);

  const lap = useCallback(() => {
    // Record current cumulative time as a lap marker.
    let current = baseRef.current;
    if (runningRef.current) {
      current = baseRef.current + (performance.now() - startRef.current);
    }
    if (current <= 0) return;
    setLaps((prev) => [...prev, current]);
  }, []);

  // Clean up the animation frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      runningRef.current = false;
    };
  }, []);

  const formatTime = (ms) => {
    const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
    const totalCs = Math.floor(safe / 10); // centiseconds
    const cs = totalCs % 100;
    const totalSeconds = Math.floor(totalCs / 100);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(cs)}`;
  };

  // Fastest / slowest lap splits (only when there are 2+ laps to compare).
  let fastestIdx = -1;
  let slowestIdx = -1;
  if (laps.length > 1) {
    let fastest = Infinity;
    let slowest = -Infinity;
    for (let i = 0; i < laps.length; i++) {
      const split = i === 0 ? laps[0] : laps[i] - laps[i - 1];
      if (split < fastest) {
        fastest = split;
        fastestIdx = i;
      }
      if (split > slowest) {
        slowest = split;
        slowestIdx = i;
      }
    }
  }

  const bestSplit =
    fastestIdx >= 0
      ? fastestIdx === 0
        ? laps[0]
        : laps[fastestIdx] - laps[fastestIdx - 1]
      : 0;
  const worstSplit =
    slowestIdx >= 0
      ? slowestIdx === 0
        ? laps[0]
        : laps[slowestIdx] - laps[slowestIdx - 1]
      : 0;

  return (
    <div className="tool">
      <div
        className="tool-result"
        style={{ textAlign: "center", marginBottom: "1rem" }}
        role="timer"
        aria-live="off"
      >
        <div className="tool-result-label">Elapsed time</div>
        <div
          className="tool-result-value"
          style={{
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum"',
            fontSize: "clamp(2rem, 9vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {formatTime(elapsed)}
        </div>
      </div>

      <div className="tool-actions">
        {!running ? (
          <button type="button" className="btn btn-success" onClick={start}>
            {elapsed > 0 ? "Resume" : "Start"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={stop}>
            Stop
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={lap}
          disabled={elapsed === 0}
        >
          Lap
        </button>
        <button
          type="button"
          className="btn"
          onClick={reset}
          disabled={elapsed === 0 && laps.length === 0}
        >
          Reset
        </button>
      </div>

      {laps.length > 0 && (
        <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
          <div className="tool-stat">
            <div className="tool-stat-num">{laps.length}</div>
            <div className="tool-stat-label">Laps</div>
          </div>
          {laps.length > 1 && (
            <>
              <div className="tool-stat">
                <div
                  className="tool-stat-num"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatTime(bestSplit)}
                </div>
                <div className="tool-stat-label">Fastest lap</div>
              </div>
              <div className="tool-stat">
                <div
                  className="tool-stat-num"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatTime(worstSplit)}
                </div>
                <div className="tool-stat-label">Slowest lap</div>
              </div>
            </>
          )}
        </div>
      )}

      {laps.length > 0 && (
        <div style={{ marginTop: "1rem" }} aria-label="Lap list">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 1fr",
              gap: "0.5rem 1rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.8rem",
              opacity: 0.7,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span>Lap</span>
            <span style={{ textAlign: "right" }}>Split</span>
            <span style={{ textAlign: "right" }}>Total</span>
          </div>
          {laps
            .map((total, i) => {
              const split = i === 0 ? total : total - laps[i - 1];
              return { i, total, split };
            })
            .reverse()
            .map(({ i, total, split }) => {
              const isFast = i === fastestIdx && laps.length > 1;
              const isSlow = i === slowestIdx && laps.length > 1;
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 1fr",
                    gap: "0.5rem 1rem",
                    padding: "0.6rem 0.75rem",
                    borderTop: "1px solid rgba(128,128,128,0.2)",
                    fontVariantNumeric: "tabular-nums",
                    fontFeatureSettings: '"tnum"',
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    #{i + 1}
                    {isFast && (
                      <span
                        style={{
                          marginLeft: "0.4rem",
                          fontSize: "0.7rem",
                          color: "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        fastest
                      </span>
                    )}
                    {isSlow && (
                      <span
                        style={{
                          marginLeft: "0.4rem",
                          fontSize: "0.7rem",
                          color: "#dc2626",
                          fontWeight: 600,
                        }}
                      >
                        slowest
                      </span>
                    )}
                  </span>
                  <span style={{ textAlign: "right" }}>{formatTime(split)}</span>
                  <span style={{ textAlign: "right", opacity: 0.75 }}>
                    {formatTime(total)}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        Time is measured with performance.now() and rendered via
        requestAnimationFrame for smooth, drift-free accuracy. Format is
        HH:MM:SS.cs (centiseconds). Use Lap to record splits without stopping the
        clock.
      </p>
    </div>
  );
}
