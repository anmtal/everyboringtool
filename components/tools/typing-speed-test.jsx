"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TYPING_PASSAGES as SAMPLES } from "../../lib/typingPassages";

function pickIndex(exclude) {
  if (SAMPLES.length <= 1) return 0;
  let i = Math.floor(Math.random() * SAMPLES.length);
  while (i === exclude) {
    i = Math.floor(Math.random() * SAMPLES.length);
  }
  return i;
}

export default function TypingSpeedTest() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [now, setNow] = useState(0);
  const textareaRef = useRef(null);

  const sample = SAMPLES[sampleIndex] || "";
  const finished = endTime !== null;

  // Pick a random paragraph once, on the client, to avoid SSR hydration
  // mismatches from Math.random() running during render.
  useEffect(() => {
    setSampleIndex(pickIndex(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick once per second only while the test is running; clean up on unmount,
  // finish, or reset.
  useEffect(() => {
    if (startTime === null || finished) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startTime, finished]);

  const handleChange = useCallback(
    (e) => {
      if (finished) return;

      let value = e.target.value;
      if (value.length > sample.length) {
        value = value.slice(0, sample.length);
      }

      // Start the clock on the very first typed character.
      if (startTime === null && value.length > 0) {
        const t = Date.now();
        setStartTime(t);
        setNow(t);
      }

      setTyped(value);

      // Freeze the timer as soon as the typed length matches the sample.
      if (sample.length > 0 && value.length === sample.length) {
        setEndTime(Date.now());
      }
    },
    [finished, sample.length, startTime]
  );

  const resetState = useCallback(() => {
    setTyped("");
    setStartTime(null);
    setEndTime(null);
    setNow(0);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.focus();
      });
    }
  }, []);

  // New text = a fresh random passage (never the current one). Restart = retry
  // the same passage.
  const newText = useCallback(() => {
    setSampleIndex((prev) => pickIndex(prev));
    resetState();
  }, [resetState]);

  const restartSame = useCallback(() => {
    resetState();
  }, [resetState]);

  const stats = useMemo(() => {
    const typedChars = typed.length;
    let correctChars = 0;
    for (let i = 0; i < typedChars; i++) {
      if (typed[i] === sample[i]) correctChars++;
    }

    const elapsedMs =
      startTime === null ? 0 : (finished ? endTime : now) - startTime;
    const safeMs = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
    const minutes = safeMs / 60000;

    const wpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0;
    const accuracy = typedChars > 0 ? (correctChars / typedChars) * 100 : 0;
    const seconds = safeMs / 1000;

    return { typedChars, correctChars, wpm, accuracy, seconds };
  }, [typed, sample, startTime, endTime, now, finished]);

  // Per-character highlighting. rgba colors keep it readable in light + dark.
  const renderedSample = useMemo(() => {
    const chars = sample.split("");
    return chars.map((char, i) => {
      const style = { borderRadius: "2px", padding: "0 0.5px" };

      if (i < typed.length) {
        const correct = typed[i] === char;
        style.backgroundColor = correct
          ? "rgba(34, 197, 94, 0.22)"
          : "rgba(239, 68, 68, 0.30)";
        style.color = correct ? "inherit" : "rgba(239, 68, 68, 1)";
      } else if (i === typed.length && !finished) {
        style.backgroundColor = "rgba(127, 127, 127, 0.16)";
        style.borderBottom = "2px solid currentColor";
      } else {
        style.opacity = 0.6;
      }

      return (
        <span key={i} style={style}>
          {char}
        </span>
      );
    });
  }, [sample, typed, finished]);

  const focusInput = useCallback(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  const secondsDisplay = finished
    ? stats.seconds.toFixed(1)
    : String(Math.floor(stats.seconds));

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <span className="tool-label">
            Sample text{" "}
            <span style={{ opacity: 0.55, fontWeight: 400, fontSize: "0.85em" }}>
              #{sampleIndex + 1} of {SAMPLES.length}
            </span>
          </span>
          <div
            className="tool-output"
            onClick={focusInput}
            style={{
              fontSize: "16px",
              lineHeight: 1.75,
              padding: "16px 18px",
              background: "var(--surface, rgba(127,127,127,0.06))",
              border: "1px solid var(--border, rgba(127,127,127,0.3))",
              borderRadius: "8px",
              wordBreak: "normal",
              overflowWrap: "break-word",
              cursor: "text",
            }}
          >
            {renderedSample}
          </div>
          <p className="tool-note">
            Click the passage or the box below and start typing. The timer
            starts on your first keystroke.
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="tst-input">
            Type here
          </label>
          <textarea
            id="tst-input"
            ref={textareaRef}
            className="tool-textarea"
            value={typed}
            onChange={handleChange}
            readOnly={finished}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            rows={4}
            placeholder="Start typing the passage above…"
            style={{ minHeight: "110px" }}
          />
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{stats.wpm}</div>
          <div className="tool-stat-label">Words per minute</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{Math.round(stats.accuracy)}%</div>
          <div className="tool-stat-label">Accuracy</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{secondsDisplay}s</div>
          <div className="tool-stat-label">Time</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {stats.typedChars}/{sample.length}
          </div>
          <div className="tool-stat-label">Characters</div>
        </div>
      </div>

      {finished && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Result</p>
          <div className="tool-result-value">{stats.wpm} WPM</div>
          <p className="tool-note">
            You typed {stats.correctChars} correct characters in{" "}
            {stats.seconds.toFixed(1)} seconds at{" "}
            {Math.round(stats.accuracy)}% accuracy. Press New text for a fresh
            passage.
          </p>
        </div>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={newText}>
          ↻ New text
        </button>
        <button type="button" className="btn" onClick={restartSame}>
          Restart
        </button>
      </div>

      <p className="tool-note">
        WPM counts correct characters divided by five, over the elapsed minutes.
        Everything runs in your browser — nothing you type is uploaded or saved.
      </p>
    </div>
  );
}
