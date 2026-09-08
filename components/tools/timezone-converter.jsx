"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Curated list of common IANA time zones with friendly labels.
const ZONES = [
  { id: "Pacific/Honolulu", label: "Honolulu (HST)" },
  { id: "America/Anchorage", label: "Anchorage (AKT)" },
  { id: "America/Los_Angeles", label: "Los Angeles / Pacific (PT)" },
  { id: "America/Denver", label: "Denver / Mountain (MT)" },
  { id: "America/Phoenix", label: "Phoenix (MST, no DST)" },
  { id: "America/Chicago", label: "Chicago / Central (CT)" },
  { id: "America/New_York", label: "New York / Eastern (ET)" },
  { id: "America/Toronto", label: "Toronto (ET)" },
  { id: "America/Mexico_City", label: "Mexico City (CST)" },
  { id: "America/Bogota", label: "Bogota (COT)" },
  { id: "America/Sao_Paulo", label: "Sao Paulo (BRT)" },
  { id: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
  { id: "UTC", label: "UTC (Coordinated Universal Time)" },
  { id: "Europe/London", label: "London (GMT/BST)" },
  { id: "Europe/Dublin", label: "Dublin (GMT/IST)" },
  { id: "Europe/Lisbon", label: "Lisbon (WET)" },
  { id: "Europe/Paris", label: "Paris (CET)" },
  { id: "Europe/Berlin", label: "Berlin (CET)" },
  { id: "Europe/Madrid", label: "Madrid (CET)" },
  { id: "Europe/Rome", label: "Rome (CET)" },
  { id: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { id: "Europe/Athens", label: "Athens (EET)" },
  { id: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { id: "Europe/Moscow", label: "Moscow (MSK)" },
  { id: "Africa/Cairo", label: "Cairo (EET)" },
  { id: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { id: "Africa/Lagos", label: "Lagos (WAT)" },
  { id: "Asia/Dubai", label: "Dubai (GST)" },
  { id: "Asia/Karachi", label: "Karachi (PKT)" },
  { id: "Asia/Kolkata", label: "Kolkata / India (IST)" },
  { id: "Asia/Dhaka", label: "Dhaka (BST)" },
  { id: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { id: "Asia/Singapore", label: "Singapore (SGT)" },
  { id: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { id: "Asia/Shanghai", label: "Shanghai / Beijing (CST)" },
  { id: "Asia/Tokyo", label: "Tokyo (JST)" },
  { id: "Asia/Seoul", label: "Seoul (KST)" },
  { id: "Australia/Perth", label: "Perth (AWST)" },
  { id: "Australia/Sydney", label: "Sydney (AET)" },
  { id: "Pacific/Auckland", label: "Auckland (NZT)" },
];

// Zones shown in the "world clock" grid for quick reference.
const WORLD_CLOCK = [
  "America/Los_Angeles",
  "America/New_York",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function detectZone() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Only use the detected zone if it is one of the options we render,
    // otherwise the <select> would show a mismatched value.
    if (z && ZONES.some((zone) => zone.id === z)) return z;
    return "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function zoneLabel(id) {
  const found = ZONES.find((z) => z.id === id);
  return found ? found.label : id;
}

function todayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nowTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${mi}`;
}

// Offset (ms) of a time zone at a given UTC instant: how far ahead of UTC.
function tzOffset(timeZone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - date.getTime();
}

// Convert a wall-clock time in a source zone into the true UTC instant.
function zonedWallTimeToInstant(y, mo, d, h, mi, timeZone) {
  const localAsUTC = Date.UTC(y, mo - 1, d, h, mi, 0);
  // First guess using the offset at the naive instant, then refine once for DST.
  let offset = tzOffset(timeZone, new Date(localAsUTC));
  let instant = localAsUTC - offset;
  offset = tzOffset(timeZone, new Date(instant));
  instant = localAsUTC - offset;
  return new Date(instant);
}

function formatInZone(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return dtf.format(instant);
}

function formatTime24(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return dtf.format(instant);
}

function formatTime12(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return dtf.format(instant);
}

function formatDayShort(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return dtf.format(instant);
}

function offsetLabel(ms) {
  const sign = ms >= 0 ? "+" : "-";
  const abs = Math.abs(ms);
  const totalMin = Math.round(abs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function diffLabel(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin === 0) return "Same time";
  const ahead = totalMin > 0;
  const abs = Math.abs(totalMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m > 0) parts.push(`${m} min`);
  return `${parts.join(" ")} ${ahead ? "ahead" : "behind"}`;
}

export default function TimezoneConverter() {
  const [fromZone, setFromZone] = useState(detectZone());
  const [toZone, setToZone] = useState("Europe/London");
  const [date, setDate] = useState(todayDate());
  const [time, setTime] = useState(nowTime());
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const dParts = String(date).split("-");
    const tParts = String(time).split(":");
    if (dParts.length !== 3 || tParts.length < 2) return { status: "empty" };
    const y = Number(dParts[0]);
    const mo = Number(dParts[1]);
    const d = Number(dParts[2]);
    const h = Number(tParts[0]);
    const mi = Number(tParts[1]);
    if (![y, mo, d, h, mi].every(Number.isFinite)) return { status: "invalid" };

    const instant = zonedWallTimeToInstant(y, mo, d, h, mi, fromZone);
    if (Number.isNaN(instant.getTime())) return { status: "invalid" };

    const fromOff = tzOffset(fromZone, instant);
    const toOff = tzOffset(toZone, instant);

    return {
      status: "ok",
      instant,
      fromOff,
      toOff,
      diff: toOff - fromOff,
    };
  }, [date, time, fromZone, toZone]);

  function swapZones() {
    setFromZone(toZone);
    setToZone(fromZone);
  }

  function setToNow() {
    setDate(todayDate());
    setTime(nowTime());
  }

  const copyValue =
    result.status === "ok"
      ? `${formatInZone(result.instant, fromZone)} (${zoneLabel(fromZone)}) = ${formatInZone(
          result.instant,
          toZone
        )} (${zoneLabel(toZone)})`
      : "";

  async function handleCopy() {
    if (!copyValue) return;
    await copyText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tz-date">
              Date
            </label>
            <input
              id="tz-date"
              className="tool-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tz-time">
              Time
            </label>
            <input
              id="tz-time"
              className="tool-input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tz-from">
              From time zone
            </label>
            <select
              id="tz-from"
              className="tool-select"
              value={fromZone}
              onChange={(e) => setFromZone(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tz-to">
              To time zone
            </label>
            <select
              id="tz-to"
              className="tool-select"
              value={toZone}
              onChange={(e) => setToZone(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={swapZones}>
          Swap zones
        </button>
        <button type="button" className="btn" onClick={setToNow}>
          Use current time
        </button>
        <button
          type="button"
          className={copied ? "btn btn-success" : "btn btn-primary"}
          onClick={handleCopy}
          disabled={result.status !== "ok"}
        >
          {copied ? "Copied!" : "Copy result"}
        </button>
      </div>

      {result.status === "invalid" && (
        <p className="tool-error" role="alert">
          Please pick a valid date and time.
        </p>
      )}

      {result.status !== "ok" ? (
        <p className="tool-note">
          Pick a date, a time, and two zones to convert between. The tool assumes
          the time you enter is the local wall-clock time in the "From" zone.
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              {formatInZone(result.instant, fromZone)} in {zoneLabel(fromZone)} is
            </div>
            <div className="tool-result-value">
              {formatInZone(result.instant, toZone)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatTime12(result.instant, toZone)}
              </div>
              <div className="tool-stat-label">
                {zoneLabel(toZone)} — {formatDayShort(result.instant, toZone)}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{diffLabel(result.diff)}</div>
              <div className="tool-stat-label">
                Destination vs. source
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {offsetLabel(result.fromOff)} → {offsetLabel(result.toOff)}
              </div>
              <div className="tool-stat-label">UTC offsets on this date</div>
            </div>
          </div>

          <div className="tool-result-label" style={{ marginTop: "1rem" }}>
            World clock at this moment
          </div>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            {WORLD_CLOCK.map((z) => (
              <div className="tool-stat" key={z}>
                <div className="tool-stat-num">
                  {formatTime24(result.instant, z)}
                </div>
                <div className="tool-stat-label">
                  {zoneLabel(z)} · {formatDayShort(result.instant, z)}
                </div>
              </div>
            ))}
          </div>

          <p className="tool-note">
            Offsets and daylight-saving rules come from your browser's built-in
            time-zone database (via the Intl API), so conversions stay correct
            across DST changes on the date you choose. Everything runs privately in
            your browser — nothing is uploaded.
          </p>
        </>
      )}
    </div>
  );
}
