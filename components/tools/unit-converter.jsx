"use client";

import { useState, useMemo } from "react";

const CATEGORIES = {
  Length: {
    base: "Meter",
    units: {
      Millimeter: 0.001,
      Centimeter: 0.01,
      Meter: 1,
      Kilometer: 1000,
      Inch: 0.0254,
      Foot: 0.3048,
      Yard: 0.9144,
      Mile: 1609.344,
    },
  },
  Weight: {
    base: "Gram",
    units: {
      Milligram: 0.001,
      Gram: 1,
      Kilogram: 1000,
      "Metric Ton": 1000000,
      Ounce: 28.349523125,
      Pound: 453.59237,
      Stone: 6350.29318,
    },
  },
  Temperature: {
    base: "Celsius",
    units: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 },
  },
  Volume: {
    base: "Liter",
    units: {
      Milliliter: 0.001,
      Liter: 1,
      "Cubic Meter": 1000,
      Teaspoon: 0.00492892,
      Tablespoon: 0.0147868,
      "Fluid Ounce": 0.0295735,
      Cup: 0.236588,
      Gallon: 3.785411784,
    },
  },
  Area: {
    base: "Square Meter",
    units: {
      "Square Millimeter": 0.000001,
      "Square Centimeter": 0.0001,
      "Square Meter": 1,
      Hectare: 10000,
      "Square Kilometer": 1000000,
      "Square Foot": 0.09290304,
      Acre: 4046.8564224,
      "Square Mile": 2589988.110336,
    },
  },
  Speed: {
    base: "Meter/second",
    units: {
      "Meter/second": 1,
      "Kilometer/hour": 0.277777778,
      "Mile/hour": 0.44704,
      "Foot/second": 0.3048,
      Knot: 0.514444444,
    },
  },
  Data: {
    base: "Byte",
    units: {
      Bit: 0.125,
      Byte: 1,
      Kilobyte: 1024,
      Megabyte: 1048576,
      Gigabyte: 1073741824,
      Terabyte: 1099511627776,
      Petabyte: 1125899906842624,
    },
  },
};

const CATEGORY_NAMES = Object.keys(CATEGORIES);

// Convert a value from one temperature unit to another via Celsius.
function convertTemperature(value, from, to) {
  let celsius;
  if (from === "Celsius") celsius = value;
  else if (from === "Fahrenheit") celsius = (value - 32) * (5 / 9);
  else celsius = value - 273.15; // Kelvin

  if (to === "Celsius") return celsius;
  if (to === "Fahrenheit") return celsius * (9 / 5) + 32;
  return celsius + 273.15; // Kelvin
}

// Format a number readably: trims trailing zeros, uses thousands separators,
// and falls back to exponential notation for very large or very small values.
function formatNumber(n) {
  if (!isFinite(n)) return "-";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) {
    return n.toExponential(6).replace(/\.?0+e/, "e");
  }

  const rounded = Number(n.toFixed(6));
  const [intPart, decPart] = String(rounded).split(".");
  const withSeparators = Number(intPart).toLocaleString("en-US");
  return decPart ? `${withSeparators}.${decPart}` : withSeparators;
}

export default function UnitConverter() {
  const [category, setCategory] = useState("Length");
  const [fromUnit, setFromUnit] = useState("Meter");
  const [toUnit, setToUnit] = useState("Foot");
  const [value, setValue] = useState("1");

  const unitNames = useMemo(
    () => Object.keys(CATEGORIES[category].units),
    [category]
  );

  function handleCategoryChange(next) {
    const names = Object.keys(CATEGORIES[next].units);
    setCategory(next);
    setFromUnit(names[0]);
    setToUnit(names[1] || names[0]);
  }

  function swapUnits() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }

  const result = useMemo(() => {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    const num = Number(trimmed);
    if (!isFinite(num)) return null;

    if (category === "Temperature") {
      return convertTemperature(num, fromUnit, toUnit);
    }

    const units = CATEGORIES[category].units;
    const fromFactor = units[fromUnit];
    const toFactor = units[toUnit];
    if (fromFactor == null || toFactor == null) return null;

    return (num * fromFactor) / toFactor;
  }, [value, category, fromUnit, toUnit]);

  const hasError = value.trim() !== "" && result === null;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="uc-category">
            Category
          </label>
          <select
            className="tool-select"
            id="uc-category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {CATEGORY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="uc-value">
            Value
          </label>
          <input
            className="tool-input"
            id="uc-value"
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter a number"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="uc-from">
              From
            </label>
            <select
              className="tool-select"
              id="uc-from"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
            >
              {unitNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="uc-to">
              To
            </label>
            <select
              className="tool-select"
              id="uc-to"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
            >
              {unitNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-actions">
          <button type="button" className="btn" onClick={swapUnits}>
            Swap units
          </button>
        </div>
      </div>

      {hasError && <p className="tool-error">Please enter a valid number.</p>}

      <div className="tool-result">
        <p className="tool-result-label">
          {formatNumber(Number(value.trim() || 0))} {fromUnit} =
        </p>
        <div className="tool-result-value">
          {result === null ? "-" : `${formatNumber(result)} ${toUnit}`}
        </div>
      </div>

      <p className="tool-note">
        Conversions update live as you type. Temperature uses exact C/F/K
        formulas; all other categories convert through a shared base unit.
      </p>
    </div>
  );
}
