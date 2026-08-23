"use client";

import { useState, useMemo } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
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
    // Days in the month just before the end month.
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

export default function DateDifference() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState(todayString());
  const [includeEndDay, setIncludeEndDay] = useState(false);

  const result = useMemo(() => {
    const startDate = parseDateInput(start);
    const endDate = parseDateInput(end);
    if (!startDate || !endDate) return null;

    // Order them so the difference is always non-negative.
    let a = toMidnight(startDate);
    let b = toMidnight(endDate);
    const reversed = a.getTime() > b.getTime();
    if (reversed) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    const sameDay = a.getTime() === b.getTime();

    // Effective end used for counting. Counting the end day is the same as
    // measuring to the following midnight, so shift the later date by one day.
    const effectiveEnd = includeEndDay ? addDays(b, 1) : b;

    const totalDays = Math.round(
      (effectiveEnd.getTime() - a.getTime()) / MS_PER_DAY
    );
    const totalWeeks = totalDays / 7;
    const wholeWeeks = Math.floor(totalDays / 7);
    const remainderDays = totalDays - wholeWeeks * 7;

    const { years, months, days } = ymdBreakdown(a, effectiveEnd);

    return {
      reversed,
      sameDay,
      totalDays,
      totalWeeks,
      wholeWeeks,
      remainderDays,
      years,
      months,
      days,
    };
  }, [start, end, includeEndDay]);

  const invalid =
    (start && !parseDateInput(start)) || (end && !parseDateInput(end));

  const breakdownParts = result
    ? [
        result.years > 0 ? pluralize(result.years, "year") : null,
        result.months > 0 ? pluralize(result.months, "month") : null,
        result.days > 0 ? pluralize(result.days, "day") : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dd-start">
              Start date
            </label>
            <input
              className="tool-input"
              id="dd-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dd-end">
              End date
            </label>
            <input
              className="tool-input"
              id="dd-end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="dd-include">
            <input
              id="dd-include"
              type="checkbox"
              checked={includeEndDay}
              onChange={(e) => setIncludeEndDay(e.target.checked)}
              style={{ marginRight: "0.5rem", verticalAlign: "middle" }}
            />
            Count the end day too (inclusive)
          </label>
          <p className="tool-note">
            {includeEndDay
              ? "Both the start and end dates are counted, so a Monday-to-Friday span is 5 days."
              : "The end day is not counted, so a Monday-to-Friday span is 4 days. Tick the box to include it."}
          </p>
        </div>
      </div>

      {invalid && (
        <p className="tool-error" role="alert">
          Please enter a valid start and end date.
        </p>
      )}

      {result && !invalid && (
        <>
          <div className="tool-result">
            <p className="tool-result-label">
              {result.reversed
                ? "Difference (dates were out of order, so we used the absolute span)"
                : "Difference between the two dates"}
            </p>
            <div className="tool-result-value">
              {breakdownParts.length > 0 ? breakdownParts.join(", ") : "0 days"}
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.totalDays)}</div>
              <div className="tool-stat-label">
                Total {result.totalDays === 1 ? "day" : "days"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatDecimal(result.totalWeeks, 2)}</div>
              <div className="tool-stat-label">Total weeks</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.wholeWeeks}
                <span style={{ fontSize: "0.6em", opacity: 0.75 }}>
                  {" "}
                  wk {result.remainderDays}d
                </span>
              </div>
              <div className="tool-stat-label">Weeks &amp; days</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.years)}</div>
              <div className="tool-stat-label">
                {result.years === 1 ? "Year" : "Years"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.months)}</div>
              <div className="tool-stat-label">
                Extra {result.months === 1 ? "month" : "months"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.days)}</div>
              <div className="tool-stat-label">
                Extra {result.days === 1 ? "day" : "days"}
              </div>
            </div>
          </div>

          <p className="tool-note">
            {result.sameDay && !includeEndDay
              ? "The start and end dates are the same, so the difference is 0 days."
              : `The years / months / days figures add up to the same span as the ${formatNumber(
                  result.totalDays
                )} total days shown above.`}
          </p>
        </>
      )}
    </div>
  );
}
