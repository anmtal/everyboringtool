"use client";

import { useState, useMemo } from "react";

const DAY_NAMES = [
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

const MS_PER_DAY = 86400000;

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
  // Reject rollovers like 2023-02-30 that spill into the next month.
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

// ISO-8601 week number and week-owning year for a local date.
// Weeks start Monday; week 1 is the week containing the first Thursday
// (equivalently the week that contains January 4th).
function isoWeekData(date) {
  // Work in UTC on the date's calendar Y/M/D to sidestep DST arithmetic.
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // ISO weekday: Monday = 1 ... Sunday = 7.
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  // Shift to the Thursday of the current week — the Thursday decides the year.
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d - yearStart) / MS_PER_DAY + 1) / 7);
  return { week, isoYear };
}

// Day of the year, 1 for January 1st.
function dayOfYear(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((current - start) / MS_PER_DAY);
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// Monday of the calendar week (Monday-based) that contains this date.
function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const shift = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + shift);
  return d;
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

// Number of ISO weeks (52 or 53) in a given ISO week-year.
function weeksInISOYear(year) {
  const p = (y) =>
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400)) %
    7;
  return p(year) === 4 || p(year - 1) === 3 ? 53 : 52;
}

// The Monday that starts the given ISO week of the given ISO year.
function isoWeekToMonday(isoYear, week) {
  // Week 1 always contains January 4th.
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const week1Monday = new Date(
    jan4.getFullYear(),
    jan4.getMonth(),
    jan4.getDate() - (jan4Day - 1)
  );
  return new Date(
    week1Monday.getFullYear(),
    week1Monday.getMonth(),
    week1Monday.getDate() + (week - 1) * 7
  );
}

function formatLongDate(date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${
    MONTH_NAMES[date.getMonth()]
  } ${date.getFullYear()}`;
}

function formatShortDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function WeekNumber() {
  const [mode, setMode] = useState("date"); // "date" or "week"
  const [dateValue, setDateValue] = useState(todayString());
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));
  const [weekValue, setWeekValue] = useState("1");
  const [copied, setCopied] = useState(false);

  const forward = useMemo(() => {
    const date = parseDateInput(dateValue);
    if (!date) return null;
    const { week, isoYear } = isoWeekData(date);
    const monday = mondayOf(date);
    const sunday = addDays(monday, 6);
    return {
      date,
      week,
      isoYear,
      dayOfYear: dayOfYear(date),
      totalDays: isLeapYear(date.getFullYear()) ? 366 : 365,
      weekday: DAY_NAMES[date.getDay()],
      monday,
      sunday,
      weeksInYear: weeksInISOYear(isoYear),
    };
  }, [dateValue]);

  const reverse = useMemo(() => {
    const year = Number(yearValue);
    const week = Number(weekValue);
    if (
      !Number.isInteger(year) ||
      year < 1 ||
      year > 9999 ||
      !Number.isInteger(week)
    ) {
      return { error: "empty" };
    }
    const maxWeek = weeksInISOYear(year);
    if (week < 1 || week > maxWeek) {
      return { error: "range", maxWeek, year };
    }
    const monday = isoWeekToMonday(year, week);
    const sunday = addDays(monday, 6);
    return { year, week, monday, sunday, maxWeek };
  }, [yearValue, weekValue]);

  function handleCopy() {
    if (!forward) return;
    const text = `ISO week ${forward.week}, ${forward.isoYear} (${formatShortDate(
      forward.monday
    )} to ${formatShortDate(forward.sunday)})`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
        () => {}
      );
    }
  }

  const dateInvalid = dateValue && !parseDateInput(dateValue);

  return (
    <div className="tool">
      <div className="tool-actions" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={mode === "date" ? "btn btn-primary" : "btn"}
          onClick={() => setMode("date")}
        >
          Date → week number
        </button>
        <button
          type="button"
          className={mode === "week" ? "btn btn-primary" : "btn"}
          onClick={() => setMode("week")}
        >
          Week number → dates
        </button>
      </div>

      {mode === "date" && (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="wn-date">
                Pick a date
              </label>
              <input
                className="tool-input"
                id="wn-date"
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
              <p className="tool-note">
                Defaults to today. Weeks follow the ISO-8601 standard: they start
                on Monday and week 1 is the week containing the year&apos;s first
                Thursday.
              </p>
            </div>
          </div>

          {dateInvalid && (
            <p className="tool-error" role="alert">
              Please enter a valid date.
            </p>
          )}

          {forward && !dateInvalid && (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">
                  {/* formatLongDate already begins with the weekday — printing
                      forward.weekday too gave "Friday, Friday, 1 January 2021". */}
                  {formatLongDate(forward.date)} falls in
                </p>
                <div className="tool-result-value">
                  ISO week {forward.week} of {forward.isoYear}
                </div>
              </div>

              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">{forward.week}</div>
                  <div className="tool-stat-label">ISO week number</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{forward.isoYear}</div>
                  <div className="tool-stat-label">ISO week-year</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {forward.dayOfYear}
                    <span style={{ fontSize: "0.6em", opacity: 0.75 }}>
                      {" "}
                      / {forward.totalDays}
                    </span>
                  </div>
                  <div className="tool-stat-label">Day of year</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{forward.weeksInYear}</div>
                  <div className="tool-stat-label">
                    Weeks in {forward.isoYear}
                  </div>
                </div>
              </div>

              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">
                  That week runs Monday to Sunday
                </p>
                <div className="tool-result-value">
                  {formatLongDate(forward.monday)}
                </div>
                <div className="tool-result-value">
                  {formatLongDate(forward.sunday)}
                </div>
              </div>

              <div className="tool-actions">
                <button type="button" className="btn" onClick={handleCopy}>
                  {copied ? "Copied!" : "Copy summary"}
                </button>
              </div>

              {forward.isoYear !== forward.date.getFullYear() && (
                <p className="tool-note">
                  Note: this date sits near a year boundary, so its ISO week-year
                  ({forward.isoYear}) differs from its calendar year (
                  {forward.date.getFullYear()}). That is expected under ISO-8601 —
                  the first few days of January can belong to the last week of the
                  previous year, and the last days of December can belong to week 1
                  of the next year.
                </p>
              )}
            </>
          )}
        </>
      )}

      {mode === "week" && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="wn-year">
                  Year
                </label>
                <input
                  className="tool-input"
                  id="wn-year"
                  type="number"
                  min="1"
                  max="9999"
                  step="1"
                  value={yearValue}
                  onChange={(e) => setYearValue(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="wn-week">
                  Week number
                </label>
                <input
                  className="tool-input"
                  id="wn-week"
                  type="number"
                  min="1"
                  max="53"
                  step="1"
                  value={weekValue}
                  onChange={(e) => setWeekValue(e.target.value)}
                />
              </div>
            </div>
            <p className="tool-note">
              Enter an ISO week-year and week number (1–52, or 1–53 in long years)
              to see the Monday–Sunday dates that week covers.
            </p>
          </div>

          {reverse.error === "range" && (
            <p className="tool-error" role="alert">
              {reverse.year} has {reverse.maxWeek} ISO weeks, so the week number
              must be between 1 and {reverse.maxWeek}.
            </p>
          )}

          {!reverse.error && (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">
                  ISO week {reverse.week} of {reverse.year} runs
                </p>
                <div className="tool-result-value">
                  {formatLongDate(reverse.monday)}
                </div>
                <div className="tool-result-value">
                  {formatLongDate(reverse.sunday)}
                </div>
              </div>

              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatShortDate(reverse.monday)}
                  </div>
                  <div className="tool-stat-label">First day (Monday)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatShortDate(reverse.sunday)}
                  </div>
                  <div className="tool-stat-label">Last day (Sunday)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{reverse.maxWeek}</div>
                  <div className="tool-stat-label">
                    Weeks in {reverse.year}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
