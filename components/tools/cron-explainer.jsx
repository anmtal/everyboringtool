"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// ---------------------------------------------------------------------------
// A client-side cron expression EXPLAINER.
//
// Parses a standard Unix cron expression (5 fields) or a cron with a leading
// seconds field (6 fields, as used by node-cron / some schedulers), plus the
// common @shortcuts (@daily, @hourly, ...). It produces:
//   1. a plain-English sentence,
//   2. a field-by-field breakdown,
//   3. the next scheduled run times (in the visitor's local timezone).
//
// It does NOT support Quartz-style extensions (? L W # or day-of-week 1-7
// with Sunday = 1). Those are called out in the UI so the result is honest.
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const MONTH_ALIASES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_ALIASES = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const SHORTCUTS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

// Definition of each field for the 5-field layout. A 6-field expression adds a
// "second" field at the front (handled in parseExpression).
const FIELD_DEFS_5 = [
  { key: "minute", label: "Minute", min: 0, max: 59, unit: "minute" },
  { key: "hour", label: "Hour", min: 0, max: 23, unit: "hour" },
  { key: "dom", label: "Day of month", min: 1, max: 31, unit: "day" },
  { key: "month", label: "Month", min: 1, max: 12, unit: "month" },
  { key: "dow", label: "Day of week", min: 0, max: 7, unit: "day-of-week" },
];

const SECOND_DEF = { key: "second", label: "Second", min: 0, max: 59, unit: "second" };

function isBlank(s) {
  return !s || s.trim() === "";
}

// Convert a token that may be a number or a name into a number for a field.
function tokenToNumber(tok, def) {
  const t = tok.trim().toLowerCase();
  if (t === "") return null;
  if (def.key === "month" && MONTH_ALIASES[t] != null) return MONTH_ALIASES[t];
  if (def.key === "dow" && DOW_ALIASES[t] != null) return DOW_ALIASES[t];
  if (!/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

// Parse a single field string into a sorted array of allowed values plus a
// flag for whether it is unrestricted ("*"). Throws Error with a message on
// invalid input.
function parseField(raw, def) {
  const field = raw.trim();
  if (field === "") throw new Error(`${def.label} is empty.`);

  const restricted = !(field === "*" || field === "*/1" || field === "?");
  const set = new Set();

  // Quartz-only chars we don't support — flag them clearly.
  if (/[LW#]/i.test(field)) {
    throw new Error(
      `${def.label} uses "${field}" — the L, W and # characters are Quartz-only and not supported here.`
    );
  }
  if (field === "?") {
    // Treat ? like * (no restriction) for dom/dow, which is how Quartz uses it.
    for (let v = def.min; v <= def.max; v++) set.add(normalize(v, def));
    return { values: sortedUnique(set), restricted: false, raw: field };
  }

  const parts = field.split(",");
  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (part === "") throw new Error(`${def.label} has an empty list item.`);

    let step = 1;
    let base = part;
    if (part.includes("/")) {
      const bits = part.split("/");
      if (bits.length !== 2) throw new Error(`${def.label}: bad step in "${part}".`);
      base = bits[0].trim();
      const stepN = parseInt(bits[1].trim(), 10);
      if (!/^\d+$/.test(bits[1].trim()) || stepN < 1) {
        throw new Error(`${def.label}: step must be a positive number in "${part}".`);
      }
      step = stepN;
    }

    let lo;
    let hi;
    if (base === "*") {
      lo = def.min;
      hi = def.max;
    } else if (base.includes("-")) {
      const rb = base.split("-");
      if (rb.length !== 2) throw new Error(`${def.label}: bad range "${base}".`);
      lo = tokenToNumber(rb[0], def);
      hi = tokenToNumber(rb[1], def);
      if (lo == null || hi == null) {
        throw new Error(`${def.label}: unrecognized value in range "${base}".`);
      }
    } else {
      lo = tokenToNumber(base, def);
      if (lo == null) throw new Error(`${def.label}: unrecognized value "${base}".`);
      hi = part.includes("/") ? def.max : lo;
    }

    if (lo < def.min || lo > def.max || hi < def.min || hi > def.max) {
      throw new Error(
        `${def.label}: value out of range (allowed ${def.min}-${def.max}).`
      );
    }
    if (lo > hi) throw new Error(`${def.label}: range start is greater than end in "${base}".`);

    for (let v = lo; v <= hi; v += step) set.add(normalize(v, def));
  }

  return { values: sortedUnique(set), restricted, raw: field };
}

// Normalize a raw value for a field — mainly folds day-of-week 7 into 0 (both
// mean Sunday in Unix cron).
function normalize(v, def) {
  if (def.key === "dow" && v === 7) return 0;
  return v;
}

function sortedUnique(set) {
  return Array.from(set).sort((a, b) => a - b);
}

// Split on whitespace, drop empties.
function splitFields(str) {
  return str.trim().split(/\s+/).filter((x) => x !== "");
}

// Parse a whole expression string. Returns { fieldDefs, parsed, hasSeconds }
// or throws Error.
function parseExpression(input) {
  let expr = input.trim();
  if (expr === "") throw new Error("Enter a cron expression to explain it.");

  const lower = expr.toLowerCase();
  if (lower === "@reboot") {
    throw new Error("@reboot runs once at system startup — it has no clock schedule to compute.");
  }
  if (SHORTCUTS[lower]) expr = SHORTCUTS[lower];

  const tokens = splitFields(expr);
  if (tokens.length !== 5 && tokens.length !== 6) {
    throw new Error(
      `Expected 5 fields (or 6 with seconds). Got ${tokens.length}. Standard order is: minute hour day-of-month month day-of-week.`
    );
  }

  const hasSeconds = tokens.length === 6;
  const defs = hasSeconds ? [SECOND_DEF, ...FIELD_DEFS_5] : FIELD_DEFS_5;

  const parsed = {};
  defs.forEach((def, i) => {
    parsed[def.key] = parseField(tokens[i], def);
  });

  return { defs, parsed, hasSeconds, normalized: tokens.join(" ") };
}

// ---- Human-readable description --------------------------------------------

function joinHuman(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;
}

function labelValue(def, v) {
  if (def.key === "month") return MONTH_NAMES[v - 1];
  if (def.key === "dow") return DOW_NAMES[v];
  return String(v);
}

function isSingle(field) {
  return /^\d+$/.test(field.raw) ||
    (/^[a-z]+$/i.test(field.raw) && field.values.length === 1);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function clock12(h, m) {
  const period = h < 12 ? "AM" : "PM";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}:${pad2(m)} ${period}`;
}

// Describe one field as a noun phrase (no leading preposition).
function describeField(field, def) {
  const parts = field.raw.split(",").map((p) => p.trim());
  const phrases = parts.map((part) => describePart(part, def));
  return joinHuman(phrases);
}

function describePart(part, def) {
  const unit = def.unit;
  let step = null;
  let base = part;
  if (part.includes("/")) {
    const bits = part.split("/");
    base = bits[0].trim();
    step = parseInt(bits[1].trim(), 10);
  }

  if (base === "*" || base === "?") {
    if (step) return `every ${step} ${unit}${step === 1 ? "" : "s"}`;
    return `every ${unit}`;
  }

  const named = def.key === "month" || def.key === "dow";

  if (base.includes("-")) {
    const [a, b] = base.split("-").map((x) => tokenToNumber(x, def));
    const range = `${labelValue(def, normalize(a, def))} through ${labelValue(def, normalize(b, def))}`;
    if (step) return `every ${step} ${unit}s from ${range}`;
    return named ? range : `${unit}s ${range}`;
  }

  const n = normalize(tokenToNumber(base, def), def);
  if (step) return `every ${step} ${unit}s starting at ${labelValue(def, n)}`;
  if (named) return labelValue(def, n);
  return `${unit} ${n}`;
}

// Build the top-line English sentence.
function buildSentence(parsed, hasSeconds) {
  const minute = parsed.minute;
  const hour = parsed.hour;
  const second = parsed.second;

  let timeClause;
  const minAll = !minute.restricted;
  const hourAll = !hour.restricted;

  if (minAll && hourAll) {
    timeClause = hasSeconds && second && second.restricted
      ? `at ${describeField(second, SECOND_DEF)} of every minute`
      : "every minute";
  } else if (hourAll) {
    // A pure step like "*/5" reads better as "every 5 minutes" than
    // "at every 5 minutes past every hour".
    timeClause = /^\*\/\d+$/.test(minute.raw)
      ? describeField(minute, FIELD_DEFS_5[0])
      : `at ${describeField(minute, FIELD_DEFS_5[0])} past every hour`;
  } else if (isSingle(minute) && isSingle(hour)) {
    timeClause = `at ${clock12(hour.values[0], minute.values[0])}`;
  } else {
    timeClause = `at ${describeField(minute, FIELD_DEFS_5[0])}, ${describeField(hour, FIELD_DEFS_5[1])}`;
  }

  if (hasSeconds && second && second.restricted && !(minAll && hourAll)) {
    timeClause = `${describeField(second, SECOND_DEF)}, ${timeClause}`;
  }

  const clauses = [];
  const dom = parsed.dom;
  const dow = parsed.dow;
  const month = parsed.month;

  if (dom.restricted) clauses.push(`on ${describeField(dom, FIELD_DEFS_5[2])}`);
  if (dow.restricted) clauses.push(`on ${describeField(dow, FIELD_DEFS_5[4])}`);
  if (month.restricted) clauses.push(`in ${describeField(month, FIELD_DEFS_5[3])}`);

  let s = timeClause + (clauses.length ? ", " + clauses.join(", ") : "");
  s = s.charAt(0).toUpperCase() + s.slice(1) + ".";
  return s;
}

// ---- Next run computation ---------------------------------------------------

// Whether a given day matches, applying the Unix cron OR rule for dom/dow.
function dayMatches(parsed, dom, dow) {
  const domR = parsed.dom.restricted;
  const dowR = parsed.dow.restricted;
  const dm = parsed.dom.values.includes(dom);
  const dwm = parsed.dow.values.includes(dow);
  if (domR && dowR) return dm || dwm;
  if (domR) return dm;
  if (dowR) return dwm;
  return true;
}

function computeNextRuns(parsed, hasSeconds, fromDate, count) {
  const runs = [];
  const secValues = hasSeconds ? parsed.second.values : [0];
  const secSet = new Set(secValues);
  const minSet = new Set(parsed.minute.values);
  const hourSet = new Set(parsed.hour.values);
  const monthSet = new Set(parsed.month.values);

  const d = new Date(fromDate.getTime());
  d.setMilliseconds(0);
  // Advance one step past "now" so we return strictly future times.
  d.setSeconds(d.getSeconds() + 1);

  let iterations = 0;
  const MAX_ITERATIONS = 1000000; // generous; day/month skips keep this low

  while (runs.length < count && iterations < MAX_ITERATIONS) {
    iterations += 1;
    const mo = d.getMonth() + 1;
    if (!monthSet.has(mo)) {
      // Jump to the first day of next month at 00:00:00.
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    const dom = d.getDate();
    const dow = d.getDay();
    if (!dayMatches(parsed, dom, dow)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    const hr = d.getHours();
    if (!hourSet.has(hr)) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    const mi = d.getMinutes();
    if (!minSet.has(mi)) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    const se = d.getSeconds();
    if (!secSet.has(se)) {
      d.setSeconds(d.getSeconds() + 1, 0);
      continue;
    }
    runs.push(new Date(d.getTime()));
    d.setSeconds(d.getSeconds() + 1, 0);
  }

  return { runs, exhausted: runs.length < count };
}

function formatRun(date, hasSeconds) {
  const opts = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (hasSeconds) opts.second = "2-digit";
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date);
  } catch {
    return date.toString();
  }
}

const EXAMPLES = [
  { label: "Every 5 min", expr: "*/5 * * * *" },
  { label: "Daily 9am", expr: "0 9 * * *" },
  { label: "Weekdays 8:30", expr: "30 8 * * 1-5" },
  { label: "1st of month", expr: "0 0 1 * *" },
  { label: "@hourly", expr: "@hourly" },
  { label: "With seconds", expr: "*/30 * * * * *" },
];

export default function CronExplainer() {
  const [expr, setExpr] = useState("30 8 * * 1-5");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (isBlank(expr)) return { empty: true };
    try {
      const parsed = parseExpression(expr);
      const sentence = buildSentence(parsed.parsed, parsed.hasSeconds);
      const { runs, exhausted } = computeNextRuns(
        parsed.parsed,
        parsed.hasSeconds,
        new Date(),
        5
      );
      // Note the OR relationship when both dom and dow are restricted.
      const bothDay =
        parsed.parsed.dom.restricted && parsed.parsed.dow.restricted;
      return { ...parsed, sentence, runs, exhausted, bothDay };
    } catch (err) {
      return { error: err.message };
    }
  }, [expr]);

  async function handleCopy() {
    if (!result || !result.sentence) return;
    try {
      await copyText(result.sentence);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="cron-expr">
            Cron expression
          </label>
          <input
            id="cron-expr"
            className="tool-input"
            type="text"
            value={expr}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="e.g. 0 9 * * 1-5"
            onChange={(e) => {
              setExpr(e.target.value);
              setCopied(false);
            }}
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          />
        </div>

        <div className="tool-field">
          <span className="tool-label">Try an example</span>
          <div className="tool-actions" style={{ marginTop: 0, flexWrap: "wrap" }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.expr}
                className="btn"
                type="button"
                onClick={() => {
                  setExpr(ex.expr);
                  setCopied(false);
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result.empty ? (
        <p className="tool-note">
          Type a cron expression above (like <code>0 9 * * 1-5</code>) to see a
          plain-English explanation, a field-by-field breakdown, and the next
          run times.
        </p>
      ) : null}

      {result.error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {result.error}
        </p>
      ) : null}

      {result.sentence ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">In plain English</div>
            <div className="tool-result-value">{result.sentence}</div>
          </div>

          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy explanation"}
            </button>
          </div>

          <div className="tool-result-label" style={{ marginTop: "1rem" }}>
            Field breakdown
          </div>
          <div className="tool-stat-grid">
            {result.defs.map((def) => {
              const field = result.parsed[def.key];
              return (
                <div className="tool-stat" key={def.key}>
                  <div
                    className="tool-stat-num"
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    }}
                  >
                    {field.raw}
                  </div>
                  <div className="tool-stat-label">
                    {def.label}: {describeField(field, def)}
                  </div>
                </div>
              );
            })}
          </div>

          {result.bothDay ? (
            <p className="tool-note" style={{ marginTop: "0.75rem" }}>
              Note: both day-of-month and day-of-week are set. In standard Unix
              cron these are combined with <strong>OR</strong> — the job runs
              when <em>either</em> matches, not only when both do.
            </p>
          ) : null}

          <div className="tool-result-label" style={{ marginTop: "1rem" }}>
            Next 5 runs (your local time)
          </div>
          <div className="tool-output" role="status" aria-live="polite">
            {result.runs.length === 0
              ? "No upcoming run found within the search window."
              : result.runs
                  .map((r) => formatRun(r, result.hasSeconds))
                  .join("\n") +
                (result.exhausted
                  ? "\n… (no further runs found in the search window)"
                  : "")}
          </div>

          <p className="tool-note">
            Fields are read as{" "}
            {result.hasSeconds ? (
              <>
                <code>second</code> <code>minute</code> <code>hour</code>{" "}
              </>
            ) : (
              <>
                <code>minute</code> <code>hour</code>{" "}
              </>
            )}
            <code>day-of-month</code> <code>month</code> <code>day-of-week</code>{" "}
            (Sunday = 0 or 7). Next-run times use your device&apos;s timezone.
            Quartz-only characters (<code>L</code>, <code>W</code>,{" "}
            <code>#</code>) are not supported. Everything runs in your browser —
            nothing is uploaded.
          </p>
        </>
      ) : null}
    </div>
  );
}
