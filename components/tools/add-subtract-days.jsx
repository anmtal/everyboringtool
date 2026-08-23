"use client";

import { useState, useMemo } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
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
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(y, m - 1, d);
  // Reject invalid dates like 2023-02-30 that roll over into the next month.
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function toMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year, monthIndex) {
  // monthIndex is 0-based; day 0 of the next month is the last day of this one.
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Add a signed number of months, clamping the day to the last valid day of the
// target month so Jan 31 + 1 month lands on Feb 28/29 rather than rolling over.
function addMonths(date, count) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const totalMonths = year * 12 + month + count;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return new Date(targetYear, targetMonth, clampedDay);
}

function shiftDate(date, amount, unit, direction) {
  const signed = direction === "subtract" ? -amount : amount;
  const base = toMidnight(date);

  if (unit === "days") {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + signed);
  }
  if (unit === "weeks") {
    return new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate() + signed * 7
    );
  }
  if (unit === "months") {
    return addMonths(base, signed);
  }
  if (unit === "years") {
    return addMonths(base, signed * 12);
  }
  return base;
}

function formatLongDate(d) {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatNumber(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

function formatDecimal(n, digits) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

// Years / months / days between two ordered midnights (start <= end).
function ymdBreakdown(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default function AddSubtractDays() {
  const [mode, setMode] = useState("shift");

  // Mode 1: add / subtract from a start date.
  const [startDate, setStartDate] = useState(todayString());
  const [amount, setAmount] = useState("30");
  const [direction, setDirection] = useState("add");
  const [unit, setUnit] = useState("days");

  // Mode 2: difference between two dates.
  const [fromDate, setFromDate] = useState(todayString());
  const [toDate, setToDate] = useState("");

  const shiftResult = useMemo(() => {
    const base = parseDateInput(startDate);
    if (!base) return { status: startDate ? "invalid" : "empty" };

    const trimmed = String(amount).trim();
    if (trimmed === "") return { status: "empty" };

    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { status: "invalid" };
    if (n < 0) return { status: "negative" };

    // Only whole units make sense for calendar math.
    const whole = Math.floor(n);
    const result = shiftDate(base, whole, unit, direction);

    const diffDays = Math.round(
      (toMidnight(result).getTime() - toMidnight(base).getTime()) / MS_PER_DAY
    );

    return {
      status: "ok",
      base,
      result,
      amount: whole,
      diffDays,
    };
  }, [startDate, amount, direction, unit]);

  const diffResult = useMemo(() => {
    const a = parseDateInput(fromDate);
    const b = parseDateInput(toDate);
    if (!a || !b) {
      const anyInvalid =
        (fromDate && !a) || (toDate && !b);
      return { status: anyInvalid ? "invalid" : "empty" };
    }

    let start = toMidnight(a);
    let end = toMidnight(b);
    const reversed = start.getTime() > end.getTime();
    if (reversed) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const totalDays = Math.round(
      (end.getTime() - start.getTime()) / MS_PER_DAY
    );
    const totalWeeks = totalDays / 7;
    const wholeWeeks = Math.floor(totalDays / 7);
    const remainderDays = totalDays - wholeWeeks * 7;
    const { years, months, days } = ymdBreakdown(start, end);

    return {
      status: "ok",
      reversed,
      totalDays,
      totalWeeks,
      wholeWeeks,
      remainderDays,
      years,
      months,
      days,
    };
  }, [fromDate, toDate]);

  const diffBreakdownParts =
    diffResult.status === "ok"
      ? [
          diffResult.years > 0 ? pluralize(diffResult.years, "year") : null,
          diffResult.months > 0 ? pluralize(diffResult.months, "month") : null,
          diffResult.days > 0 ? pluralize(diffResult.days, "day") : null,
        ].filter(Boolean)
      : [];

  return (
    <div className="tool">
      <div
        className="tool-actions"
        role="tablist"
        aria-label="Choose a calculation"
        style={{ marginBottom: "0.5rem" }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "shift"}
          className={mode === "shift" ? "btn btn-primary" : "btn"}
          onClick={() => setMode("shift")}
        >
          Add / subtract from a date
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "diff"}
          className={mode === "diff" ? "btn btn-primary" : "btn"}
          onClick={() => setMode("diff")}
        >
          Days between two dates
        </button>
      </div>

      {mode === "shift" && (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="asd-start">
                Start date
              </label>
              <input
                className="tool-input"
                id="asd-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="asd-direction">
                  Add or subtract
                </label>
                <select
                  className="tool-select"
                  id="asd-direction"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="add">Add (+)</option>
                  <option value="subtract">Subtract (−)</option>
                </select>
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="asd-amount">
                  Amount
                </label>
                <input
                  className="tool-input"
                  id="asd-amount"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="asd-unit">
                  Unit
                </label>
                <select
                  className="tool-select"
                  id="asd-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>

          {shiftResult.status === "invalid" && (
            <p className="tool-error" role="alert">
              Please enter a valid start date and a whole number.
            </p>
          )}
          {shiftResult.status === "negative" && (
            <p className="tool-error" role="alert">
              Enter a positive amount, then use the Subtract option to go back in
              time.
            </p>
          )}

          {shiftResult.status === "ok" && (
            <>
              <div className="tool-result">
                <p className="tool-result-label">
                  {shiftResult.amount === 0
                    ? "Same day (nothing to add or subtract)"
                    : `${direction === "add" ? "Adding" : "Subtracting"} ${pluralize(
                        shiftResult.amount,
                        unit.slice(0, -1)
                      )} gives`}
                </p>
                <div className="tool-result-value">
                  {formatLongDate(shiftResult.result)}
                </div>
              </div>

              <div className="tool-stat-grid">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {WEEKDAYS[shiftResult.result.getDay()]}
                  </div>
                  <div className="tool-stat-label">Day of the week</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatISO(shiftResult.result)}
                  </div>
                  <div className="tool-stat-label">ISO date (YYYY-MM-DD)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatNumber(Math.abs(shiftResult.diffDays))}
                  </div>
                  <div className="tool-stat-label">
                    {shiftResult.diffDays < 0
                      ? "Days earlier"
                      : "Days later"}
                  </div>
                </div>
              </div>

              {(unit === "months" || unit === "years") && (
                <p className="tool-note">
                  When a month is shorter than the start day, the result snaps to
                  that month's last day — so January 31 plus one month is February
                  28 (or 29 in a leap year).
                </p>
              )}
            </>
          )}
        </>
      )}

      {mode === "diff" && (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="asd-from">
                  First date
                </label>
                <input
                  className="tool-input"
                  id="asd-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="asd-to">
                  Second date
                </label>
                <input
                  className="tool-input"
                  id="asd-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {diffResult.status === "invalid" && (
            <p className="tool-error" role="alert">
              Please enter two valid dates.
            </p>
          )}

          {diffResult.status === "ok" && (
            <>
              <div className="tool-result">
                <p className="tool-result-label">
                  {diffResult.reversed
                    ? "Difference (dates were out of order, so we used the absolute span)"
                    : "Days between the two dates"}
                </p>
                <div className="tool-result-value">
                  {formatNumber(diffResult.totalDays)}{" "}
                  {diffResult.totalDays === 1 ? "day" : "days"}
                </div>
              </div>

              <div className="tool-stat-grid">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatDecimal(diffResult.totalWeeks, 2)}
                  </div>
                  <div className="tool-stat-label">Total weeks</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {diffResult.wholeWeeks}
                    <span style={{ fontSize: "0.6em", opacity: 0.75 }}>
                      {" "}
                      wk {diffResult.remainderDays}d
                    </span>
                  </div>
                  <div className="tool-stat-label">Weeks &amp; days</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {diffBreakdownParts.length > 0
                      ? diffBreakdownParts.join(", ")
                      : "0 days"}
                  </div>
                  <div className="tool-stat-label">Years / months / days</div>
                </div>
              </div>

              <p className="tool-note">
                The gap is counted as whole calendar days from midnight to
                midnight, so it does not depend on your time zone.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
