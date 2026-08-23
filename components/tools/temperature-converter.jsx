"use client";

import { useState, useMemo } from "react";

const UNITS = [
  { value: "C", label: "Celsius (°C)", symbol: "°C" },
  { value: "F", label: "Fahrenheit (°F)", symbol: "°F" },
  { value: "K", label: "Kelvin (K)", symbol: "K" },
];

const SYMBOL = { C: "°C", F: "°F", K: "K" };

// Convert any supported unit to Celsius (exact formulas).
function toCelsius(value, unit) {
  if (unit === "C") return value;
  if (unit === "F") return (value - 32) * (5 / 9);
  if (unit === "K") return value - 273.15;
  return value;
}

// Convert a Celsius value to any supported unit (exact formulas).
function fromCelsius(celsius, unit) {
  if (unit === "C") return celsius;
  if (unit === "F") return celsius * (9 / 5) + 32;
  if (unit === "K") return celsius + 273.15;
  return celsius;
}

function convert(value, from, to) {
  return fromCelsius(toCelsius(value, from), to);
}

// Trim floating-point noise, keep readable precision, no trailing zeros.
function formatTemp(n) {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 1e6) / 1e6;
  if (Object.is(rounded, -0)) return "0";
  let str = rounded.toFixed(6);
  str = str.replace(/\.?0+$/, "");
  const [intPart, decPart] = str.split(".");
  const withSep = Number(intPart).toLocaleString("en-US");
  return decPart ? `${withSep}.${decPart}` : withSep;
}

export default function TemperatureConverter() {
  const [rawValue, setRawValue] = useState("");
  const [from, setFrom] = useState("C");
  const [to, setTo] = useState("F");

  const parsed = useMemo(() => {
    const trimmed = rawValue.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "+" || trimmed === ".") {
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : NaN;
  }, [rawValue]);

  const hasInput = rawValue.trim() !== "";
  const isInvalid = hasInput && (parsed === null || Number.isNaN(parsed));
  const isValid = parsed !== null && !Number.isNaN(parsed);

  const resultValue = isValid ? convert(parsed, from, to) : null;

  const equivalents = useMemo(() => {
    if (!isValid) return null;
    return {
      C: convert(parsed, from, "C"),
      F: convert(parsed, from, "F"),
      K: convert(parsed, from, "K"),
    };
  }, [isValid, parsed, from]);

  function swapUnits() {
    setFrom(to);
    setTo(from);
  }

  const fromSymbol = SYMBOL[from];
  const toSymbol = SYMBOL[to];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="temp-value">
            Temperature value
          </label>
          <input
            id="temp-value"
            className="tool-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 100"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="temp-from">
              From
            </label>
            <select
              id="temp-from"
              className="tool-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="temp-to">
              To
            </label>
            <select
              id="temp-to"
              className="tool-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={swapUnits}>
          Swap units
        </button>
      </div>

      {isInvalid && (
        <p className="tool-error">Enter a valid number to convert.</p>
      )}

      <div className="tool-result">
        <div className="tool-result-label">
          {isValid
            ? `${formatTemp(parsed)} ${fromSymbol} = ${toSymbol}`
            : "Result"}
        </div>
        <div className="tool-result-value">
          {isValid ? `${formatTemp(resultValue)} ${toSymbol}` : "—"}
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {equivalents ? formatTemp(equivalents.C) : "—"}
          </div>
          <div className="tool-stat-label">Celsius (°C)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {equivalents ? formatTemp(equivalents.F) : "—"}
          </div>
          <div className="tool-stat-label">Fahrenheit (°F)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {equivalents ? formatTemp(equivalents.K) : "—"}
          </div>
          <div className="tool-stat-label">Kelvin (K)</div>
        </div>
      </div>

      <p className="tool-note">
        Conversions use exact formulas: °F = °C × 9/5 + 32, and K = °C + 273.15.
        Everything updates live as you type.
      </p>
    </div>
  );
}
