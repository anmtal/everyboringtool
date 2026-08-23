"use client";

import { useMemo, useState } from "react";

// Parse an "HH:MM" 24-hour time string into minutes since midnight.
// Returns null when the value is missing or not a valid time.
function parseTimeToMinutes(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Parse a text field into a whole, non-negative number of minutes,
// or null when the value is missing or invalid.
function parseNonNegativeInt(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

// Format minutes-since-midnight into a 12-hour clock string like "9:00 AM".
function formatMinutes(total) {
  const dayMinutes = ((total % 1440) + 1440) % 1440;
  let hours = Math.floor(dayMinutes / 60);
  const minutes = dayMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = String(minutes).padStart(2, "0");
  return `${hours}:${mm} ${period}`;
}

// Two intervals [aStart, aEnd) and [bStart, bEnd) overlap when each starts
// before the other ends.
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Build the list of appointment slots. Each slot is `slotLength` minutes long;
// after each slot a `buffer` gap is skipped before the next one may begin.
// Slots that would run into the lunch window (when enabled) are skipped, and
// scheduling resumes from the end of that window.
function buildSlots(dayStart, dayEnd, slotLength, buffer, lunch) {
  const slots = [];
  let cursor = dayStart;
  // Hard cap keeps a pathological config from looping forever.
  let guard = 0;
  const MAX_SLOTS = 5000;

  while (cursor + slotLength <= dayEnd && guard < MAX_SLOTS) {
    guard += 1;
    const slotEnd = cursor + slotLength;

    if (lunch && overlaps(cursor, slotEnd, lunch.start, lunch.end)) {
      // This slot collides with lunch. Jump the cursor to the end of the
      // break and try again from there.
      cursor = lunch.end;
      continue;
    }

    slots.push({ start: cursor, end: slotEnd });
    cursor = slotEnd + buffer;
  }

  return slots;
}

export default function AppointmentSlotGenerator() {
  const [startText, setStartText] = useState("09:00");
  const [endText, setEndText] = useState("17:00");
  const [slotText, setSlotText] = useState("30");
  const [bufferText, setBufferText] = useState("0");
  const [lunchEnabled, setLunchEnabled] = useState(false);
  const [lunchStartText, setLunchStartText] = useState("12:00");
  const [lunchEndText, setLunchEndText] = useState("13:00");
  const [copied, setCopied] = useState(false);

  const dayStart = useMemo(() => parseTimeToMinutes(startText), [startText]);
  const dayEnd = useMemo(() => parseTimeToMinutes(endText), [endText]);
  const slotLength = useMemo(() => parseNonNegativeInt(slotText), [slotText]);
  const buffer = useMemo(() => parseNonNegativeInt(bufferText), [bufferText]);
  const lunchStart = useMemo(
    () => parseTimeToMinutes(lunchStartText),
    [lunchStartText]
  );
  const lunchEnd = useMemo(
    () => parseTimeToMinutes(lunchEndText),
    [lunchEndText]
  );

  // Validate inputs and produce a single, user-facing error message.
  const error = useMemo(() => {
    if (dayStart === null) return "Enter a valid start time (for example 09:00).";
    if (dayEnd === null) return "Enter a valid end time (for example 17:00).";
    if (dayEnd <= dayStart)
      return "The end time must be later than the start time.";
    if (slotLength === null)
      return "Enter how long each appointment lasts, in minutes.";
    if (slotLength < 1) return "Appointment length must be at least 1 minute.";
    if (buffer === null)
      return "Enter a buffer between slots (use 0 for none).";
    if (slotLength > dayEnd - dayStart)
      return "Each appointment is longer than the whole day. Shorten the length or widen the hours.";

    if (lunchEnabled) {
      if (lunchStart === null)
        return "Enter a valid lunch start time (for example 12:00).";
      if (lunchEnd === null)
        return "Enter a valid lunch end time (for example 13:00).";
      if (lunchEnd <= lunchStart)
        return "The lunch end time must be later than the lunch start time.";
    }
    return null;
  }, [
    dayStart,
    dayEnd,
    slotLength,
    buffer,
    lunchEnabled,
    lunchStart,
    lunchEnd,
  ]);

  const lunch = useMemo(() => {
    if (!lunchEnabled || lunchStart === null || lunchEnd === null) return null;
    if (lunchEnd <= lunchStart) return null;
    return { start: lunchStart, end: lunchEnd };
  }, [lunchEnabled, lunchStart, lunchEnd]);

  const slots = useMemo(() => {
    if (error) return [];
    return buildSlots(dayStart, dayEnd, slotLength, buffer, lunch);
  }, [error, dayStart, dayEnd, slotLength, buffer, lunch]);

  const lines = useMemo(
    () =>
      slots.map(
        (s) => `${formatMinutes(s.start)} – ${formatMinutes(s.end)}`
      ),
    [slots]
  );

  const joined = useMemo(() => lines.join("\n"), [lines]);

  // Total booked minutes across all generated slots.
  const bookedMinutes = useMemo(
    () => slots.length * (slotLength || 0),
    [slots.length, slotLength]
  );

  async function handleCopy() {
    if (lines.length === 0) return;
    try {
      await navigator.clipboard.writeText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (lines.length === 0) return;
    const blob = new Blob([joined + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appointment-slots.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="asg-start">
              Day start
            </label>
            <input
              id="asg-start"
              className="tool-input"
              type="time"
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="asg-end">
              Day end
            </label>
            <input
              id="asg-end"
              className="tool-input"
              type="time"
              value={endText}
              onChange={(e) => setEndText(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="asg-slot">
              Appointment length (minutes)
            </label>
            <input
              id="asg-slot"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={slotText}
              onChange={(e) => setSlotText(e.target.value)}
              placeholder="30"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="asg-buffer">
              Buffer between slots (minutes)
            </label>
            <input
              id="asg-buffer"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={bufferText}
              onChange={(e) => setBufferText(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="asg-lunch"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="asg-lunch"
              type="checkbox"
              checked={lunchEnabled}
              onChange={(e) => setLunchEnabled(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Exclude a lunch break
          </label>
        </div>

        {lunchEnabled ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="asg-lunch-start">
                Lunch start
              </label>
              <input
                id="asg-lunch-start"
                className="tool-input"
                type="time"
                value={lunchStartText}
                onChange={(e) => setLunchStartText(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="asg-lunch-end">
                Lunch end
              </label>
              <input
                id="asg-lunch-end"
                className="tool-input"
                type="time"
                value={lunchEndText}
                onChange={(e) => setLunchEndText(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="tool-actions">
        <button
          className={copied ? "btn btn-success" : "btn btn-primary"}
          type="button"
          onClick={handleCopy}
          disabled={lines.length === 0}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={handleDownload}
          disabled={lines.length === 0}
        >
          Download .txt
        </button>
      </div>

      {error ? (
        <div className="tool-error">{error}</div>
      ) : slots.length > 0 ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{slots.length}</div>
              <div className="tool-stat-label">
                {slots.length === 1 ? "Slot" : "Slots"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{slotLength}m</div>
              <div className="tool-stat-label">Each</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {Math.floor(bookedMinutes / 60)}h {bookedMinutes % 60}m
              </div>
              <div className="tool-stat-label">Booked time</div>
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              {slots.length === 1
                ? "Your appointment slot"
                : `Your ${slots.length} appointment slots`}
            </div>
            <div className="tool-output" style={{ marginTop: "0.5rem" }}>
              {lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="tool-note">
          No slots fit inside these hours. Try a shorter appointment length, a
          smaller buffer, or a wider time range.
        </div>
      )}

      <p className="tool-note">
        Slots start at your opening time and repeat every appointment length
        plus buffer, stopping before the last one would run past closing. Any
        slot that would overlap the lunch window is skipped. Everything runs
        locally in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
