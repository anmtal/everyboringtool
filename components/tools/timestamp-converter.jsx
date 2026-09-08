"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Detect whether a numeric string is seconds, milliseconds, microseconds, or nanoseconds
// based on its digit length, then normalise to milliseconds for the Date constructor.
function toMillis(raw, unit) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (unit === "s") return n * 1000;
  if (unit === "ms") return n;
  if (unit === "us") return n / 1000;
  if (unit === "ns") return n / 1e6;
  // auto: guess by magnitude of the integer part
  const digits = Math.trunc(Math.abs(n)).toString().length;
  if (digits <= 11) return n * 1000; // seconds (through year ~5138)
  if (digits <= 14) return n; // milliseconds
  if (digits <= 17) return n / 1000; // microseconds
  return n / 1e6; // nanoseconds
}

function guessUnitLabel(raw) {
  const n = Math.trunc(Math.abs(Number(raw)));
  if (!Number.isFinite(n)) return "";
  const digits = n.toString().length;
  if (digits <= 11) return "seconds";
  if (digits <= 14) return "milliseconds";
  if (digits <= 17) return "microseconds";
  return "nanoseconds";
}

const PAD = (x) => String(x).padStart(2, "0");

// Build the ISO 8601 string for a date in a specific offset-free way for UTC,
// and use Intl for the local/other cases.
function isoUtc(d) {
  return (
    `${d.getUTCFullYear()}-${PAD(d.getUTCMonth() + 1)}-${PAD(d.getUTCDate())}` +
    `T${PAD(d.getUTCHours())}:${PAD(d.getUTCMinutes())}:${PAD(d.getUTCSeconds())}` +
    `.${String(d.getUTCMilliseconds()).padStart(3, "0")}Z`
  );
}

function isoLocal(d) {
  const off = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return (
    `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}` +
    `T${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}` +
    `${sign}${PAD(Math.floor(abs / 60))}:${PAD(abs % 60)}`
  );
}

function relativeFromNow(ms) {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const units = [
    ["year", 365.25 * 24 * 3600 * 1000],
    ["month", 30.44 * 24 * 3600 * 1000],
    ["day", 24 * 3600 * 1000],
    ["hour", 3600 * 1000],
    ["minute", 60 * 1000],
    ["second", 1000],
  ];
  for (const [name, size] of units) {
    if (abs >= size || name === "second") {
      const value = Math.round(diff / size);
      const rtf =
        typeof Intl !== "undefined" && Intl.RelativeTimeFormat
          ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
          : null;
      if (rtf) return rtf.format(value, name);
      const av = Math.abs(value);
      const plural = av === 1 ? name : name + "s";
      return diff >= 0 ? `in ${av} ${plural}` : `${av} ${plural} ago`;
    }
  }
  return "";
}

function localTzName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time";
  } catch (e) {
    return "your local time";
  }
}

export default function TimestampConverter() {
  // Direction 1: timestamp -> date. Prefill with a real example.
  const [tsInput, setTsInput] = useState("1700000000");
  const [unit, setUnit] = useState("auto");

  // Direction 2: date -> timestamp. Prefill with a sensible datetime-local default.
  const [dateInput, setDateInput] = useState("2023-11-14T22:13:20");
  const [dateZone, setDateZone] = useState("local");

  const [copied, setCopied] = useState("");

  const tzName = useMemo(() => localTzName(), []);

  // ---- Timestamp -> human date ----
  const tsResult = useMemo(() => {
    const raw = tsInput.trim();
    if (!raw) return { empty: true };
    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
      return { error: "Enter a whole or decimal number (digits only)." };
    }
    const ms = toMillis(raw, unit);
    if (ms === null || !Number.isFinite(ms)) {
      return { error: "That number is out of range." };
    }
    const d = new Date(ms);
    if (isNaN(d.getTime())) {
      return { error: "That timestamp is out of the supported date range." };
    }
    return {
      utc: d.toUTCString(),
      isoUtc: isoUtc(d),
      isoLocal: isoLocal(d),
      local: d.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      relative: relativeFromNow(ms),
      unitLabel: unit === "auto" ? guessUnitLabel(raw) : null,
    };
  }, [tsInput, unit]);

  // ---- Human date -> timestamp ----
  const dateResult = useMemo(() => {
    const raw = dateInput.trim();
    if (!raw) return { empty: true };
    // datetime-local gives "YYYY-MM-DDTHH:mm" (optionally :ss). Interpret in the chosen zone.
    let ms;
    if (dateZone === "utc") {
      // Append Z so it is parsed as UTC.
      const withZ = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : raw + "Z";
      ms = Date.parse(withZ);
    } else {
      // Local interpretation: Date.parse of a bare datetime-local is local time.
      ms = Date.parse(raw);
    }
    if (isNaN(ms)) {
      return { error: "Pick a valid date and time above." };
    }
    return {
      seconds: Math.floor(ms / 1000),
      millis: ms,
    };
  }, [dateInput, dateZone]);

  async function doCopy(key, value) {
    try {
      await copyText(String(value));
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      setCopied("");
    }
  }

  function useNow() {
    const now = Date.now();
    setTsInput(String(Math.floor(now / 1000)));
    setUnit("s");
  }

  function nowToDateField() {
    const d = new Date();
    // Build a datetime-local value in local time.
    const v =
      `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}` +
      `T${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`;
    setDateInput(v);
    setDateZone("local");
  }

  return (
    <div className="tool">
      {/* ============ Timestamp -> Date ============ */}
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ts-input">
              Unix timestamp
            </label>
            <input
              id="ts-input"
              className="tool-input"
              type="text"
              inputMode="numeric"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="e.g. 1700000000"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ts-unit">
              Unit
            </label>
            <select
              id="ts-unit"
              className="tool-select"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="auto">Auto-detect</option>
              <option value="s">Seconds</option>
              <option value="ms">Milliseconds</option>
              <option value="us">Microseconds</option>
              <option value="ns">Nanoseconds</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={useNow}>
          Use current time
        </button>
      </div>

      {tsResult.error ? <p className="tool-error">{tsResult.error}</p> : null}

      {tsResult.utc ? (
        <div className="tool-result" role="status" aria-live="polite">
          {tsResult.unitLabel ? (
            <p className="tool-note">Detected as {tsResult.unitLabel}.</p>
          ) : null}

          <div className="tool-result-label">UTC (GMT)</div>
          <div className="tool-result-value">
            {tsResult.utc}
            <button
              className={copied === "utc" ? "btn btn-success" : "btn"}
              type="button"
              onClick={() => doCopy("utc", tsResult.utc)}
            >
              {copied === "utc" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="tool-result-label">Local time ({tzName})</div>
          <div className="tool-result-value">
            {tsResult.local}
            <button
              className={copied === "local" ? "btn btn-success" : "btn"}
              type="button"
              onClick={() => doCopy("local", tsResult.local)}
            >
              {copied === "local" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="tool-result-label">ISO 8601 (UTC)</div>
          <div className="tool-result-value">
            {tsResult.isoUtc}
            <button
              className={copied === "isoUtc" ? "btn btn-success" : "btn"}
              type="button"
              onClick={() => doCopy("isoUtc", tsResult.isoUtc)}
            >
              {copied === "isoUtc" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="tool-result-label">ISO 8601 (local offset)</div>
          <div className="tool-result-value">
            {tsResult.isoLocal}
            <button
              className={copied === "isoLocal" ? "btn btn-success" : "btn"}
              type="button"
              onClick={() => doCopy("isoLocal", tsResult.isoLocal)}
            >
              {copied === "isoLocal" ? "Copied!" : "Copy"}
            </button>
          </div>

          {tsResult.relative ? (
            <p className="tool-note">{tsResult.relative}</p>
          ) : null}
        </div>
      ) : null}

      {tsResult.empty ? (
        <p className="tool-note">
          Enter a Unix timestamp above to see the human-readable date. Seconds,
          milliseconds, microseconds, and nanoseconds are all supported.
        </p>
      ) : null}

      {/* ============ Date -> Timestamp ============ */}
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="date-input">
              Date &amp; time
            </label>
            <input
              id="date-input"
              className="tool-input"
              type="datetime-local"
              step="1"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="date-zone">
              Interpret as
            </label>
            <select
              id="date-zone"
              className="tool-select"
              value={dateZone}
              onChange={(e) => setDateZone(e.target.value)}
            >
              <option value="local">Local time ({tzName})</option>
              <option value="utc">UTC (GMT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={nowToDateField}>
          Use current time
        </button>
      </div>

      {dateResult.error ? (
        <p className="tool-error">{dateResult.error}</p>
      ) : null}

      {dateResult.seconds !== undefined ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">
              {dateResult.seconds.toLocaleString("en-US")}
            </div>
            <div className="tool-stat-label">Timestamp (seconds)</div>
            <button
              className={copied === "sec" ? "btn btn-success" : "btn"}
              type="button"
              onClick={() => doCopy("sec", dateResult.seconds)}
            >
              {copied === "sec" ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {dateResult.millis.toLocaleString("en-US")}
            </div>
            <div className="tool-stat-label">Timestamp (milliseconds)</div>
            <button
              className={copied === "mil" ? "btn btn-success" : "btn"}
              type="button"
              onClick={() => doCopy("mil", dateResult.millis)}
            >
              {copied === "mil" ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      {dateResult.empty ? (
        <p className="tool-note">
          Pick a date and time above to get its Unix timestamp.
        </p>
      ) : null}

      <p className="tool-note">
        The Unix timestamp is the number of seconds since 00:00:00 UTC on 1
        January 1970 (the &ldquo;epoch&rdquo;), not counting leap seconds.
        Everything here converts instantly in your browser &mdash; nothing is
        sent to a server.
      </p>
    </div>
  );
}
