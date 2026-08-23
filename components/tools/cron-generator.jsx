"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Cron field order: minute hour day-of-month month day-of-week
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

const DOW_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({
  value: i + 1,
  label: name,
}));

const DOW_OPTIONS = DOW_NAMES.map((name, i) => ({ value: i, label: name }));

// Metadata for each of the five cron fields.
const FIELDS = [
  { key: "minute", label: "Minute", min: 0, max: 59, options: null },
  { key: "hour", label: "Hour", min: 0, max: 23, options: null },
  { key: "dom", label: "Day of month", min: 1, max: 31, options: null },
  { key: "month", label: "Month", min: 1, max: 12, options: MONTH_OPTIONS },
  { key: "dow", label: "Day of week", min: 0, max: 6, options: DOW_OPTIONS },
];

const DEFAULT_PARTS = {
  minute: { mode: "every", value: 0, step: 5 },
  hour: { mode: "every", value: 0, step: 1 },
  dom: { mode: "every", value: 1, step: 1 },
  month: { mode: "every", value: 1, step: 1 },
  dow: { mode: "every", value: 0, step: 1 },
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Clamp any incoming value to a whole number within [min, max]; fall back to
// min so the UI can never produce NaN or an out-of-range cron field.
function clamp(raw, min, max) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

// Turn one field's state into its cron token.
function tokenFor(part) {
  if (part.mode === "every") return "*";
  if (part.mode === "step") return "*/" + part.step;
  return String(part.value);
}

function to12h(h) {
  const period = h < 12 ? "AM" : "PM";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return { hr, period };
}

function clockTime(h, m) {
  const { hr, period } = to12h(h);
  return `${hr}:${pad2(m)} ${period}`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function plural(n) {
  return n === 1 ? "" : "s";
}

// Describe the minute + hour combination as a friendly time clause.
function describeTime(minute, hour) {
  const mm = minute.mode;
  const hm = hour.mode;

  if (mm === "every" && hm === "every") return "every minute";
  if (mm === "step" && hm === "every")
    return `every ${minute.step} minute${plural(minute.step)}`;
  if (mm === "specific" && hm === "every")
    return `at ${minute.value} minute${plural(minute.value)} past every hour`;

  if (mm === "every" && hm === "specific") {
    const { hr, period } = to12h(hour.value);
    return `every minute, during the ${hr}:00 ${period} hour`;
  }
  if (mm === "step" && hm === "specific") {
    const { hr, period } = to12h(hour.value);
    return `every ${minute.step} minutes, during the ${hr}:00 ${period} hour`;
  }
  if (mm === "specific" && hm === "specific")
    return `at ${clockTime(hour.value, minute.value)}`;

  if (mm === "every" && hm === "step")
    return `every minute, past every ${hour.step} hour${plural(hour.step)}`;
  if (mm === "step" && hm === "step")
    return `every ${minute.step} minutes, past every ${hour.step} hour${plural(
      hour.step
    )}`;
  if (mm === "specific" && hm === "step")
    return `at minute ${minute.value} past every ${hour.step} hour${plural(
      hour.step
    )}`;

  return "every minute";
}

// Build the day / month clauses that follow the time clause.
function dayClauses(dom, month, dow) {
  const out = [];

  if (dom.mode === "specific")
    out.push(`on the ${ordinal(dom.value)} day of the month`);
  else if (dom.mode === "step")
    out.push(`every ${dom.step} day${plural(dom.step)} of the month`);

  if (dow.mode === "specific") out.push(`on ${DOW_NAMES[dow.value]}`);
  else if (dow.mode === "step")
    out.push(`every ${dow.step} day${plural(dow.step)} of the week`);

  if (month.mode === "specific")
    out.push(`in ${MONTH_NAMES[month.value - 1]}`);
  else if (month.mode === "step")
    out.push(`every ${month.step} month${plural(month.step)}`);

  return out;
}

function describe(parts) {
  const time = describeTime(parts.minute, parts.hour);
  const days = dayClauses(parts.dom, parts.month, parts.dow);
  let s = time + (days.length ? ", " + days.join(", ") : "");
  s = s.charAt(0).toUpperCase() + s.slice(1) + ".";
  return s;
}

function parseTime(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str || "");
  if (!m) return { h: 9, m: 0 };
  return {
    h: clamp(m[1], 0, 23),
    m: clamp(m[2], 0, 59),
  };
}

export default function CronGenerator() {
  const [parts, setParts] = useState(DEFAULT_PARTS);
  const [presetTime, setPresetTime] = useState("09:00");
  const [presetDow, setPresetDow] = useState(1);
  const [copied, setCopied] = useState(false);

  const cron = useMemo(
    () =>
      [parts.minute, parts.hour, parts.dom, parts.month, parts.dow]
        .map(tokenFor)
        .join(" "),
    [parts]
  );

  const humanText = useMemo(() => describe(parts), [parts]);

  function updatePart(key, changes) {
    setCopied(false);
    setParts((prev) => ({ ...prev, [key]: { ...prev[key], ...changes } }));
  }

  function applyParts(next) {
    setCopied(false);
    setParts({
      minute: { ...DEFAULT_PARTS.minute },
      hour: { ...DEFAULT_PARTS.hour },
      dom: { ...DEFAULT_PARTS.dom },
      month: { ...DEFAULT_PARTS.month },
      dow: { ...DEFAULT_PARTS.dow },
      ...next,
    });
  }

  function presetEveryMinute() {
    applyParts({});
  }
  function presetEvery5() {
    applyParts({ minute: { mode: "step", value: 0, step: 5 } });
  }
  function presetHourly() {
    applyParts({ minute: { mode: "specific", value: 0, step: 5 } });
  }
  function presetDaily() {
    const { h, m } = parseTime(presetTime);
    applyParts({
      minute: { mode: "specific", value: m, step: 5 },
      hour: { mode: "specific", value: h, step: 1 },
    });
  }
  function presetWeekly() {
    const { h, m } = parseTime(presetTime);
    applyParts({
      minute: { mode: "specific", value: m, step: 5 },
      hour: { mode: "specific", value: h, step: 1 },
      dow: { mode: "specific", value: clamp(presetDow, 0, 6), step: 1 },
    });
  }
  function presetMonthly() {
    const { h, m } = parseTime(presetTime);
    applyParts({
      minute: { mode: "specific", value: m, step: 5 },
      hour: { mode: "specific", value: h, step: 1 },
      dom: { mode: "specific", value: 1, step: 1 },
    });
  }

  async function handleCopy() {
    try {
      await copyText(cron);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function renderValueInput(field, part) {
    if (field.options) {
      return (
        <select
          className="tool-select"
          value={part.value}
          aria-label={`${field.label} value`}
          onChange={(e) =>
            updatePart(field.key, { value: Number(e.target.value) })
          }
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="tool-input"
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        value={part.value}
        aria-label={`${field.label} value`}
        onChange={(e) =>
          updatePart(field.key, {
            value: clamp(e.target.value, field.min, field.max),
          })
        }
        style={{ maxWidth: "8rem" }}
      />
    );
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        {/* Quick presets */}
        <div className="tool-field">
          <span className="tool-label">Quick presets</span>
          <div
            className="tool-actions"
            style={{ marginTop: 0, flexWrap: "wrap" }}
          >
            <button className="btn" type="button" onClick={presetEveryMinute}>
              Every minute
            </button>
            <button className="btn" type="button" onClick={presetEvery5}>
              Every 5 minutes
            </button>
            <button className="btn" type="button" onClick={presetHourly}>
              Hourly
            </button>
            <button className="btn" type="button" onClick={presetDaily}>
              Daily
            </button>
            <button className="btn" type="button" onClick={presetWeekly}>
              Weekly
            </button>
            <button className="btn" type="button" onClick={presetMonthly}>
              Monthly
            </button>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cron-preset-time">
              Time for daily / weekly / monthly presets
            </label>
            <input
              id="cron-preset-time"
              className="tool-input"
              type="time"
              value={presetTime}
              onChange={(e) => setPresetTime(e.target.value)}
              style={{ maxWidth: "10rem" }}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cron-preset-dow">
              Day for weekly preset
            </label>
            <select
              id="cron-preset-dow"
              className="tool-select"
              value={presetDow}
              onChange={(e) => setPresetDow(Number(e.target.value))}
              style={{ maxWidth: "12rem" }}
            >
              {DOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Per-field builders */}
        {FIELDS.map((field) => {
          const part = parts[field.key];
          return (
            <div className="tool-field" key={field.key}>
              <span className="tool-label">{field.label}</span>
              <div className="tool-row" style={{ alignItems: "flex-end" }}>
                <div className="tool-field" style={{ maxWidth: "14rem" }}>
                  <select
                    className="tool-select"
                    value={part.mode}
                    aria-label={`${field.label} mode`}
                    onChange={(e) =>
                      updatePart(field.key, { mode: e.target.value })
                    }
                  >
                    <option value="every">Every {field.label.toLowerCase()}</option>
                    <option value="specific">Specific value</option>
                    <option value="step">Every N (step)</option>
                  </select>
                </div>

                {part.mode === "specific" ? (
                  <div className="tool-field" style={{ maxWidth: "10rem" }}>
                    {renderValueInput(field, part)}
                  </div>
                ) : null}

                {part.mode === "step" ? (
                  <div
                    className="tool-field"
                    style={{ maxWidth: "12rem" }}
                  >
                    <div
                      className="tool-row"
                      style={{ alignItems: "center", gap: "0.5rem" }}
                    >
                      <span style={{ opacity: 0.75 }}>*/</span>
                      <input
                        className="tool-input"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={field.max}
                        step={1}
                        value={part.step}
                        aria-label={`${field.label} step`}
                        onChange={(e) =>
                          updatePart(field.key, {
                            step: clamp(e.target.value, 1, field.max),
                          })
                        }
                        style={{ maxWidth: "7rem" }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Result */}
      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Cron expression</div>
        <div
          className="tool-result-value"
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            wordBreak: "break-all",
          }}
        >
          {cron}
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "0.5rem" }}>
        <strong>When it runs:</strong> {humanText}
      </p>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        {FIELDS.map((field) => (
          <div className="tool-stat" key={field.key}>
            <div
              className="tool-stat-num"
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              }}
            >
              {tokenFor(parts[field.key])}
            </div>
            <div className="tool-stat-label">{field.label}</div>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button
          className={copied ? "btn btn-success" : "btn btn-primary"}
          type="button"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy cron"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setCopied(false);
            setParts(DEFAULT_PARTS);
          }}
        >
          Reset
        </button>
      </div>

      <p className="tool-note">
        Fields are read in the standard order:{" "}
        <code>minute</code> <code>hour</code> <code>day-of-month</code>{" "}
        <code>month</code> <code>day-of-week</code> (Sunday = 0). Everything is
        built right here in your browser — nothing is uploaded or stored.
      </p>
    </div>
  );
}
