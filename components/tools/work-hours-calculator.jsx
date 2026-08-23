"use client";

import { useMemo, useState } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Parse an "HH:MM" time string into minutes since midnight. Returns null if empty/invalid.
function parseTime(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Format a whole number of minutes as "Xh Ym".
function formatHM(totalMinutes) {
  const total = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function WorkHoursCalculator() {
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("17:30");
  const [breakMins, setBreakMins] = useState("30");
  const [overnight, setOvernight] = useState(false);
  const [rate, setRate] = useState("");

  const result = useMemo(() => {
    const inMin = parseTime(clockIn);
    const outMin = parseTime(clockOut);

    if (inMin === null || outMin === null) {
      return { error: "Enter a valid clock-in and clock-out time." };
    }

    // Span from clock-in to clock-out, adding a day when the shift runs overnight.
    let spanMinutes = outMin - inMin;
    if (overnight) spanMinutes += 24 * 60;

    if (spanMinutes <= 0) {
      return {
        error:
          "Clock-out is not after clock-in. Turn on “Overnight shift” if the clock-out is the next day.",
      };
    }

    const rawBreak = toNumber(breakMins);
    if (rawBreak !== null && rawBreak < 0) {
      return { error: "Break minutes cannot be negative." };
    }
    // Treat empty/blank break as zero.
    const breakDeducted = rawBreak === null ? 0 : Math.round(rawBreak);

    if (breakDeducted >= spanMinutes) {
      return {
        error: `Unpaid break (${formatHM(
          breakDeducted
        )}) is longer than or equal to the shift span (${formatHM(
          spanMinutes
        )}).`,
      };
    }

    const netMinutes = spanMinutes - breakDeducted;
    const decimalHours = netMinutes / 60;

    const rawRate = toNumber(rate);
    const hasRate = rawRate !== null && rawRate >= 0;
    const grossPay = hasRate ? decimalHours * rawRate : null;

    return {
      error: null,
      spanMinutes,
      breakDeducted,
      netMinutes,
      decimalHours,
      hasRate,
      rate: rawRate,
      grossPay,
    };
  }, [clockIn, clockOut, breakMins, overnight, rate]);

  const ok = result && !result.error;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wh-in">
              Clock in
            </label>
            <input
              className="tool-input"
              id="wh-in"
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="wh-out">
              Clock out
            </label>
            <input
              className="tool-input"
              id="wh-out"
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wh-break">
              Unpaid break (minutes)
            </label>
            <input
              className="tool-input"
              id="wh-break"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={breakMins}
              onChange={(e) => setBreakMins(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="wh-rate">
              Hourly rate ($) — optional
            </label>
            <input
              className="tool-input"
              id="wh-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 20.00"
            />
          </div>
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="wh-overnight"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              id="wh-overnight"
              type="checkbox"
              checked={overnight}
              onChange={(e) => setOvernight(e.target.checked)}
              style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
            />
            Overnight shift (clock-out is the next day)
          </label>
        </div>
      </div>

      {result && result.error ? (
        <p className="tool-error">{result.error}</p>
      ) : ok ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Total worked time</p>
            <div className="tool-result-value">
              {formatHM(result.netMinutes)}
              {result.hasRate ? ` · ${usd.format(result.grossPay)}` : ""}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatHM(result.netMinutes)}</div>
              <div className="tool-stat-label">Worked (paid)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.decimalHours.toFixed(2)}
              </div>
              <div className="tool-stat-label">Decimal hours</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatHM(result.spanMinutes)}</div>
              <div className="tool-stat-label">
                Shift span{overnight ? " (overnight)" : ""}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatHM(result.breakDeducted)}
              </div>
              <div className="tool-stat-label">Unpaid break</div>
            </div>
            {result.hasRate ? (
              <>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {usd.format(result.grossPay)}
                  </div>
                  <div className="tool-stat-label">Gross pay</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{usd.format(result.rate)}</div>
                  <div className="tool-stat-label">Hourly rate</div>
                </div>
              </>
            ) : null}
          </div>

          <p className="tool-note">
            Paid time = shift span ({formatHM(result.spanMinutes)}) minus the
            unpaid break ({formatHM(result.breakDeducted)}) ={" "}
            {result.decimalHours.toFixed(2)} hours.
            {result.hasRate
              ? ` Gross pay = ${result.decimalHours.toFixed(
                  2
                )} h × ${usd.format(result.rate)} = ${usd.format(
                  result.grossPay
                )}.`
              : " Add an hourly rate to estimate gross pay."}
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your clock-in and clock-out times to see total worked hours.
        </p>
      )}
    </div>
  );
}
