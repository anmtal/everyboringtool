"use client";

import { useMemo, useState } from "react";

// A curated list of common IANA time zones with friendly labels.
const ZONES = [
  { id: "UTC", label: "UTC — Coordinated Universal Time" },
  { id: "Pacific/Honolulu", label: "Honolulu (Hawaii)" },
  { id: "America/Anchorage", label: "Anchorage (Alaska)" },
  { id: "America/Los_Angeles", label: "Los Angeles (US Pacific)" },
  { id: "America/Denver", label: "Denver (US Mountain)" },
  { id: "America/Chicago", label: "Chicago (US Central)" },
  { id: "America/New_York", label: "New York (US Eastern)" },
  { id: "America/Mexico_City", label: "Mexico City" },
  { id: "America/Sao_Paulo", label: "São Paulo" },
  { id: "Europe/London", label: "London (UK)" },
  { id: "Europe/Paris", label: "Paris" },
  { id: "Europe/Berlin", label: "Berlin" },
  { id: "Europe/Moscow", label: "Moscow" },
  { id: "Africa/Johannesburg", label: "Johannesburg" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Asia/Kolkata", label: "Mumbai / Kolkata (India)" },
  { id: "Asia/Dhaka", label: "Dhaka" },
  { id: "Asia/Bangkok", label: "Bangkok" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Asia/Shanghai", label: "Beijing / Shanghai" },
  { id: "Asia/Tokyo", label: "Tokyo" },
  { id: "Asia/Seoul", label: "Seoul" },
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "Pacific/Auckland", label: "Auckland" },
];

const ZONE_IDS = ZONES.map((z) => z.id);

function labelFor(id) {
  const z = ZONES.find((zone) => zone.id === id);
  return z ? z.label : id;
}

// Offset (in ms) of a zone at a specific UTC instant. Positive = east of UTC.
function getOffsetMs(instantMs, zone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(instantMs));
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // some engines emit 24 for midnight
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - instantMs;
}

// Convert a wall-clock time that is understood to be in `zone` to a real UTC instant.
function wallClockToInstant(y, mo, d, h, mi, zone) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const o1 = getOffsetMs(guess, zone);
  let utc = guess - o1;
  // Re-check once to settle across DST boundaries.
  const o2 = getOffsetMs(utc, zone);
  if (o2 !== o1) utc = guess - o2;
  return utc;
}

// Parse "YYYY-MM-DDTHH:mm" (seconds optional) from a datetime-local input.
function parseLocalInput(value) {
  if (!value) return null;
  const m = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return { y, mo, d, h, mi };
}

// Current wall clock in a zone, as a "YYYY-MM-DDTHH:mm" string for the input.
function nowInZone(zone) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = dtf.formatToParts(new Date());
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    let hour = map.hour;
    if (hour === "24") hour = "00";
    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
  } catch (e) {
    return "";
  }
}

function detectDefaultZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && ZONE_IDS.includes(tz)) return tz;
  } catch (e) {
    /* ignore */
  }
  return "UTC";
}

function formatInstant(instantMs, zone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return dtf.format(new Date(instantMs));
}

function format24(instantMs, zone) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return dtf.format(new Date(instantMs));
}

function formatOffset(ms) {
  const sign = ms < 0 ? "-" : "+";
  const abs = Math.abs(ms);
  const totalMin = Math.round(abs / 60000);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `UTC${sign}${hh}${mm ? ":" + String(mm).padStart(2, "0") : ""}`;
}

function diffText(hours) {
  if (hours === 0) return "Both zones are at the same time.";
  const abs = Math.abs(hours);
  const rounded = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  const unit = abs === 1 ? "hour" : "hours";
  const dir = hours > 0 ? "ahead of" : "behind";
  return `The target is ${rounded} ${unit} ${dir} the source.`;
}

export default function TimeZoneConverter() {
  const initialSource = useMemo(detectDefaultZone, []);
  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState(
    initialSource === "UTC" ? "America/New_York" : "UTC"
  );
  const [dt, setDt] = useState(() => nowInZone(initialSource));

  const parsed = parseLocalInput(dt);

  const result = useMemo(() => {
    if (!parsed) return null;
    try {
      const instant = wallClockToInstant(
        parsed.y,
        parsed.mo,
        parsed.d,
        parsed.h,
        parsed.mi,
        source
      );
      if (!Number.isFinite(instant)) return null;
      const srcOffset = getOffsetMs(instant, source);
      const tgtOffset = getOffsetMs(instant, target);
      return {
        instant,
        sourceText: formatInstant(instant, source),
        targetText: formatInstant(instant, target),
        target24: format24(instant, target),
        source24: format24(instant, source),
        utcText: formatInstant(instant, "UTC"),
        srcOffset: formatOffset(srcOffset),
        tgtOffset: formatOffset(tgtOffset),
        diffHours: (tgtOffset - srcOffset) / 3600000,
      };
    } catch (e) {
      return null;
    }
  }, [parsed, source, target]);

  const invalid = dt && !parsed;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="tz-datetime">
            Date &amp; time
          </label>
          <input
            className="tool-input"
            id="tz-datetime"
            type="datetime-local"
            value={dt}
            onChange={(e) => setDt(e.target.value)}
          />
          <p className="tool-note">
            Enter the wall-clock time as it reads in the source zone.
          </p>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tz-source">
              From (source zone)
            </label>
            <select
              className="tool-select"
              id="tz-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tz-target">
              To (target zone)
            </label>
            <select
              className="tool-select"
              id="tz-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setDt(nowInZone(source))}
          >
            Use current time
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSource(target);
              setTarget(source);
            }}
          >
            Swap zones
          </button>
        </div>
      </div>

      {invalid && (
        <p className="tool-error" role="alert">
          Please enter a valid date and time.
        </p>
      )}

      {!dt && !invalid && (
        <p className="tool-note">Pick a date and time to see the conversion.</p>
      )}

      {result && !invalid && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Source · {labelFor(source)}
            </p>
            <div className="tool-result-value">{result.sourceText}</div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Target · {labelFor(target)}
            </p>
            <div className="tool-result-value">{result.targetText}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.srcOffset}</div>
              <div className="tool-stat-label">Source offset</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.tgtOffset}</div>
              <div className="tool-stat-label">Target offset</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.target24}</div>
              <div className="tool-stat-label">Target (24-hour)</div>
            </div>
          </div>

          <p className="tool-note">{diffText(result.diffHours)}</p>
          <p className="tool-note">UTC equivalent: {result.utcText}</p>
        </>
      )}
    </div>
  );
}
