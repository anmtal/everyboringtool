"use client";

import { useState, useMemo } from "react";

function toLocalMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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
  // Reject invalid dates like 2023-02-30 that roll over.
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatNumber(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function AgeCalculator() {
  const maxDate = todayString();
  const [birth, setBirth] = useState("");

  const result = useMemo(() => {
    const birthDate = parseDateInput(birth);
    if (!birthDate) return null;

    const today = toLocalMidnight(new Date());
    const start = toLocalMidnight(birthDate);

    if (start.getTime() > today.getTime()) {
      return { error: "Birth date can't be in the future." };
    }

    // Years, months, days breakdown.
    let years = today.getFullYear() - start.getFullYear();
    let months = today.getMonth() - start.getMonth();
    let days = today.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      // Days in the month before the current one.
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    // Total days lived.
    const totalDays = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY);

    // Days until next birthday.
    let nextBirthday = new Date(
      today.getFullYear(),
      start.getMonth(),
      start.getDate()
    );
    // Handle Feb 29 birthdays landing on a non-leap year (rolls to Mar 1).
    if (nextBirthday.getMonth() !== start.getMonth()) {
      nextBirthday = new Date(today.getFullYear(), start.getMonth() + 1, 1);
    }
    if (nextBirthday.getTime() < today.getTime()) {
      nextBirthday = new Date(
        today.getFullYear() + 1,
        start.getMonth(),
        start.getDate()
      );
      if (nextBirthday.getMonth() !== start.getMonth()) {
        nextBirthday = new Date(today.getFullYear() + 1, start.getMonth() + 1, 1);
      }
    }
    const daysUntilBirthday = Math.round(
      (toLocalMidnight(nextBirthday).getTime() - today.getTime()) / MS_PER_DAY
    );

    return {
      years,
      months,
      days,
      totalDays,
      daysUntilBirthday,
      isBirthdayToday: daysUntilBirthday === 0,
    };
  }, [birth]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="birth-date">
            Date of birth
          </label>
          <input
            className="tool-input"
            id="birth-date"
            type="date"
            max={maxDate}
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
          <p className="tool-note">
            Pick your birth date to see your exact age and countdown to your next
            birthday.
          </p>
        </div>
      </div>

      {result && result.error && (
        <p className="tool-error" role="alert">
          {result.error}
        </p>
      )}

      {result && !result.error && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {result.isBirthdayToday ? "Happy birthday! Your age is" : "Your age is"}
            </p>
            <div className="tool-result-value">
              {result.years} {result.years === 1 ? "year" : "years"},{" "}
              {result.months} {result.months === 1 ? "month" : "months"},{" "}
              {result.days} {result.days === 1 ? "day" : "days"}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.years)}</div>
              <div className="tool-stat-label">Years</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.months)}</div>
              <div className="tool-stat-label">Months</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.days)}</div>
              <div className="tool-stat-label">Days</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(result.totalDays)}</div>
              <div className="tool-stat-label">Total days lived</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.isBirthdayToday ? "0" : formatNumber(result.daysUntilBirthday)}
              </div>
              <div className="tool-stat-label">
                {result.isBirthdayToday
                  ? "Birthday is today"
                  : "Days until next birthday"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
