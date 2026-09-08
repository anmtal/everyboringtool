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
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

function formatLong(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShort(d) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DueDateCalculator() {
  const [method, setMethod] = useState("lmp");
  const [startDate, setStartDate] = useState(() => {
    // Prefill: an LMP ~8 weeks ago so first load shows a realistic result.
    const eightWeeksAgo = addDays(new Date(), -56);
    const y = eightWeeksAgo.getFullYear();
    const m = String(eightWeeksAgo.getMonth() + 1).padStart(2, "0");
    const d = String(eightWeeksAgo.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [cycle, setCycle] = useState("28");

  const result = useMemo(() => {
    const base = parseDateInput(startDate);
    if (!base) return null;

    const cycleLen = Number(cycle);
    const validCycle =
      Number.isFinite(cycleLen) && cycleLen >= 20 && cycleLen <= 45
        ? cycleLen
        : 28;

    // Determine estimated conception date and due date per method.
    let conception;
    let dueDate;

    if (method === "lmp") {
      // Naegele's rule with cycle-length adjustment.
      // Ovulation ~ (cycle - 14) days after LMP; conception at ovulation.
      conception = addDays(base, validCycle - 14);
      dueDate = addDays(base, 280 + (validCycle - 28));
    } else if (method === "conception") {
      conception = base;
      dueDate = addDays(base, 266);
    } else if (method === "ivf3") {
      // Day-3 embryo transfer: due date = transfer + 263 days.
      conception = addDays(base, -3);
      dueDate = addDays(base, 263);
    } else {
      // ivf5: Day-5 blastocyst transfer: due date = transfer + 261 days.
      conception = addDays(base, -5);
      dueDate = addDays(base, 261);
    }

    // Gestational age is measured from LMP (dueDate - 280 days), regardless of method.
    const gestationalStart = addDays(dueDate, -280);

    const today = toMidnight(new Date());
    const gaDaysRaw = Math.round(
      (today.getTime() - gestationalStart.getTime()) / MS_PER_DAY
    );

    let gaLabel;
    let gaWeeks = null;
    let gaDays = null;
    if (gaDaysRaw < 0) {
      gaLabel = "Not started yet";
    } else {
      gaWeeks = Math.floor(gaDaysRaw / 7);
      gaDays = gaDaysRaw % 7;
      gaLabel = `${gaWeeks}w ${gaDays}d`;
    }

    // Trimester based on gestational weeks.
    let trimester = "—";
    if (gaDaysRaw >= 0) {
      if (gaWeeks < 13) trimester = "First trimester";
      else if (gaWeeks < 27) trimester = "Second trimester";
      else trimester = "Third trimester";
    }

    const daysRemaining = Math.round(
      (toMidnight(dueDate).getTime() - today.getTime()) / MS_PER_DAY
    );

    // Percent of the 280-day pregnancy elapsed.
    let percent = null;
    if (gaDaysRaw >= 0) {
      percent = Math.max(0, Math.min(100, Math.round((gaDaysRaw / 280) * 100)));
    }

    const milestones = [
      { label: "End of first trimester (13w)", date: addDays(gestationalStart, 13 * 7) },
      { label: "Anatomy scan window (20w)", date: addDays(gestationalStart, 20 * 7) },
      { label: "End of second trimester (27w)", date: addDays(gestationalStart, 27 * 7) },
      { label: "Full term begins (37w)", date: addDays(gestationalStart, 37 * 7) },
      { label: "Estimated due date (40w)", date: dueDate },
    ];

    return {
      dueDate,
      conception,
      gestationalStart,
      gaLabel,
      gaDaysRaw,
      trimester,
      daysRemaining,
      percent,
      milestones,
      usedCycle: method === "lmp" ? validCycle : null,
    };
  }, [method, startDate, cycle]);

  const startLabel =
    method === "lmp"
      ? "First day of your last period"
      : method === "conception"
      ? "Conception (ovulation) date"
      : "Embryo transfer date";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dd-method">
              Calculate from
            </label>
            <select
              className="tool-select"
              id="dd-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="lmp">Last menstrual period (LMP)</option>
              <option value="conception">Conception date</option>
              <option value="ivf5">IVF 5-day transfer</option>
              <option value="ivf3">IVF 3-day transfer</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="dd-start">
              {startLabel}
            </label>
            <input
              className="tool-input"
              id="dd-start"
              type="date"
              max={todayString()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {method === "lmp" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="dd-cycle">
                Average cycle length (days)
              </label>
              <input
                className="tool-input"
                id="dd-cycle"
                type="number"
                min="20"
                max="45"
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
              />
            </div>
          )}
        </div>
        <p className="tool-note">
          The LMP method uses Naegele&apos;s rule (last period + 280 days) and
          adjusts for cycle lengths other than 28 days. IVF dates are calculated
          from the embryo age at transfer.
        </p>
      </div>

      {!result && (
        <p className="tool-note">
          Enter a date above to estimate your due date and see how far along you
          are.
        </p>
      )}

      {result && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Estimated due date</p>
            <div className="tool-result-value">{formatLong(result.dueDate)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.gaLabel}</div>
              <div className="tool-stat-label">How far along today</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.trimester}</div>
              <div className="tool-stat-label">Current trimester</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {Math.abs(result.daysRemaining).toLocaleString()}
              </div>
              <div className="tool-stat-label">
                {result.daysRemaining >= 0 ? "Days to go" : "Days past due"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.percent === null ? "—" : `${result.percent}%`}
              </div>
              <div className="tool-stat-label">Pregnancy complete</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatShort(result.conception)}</div>
              <div className="tool-stat-label">Estimated conception</div>
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Key milestones</p>
            <pre className="tool-output">
{result.milestones
  .map((m) => `${m.label.padEnd(34, " ")}  ${formatShort(m.date)}`)
  .join("\n")}
            </pre>
          </div>

          <p className="tool-note">
            Only about 4% of babies arrive on the exact due date. Most births
            happen within two weeks either side of it. This estimate is for
            planning only and is not medical advice — your provider&apos;s
            dating, especially an early ultrasound, takes precedence. Everything
            is calculated in your browser; no dates are uploaded or stored.
          </p>
        </>
      )}
    </div>
  );
}
