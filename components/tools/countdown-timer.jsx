"use client";

import { useState, useEffect, useMemo } from "react";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatFullDate(date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch (e) {
    return date.toString();
  }
}

export default function CountdownTimer() {
  const [target, setTarget] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Tick once per second; clean up on unmount.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const result = useMemo(() => {
    if (!target) return null;

    const targetMs = new Date(target).getTime();
    if (!Number.isFinite(targetMs)) {
      return { error: "That doesn't look like a valid date and time." };
    }

    const diff = targetMs - now;

    if (diff <= 0) {
      return { done: true, targetDate: new Date(targetMs) };
    }

    const days = Math.floor(diff / MS_PER_DAY);
    const hours = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR);
    const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE);
    const seconds = Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND);

    return {
      done: false,
      days,
      hours,
      minutes,
      seconds,
      targetDate: new Date(targetMs),
    };
  }, [target, now]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="countdown-target">
            Count down to
          </label>
          <input
            className="tool-input"
            id="countdown-target"
            type="datetime-local"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <p className="tool-note">
            Pick a future date and time. The countdown updates live, every
            second.
          </p>
        </div>
      </div>

      {!target && (
        <p className="tool-note">
          Enter a target date and time above to start the countdown.
        </p>
      )}

      {result && result.error && (
        <p className="tool-error" role="alert">
          {result.error}
        </p>
      )}

      {result && !result.error && result.done && (
        <div className="tool-result">
          <p className="tool-result-label">Countdown finished</p>
          <div className="tool-result-value">Time's up!</div>
          <p className="tool-note">
            Target reached: {formatFullDate(result.targetDate)}
          </p>
        </div>
      )}

      {result && !result.error && !result.done && (
        <>
          <div className="tool-result">
            <p className="tool-result-label">Time remaining</p>
            <div
              className="tool-result-value"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {result.days > 0 ? `${result.days}d ` : ""}
              {pad(result.hours)}:{pad(result.minutes)}:{pad(result.seconds)}
            </div>
            <p className="tool-note">
              Counting down to {formatFullDate(result.targetDate)}
            </p>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div
                className="tool-stat-num"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pad(result.days)}
              </div>
              <div className="tool-stat-label">
                {result.days === 1 ? "Day" : "Days"}
              </div>
            </div>
            <div className="tool-stat">
              <div
                className="tool-stat-num"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pad(result.hours)}
              </div>
              <div className="tool-stat-label">
                {result.hours === 1 ? "Hour" : "Hours"}
              </div>
            </div>
            <div className="tool-stat">
              <div
                className="tool-stat-num"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pad(result.minutes)}
              </div>
              <div className="tool-stat-label">
                {result.minutes === 1 ? "Minute" : "Minutes"}
              </div>
            </div>
            <div className="tool-stat">
              <div
                className="tool-stat-num"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pad(result.seconds)}
              </div>
              <div className="tool-stat-label">
                {result.seconds === 1 ? "Second" : "Seconds"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
