"use client";

import { useMemo, useState } from "react";

// Cap the day-by-day scan so an extreme range can never hang the browser.
const MAX_SCAN_DAYS = 400000;

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parse a YYYY-MM-DD string into a LOCAL midnight Date. Building the Date from
// explicit year/month/day parts (rather than new Date(string)) keeps everything
// in the browser's local time zone, so there is no UTC drift.
function parseDateInput(value) {
  if (!value) return null;
  const parts = String(value).split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  const date = new Date(y, m - 1, d);
  // Reject impossible dates like 2023-02-30 that roll into the next month.
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatNumber(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatLongDate(date) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${
    MONTH_NAMES[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

export default function BusinessDaysCalculator() {
  const [mode, setMode] = useState("count"); // "count" | "add"

  // Mode 1: count between two dates.
  const [start, setStart] = useState(todayString());
  const [end, setEnd] = useState("");

  // Mode 2: add business days to a start date.
  const [addStart, setAddStart] = useState(todayString());
  const [addDaysInput, setAddDaysInput] = useState("10");

  // Shared holiday list (YYYY-MM-DD strings).
  const [holidayDraft, setHolidayDraft] = useState("");
  const [holidays, setHolidays] = useState([]);

  const holidaySet = useMemo(() => new Set(holidays), [holidays]);

  function addHoliday() {
    const parsed = parseDateInput(holidayDraft);
    if (!parsed) return;
    const key = toKey(parsed);
    setHolidays((prev) => (prev.includes(key) ? prev : [...prev, key].sort()));
    setHolidayDraft("");
  }

  function removeHoliday(key) {
    setHolidays((prev) => prev.filter((h) => h !== key));
  }

  // ----- Mode 1: count business days between two dates (inclusive) -----
  const countResult = useMemo(() => {
    if (mode !== "count") return null;
    const startDate = parseDateInput(start);
    const endDate = parseDateInput(end);
    if (!startDate || !endDate) return null;

    let a = startDate;
    let b = endDate;
    const reversed = a.getTime() > b.getTime();
    if (reversed) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    const totalDays =
      Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays > MAX_SCAN_DAYS) {
      return { tooLarge: true };
    }

    let weekendDays = 0;
    let businessDays = 0;
    let holidaysOnWeekdays = 0;

    let cursor = a;
    for (let i = 0; i < totalDays; i++) {
      if (isWeekend(cursor)) {
        weekendDays++;
      } else if (holidaySet.has(toKey(cursor))) {
        holidaysOnWeekdays++;
      } else {
        businessDays++;
      }
      cursor = addDays(cursor, 1);
    }

    return {
      reversed,
      totalDays,
      weekendDays,
      businessDays,
      holidaysOnWeekdays,
    };
  }, [mode, start, end, holidaySet]);

  // ----- Mode 2: add N business days to a start date -----
  const addResult = useMemo(() => {
    if (mode !== "add") return null;
    const startDate = parseDateInput(addStart);
    if (!startDate) return null;

    const trimmed = addDaysInput.trim();
    if (trimmed === "" || trimmed === "-") return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    if (Math.abs(n) > MAX_SCAN_DAYS) {
      return { tooLarge: true };
    }

    const step = n < 0 ? -1 : 1;
    let remaining = Math.abs(n);
    let cursor = startDate;
    let guard = 0;

    while (remaining > 0 && guard < MAX_SCAN_DAYS * 3) {
      cursor = addDays(cursor, step);
      guard++;
      if (!isWeekend(cursor) && !holidaySet.has(toKey(cursor))) {
        remaining--;
      }
    }

    // Whether the starting day is itself a business day (informational).
    const startIsBusiness =
      !isWeekend(startDate) && !holidaySet.has(toKey(startDate));

    return {
      n,
      startIsBusiness,
      resultDate: cursor,
    };
  }, [mode, addStart, addDaysInput, holidaySet]);

  const countInvalid =
    mode === "count" && ((start && !parseDateInput(start)) || (end && !parseDateInput(end)));
  const addInvalid = mode === "add" && addStart && !parseDateInput(addStart);
  const holidayDraftInvalid = holidayDraft !== "" && !parseDateInput(holidayDraft);

  return (
    <div className="tool">
      <div className="tool-actions" role="tablist" aria-label="Calculator mode">
        <button
          type="button"
          className={mode === "count" ? "btn btn-primary" : "btn"}
          aria-pressed={mode === "count"}
          onClick={() => setMode("count")}
        >
          Count business days
        </button>
        <button
          type="button"
          className={mode === "add" ? "btn btn-primary" : "btn"}
          aria-pressed={mode === "add"}
          onClick={() => setMode("add")}
        >
          Add business days
        </button>
      </div>

      {mode === "count" ? (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="bdc-start">
                Start date
              </label>
              <input
                className="tool-input"
                id="bdc-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bdc-end">
                End date
              </label>
              <input
                className="tool-input"
                id="bdc-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="tool-note">
            Both the start and end dates are included in the count. Weekends
            (Saturday and Sunday) and any holidays you add below are excluded
            from the business-day total.
          </p>
        </div>
      ) : (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="bdc-add-start">
                Start date
              </label>
              <input
                className="tool-input"
                id="bdc-add-start"
                type="date"
                value={addStart}
                onChange={(e) => setAddStart(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bdc-add-days">
                Business days to add
              </label>
              <input
                className="tool-input"
                id="bdc-add-days"
                type="number"
                step="1"
                inputMode="numeric"
                value={addDaysInput}
                onChange={(e) => setAddDaysInput(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <p className="tool-note">
            The start date itself is not counted. Use a negative number to go
            backwards (subtract business days). Weekends and your holidays are
            skipped.
          </p>
        </div>
      )}

      {/* Shared holiday manager */}
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bdc-holiday">
            Add a holiday to exclude (optional)
          </label>
          <div className="tool-row">
            <input
              className="tool-input"
              id="bdc-holiday"
              type="date"
              value={holidayDraft}
              onChange={(e) => setHolidayDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHoliday();
                }
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={addHoliday}
              disabled={!parseDateInput(holidayDraft)}
            >
              Add holiday
            </button>
          </div>
          {holidayDraftInvalid && (
            <p className="tool-error" role="alert">
              Please pick a valid holiday date.
            </p>
          )}
        </div>

        {holidays.length > 0 && (
          <div className="tool-field">
            <span className="tool-label">
              {holidays.length} holiday{holidays.length === 1 ? "" : "s"}{" "}
              excluded
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              {holidays.map((key) => {
                const d = parseDateInput(key);
                return (
                  <span
                    key={key}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "999px",
                      border: "1px solid rgba(128,128,128,0.4)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {d ? formatLongDate(d) : key}
                    <button
                      type="button"
                      onClick={() => removeHoliday(key)}
                      aria-label={`Remove holiday ${key}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "currentColor",
                        cursor: "pointer",
                        fontSize: "1rem",
                        lineHeight: 1,
                        opacity: 0.7,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setHolidays([])}
              style={{ marginTop: "0.5rem" }}
            >
              Clear all holidays
            </button>
          </div>
        )}
      </div>

      {/* ---- Mode 1 results ---- */}
      {mode === "count" && countInvalid && (
        <p className="tool-error" role="alert">
          Please enter a valid start and end date.
        </p>
      )}

      {mode === "count" && countResult && countResult.tooLarge && (
        <p className="tool-error" role="alert">
          That date range is too large to calculate. Please choose dates closer
          together.
        </p>
      )}

      {mode === "count" && countResult && !countResult.tooLarge && !countInvalid && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Business days in this range</p>
            <div className="tool-result-value">
              {formatNumber(countResult.businessDays)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatNumber(countResult.totalDays)}
              </div>
              <div className="tool-stat-label">
                Total {countResult.totalDays === 1 ? "day" : "days"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatNumber(countResult.businessDays)}
              </div>
              <div className="tool-stat-label">Business days</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatNumber(countResult.weekendDays)}
              </div>
              <div className="tool-stat-label">Weekend days</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatNumber(countResult.holidaysOnWeekdays)}
              </div>
              <div className="tool-stat-label">Holidays excluded</div>
            </div>
          </div>

          <p className="tool-note">
            {countResult.reversed
              ? "Your end date was before your start date, so we measured the range between them. "
              : ""}
            {countResult.holidaysOnWeekdays > 0
              ? `${countResult.holidaysOnWeekdays} weekday${
                  countResult.holidaysOnWeekdays === 1 ? "" : "s"
                } fell on a holiday and ${
                  countResult.holidaysOnWeekdays === 1 ? "was" : "were"
                } excluded from the business-day total.`
              : "No holidays landed on a weekday in this range."}
          </p>
        </>
      )}

      {/* ---- Mode 2 results ---- */}
      {mode === "add" && addInvalid && (
        <p className="tool-error" role="alert">
          Please enter a valid start date.
        </p>
      )}

      {mode === "add" && addResult && addResult.tooLarge && (
        <p className="tool-error" role="alert">
          That is too many business days to add. Please use a smaller number.
        </p>
      )}

      {mode === "add" && addResult && !addResult.tooLarge && !addInvalid && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {addResult.n === 0
                ? "Result (0 business days added)"
                : `${Math.abs(addResult.n)} business day${
                    Math.abs(addResult.n) === 1 ? "" : "s"
                  } ${addResult.n < 0 ? "before" : "after"} the start date`}
            </p>
            <div className="tool-result-value">
              {formatLongDate(addResult.resultDate)}
            </div>
          </div>
          <p className="tool-note">
            Result date: {toKey(addResult.resultDate)}.{" "}
            {addResult.startIsBusiness
              ? "The start date is a business day, but it is not counted itself."
              : "The start date falls on a weekend or holiday."}
          </p>
        </>
      )}

      {mode === "add" &&
        !addResult &&
        addStart &&
        parseDateInput(addStart) &&
        addDaysInput.trim() !== "" &&
        addDaysInput.trim() !== "-" && (
          <p className="tool-error" role="alert">
            Please enter a whole number of business days.
          </p>
        )}
    </div>
  );
}
