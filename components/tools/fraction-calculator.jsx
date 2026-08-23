"use client";

import { useState, useMemo } from "react";

function parseInteger(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function reduce(num, den) {
  // Normalize sign so the denominator is always positive.
  if (den < 0) {
    num = -num;
    den = -den;
  }
  if (num === 0) return { num: 0, den: 1 };
  const divisor = gcd(num, den) || 1;
  return { num: num / divisor, den: den / divisor };
}

const OPERATIONS = [
  { value: "add", label: "Add (+)", symbol: "+" },
  { value: "subtract", label: "Subtract (−)", symbol: "−" },
  { value: "multiply", label: "Multiply (×)", symbol: "×" },
  { value: "divide", label: "Divide (÷)", symbol: "÷" },
];

function formatDecimal(num, den) {
  if (den === 0) return "—";
  const value = num / den;
  if (Number.isInteger(value)) return String(value);
  // Show a sensible number of decimals, trimming trailing zeros.
  const rounded = Number(value.toFixed(6));
  return String(rounded);
}

function formatMixed(num, den) {
  if (den === 0) return "—";
  if (num === 0) return "0";
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  const whole = Math.floor(absNum / den);
  const remainder = absNum % den;
  if (whole === 0) return `${sign}${remainder}/${den}`;
  if (remainder === 0) return `${sign}${whole}`;
  return `${sign}${whole} ${remainder}/${den}`;
}

function formatImproper(num, den) {
  if (den === 0) return "—";
  if (den === 1) return String(num);
  return `${num}/${den}`;
}

export default function FractionCalculator() {
  const [n1, setN1] = useState("");
  const [d1, setD1] = useState("");
  const [op, setOp] = useState("add");
  const [n2, setN2] = useState("");
  const [d2, setD2] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const num1 = parseInteger(n1);
    const den1 = parseInteger(d1);
    const num2 = parseInteger(n2);
    const den2 = parseInteger(d2);

    // Wait until every field has a valid integer before computing.
    if (num1 === null || den1 === null || num2 === null || den2 === null) {
      return null;
    }
    if (den1 === 0 || den2 === 0) {
      return { error: "A fraction's denominator cannot be zero." };
    }

    let num;
    let den;
    if (op === "add") {
      num = num1 * den2 + num2 * den1;
      den = den1 * den2;
    } else if (op === "subtract") {
      num = num1 * den2 - num2 * den1;
      den = den1 * den2;
    } else if (op === "multiply") {
      num = num1 * num2;
      den = den1 * den2;
    } else {
      // divide
      if (num2 === 0) {
        return { error: "Cannot divide by zero — the second fraction is 0." };
      }
      num = num1 * den2;
      den = den1 * num2;
    }

    if (den === 0) {
      return { error: "The result is undefined (division by zero)." };
    }

    const reduced = reduce(num, den);
    const activeOp = OPERATIONS.find((o) => o.value === op);
    return {
      num: reduced.num,
      den: reduced.den,
      improper: formatImproper(reduced.num, reduced.den),
      mixed: formatMixed(reduced.num, reduced.den),
      decimal: formatDecimal(reduced.num, reduced.den),
      isWhole: reduced.den === 1,
      expression: `${num1}/${den1} ${activeOp ? activeOp.symbol : ""} ${num2}/${den2}`,
    };
  }, [n1, d1, n2, d2, op]);

  const handleCopy = async () => {
    if (!result || result.error) return;
    const text = `${result.expression} = ${result.improper}${
      result.improper !== result.mixed ? ` = ${result.mixed}` : ""
    } = ${result.decimal}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Clipboard may be unavailable; silently ignore.
    }
  };

  const handleReset = () => {
    setN1("");
    setD1("");
    setN2("");
    setD2("");
    setOp("add");
    setCopied(false);
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="frac-n1">
              First numerator
            </label>
            <input
              className="tool-input"
              id="frac-n1"
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="e.g. 1"
              value={n1}
              onChange={(e) => setN1(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="frac-d1">
              First denominator
            </label>
            <input
              className="tool-input"
              id="frac-d1"
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="e.g. 2"
              value={d1}
              onChange={(e) => setD1(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="frac-op">
            Operation
          </label>
          <select
            className="tool-select"
            id="frac-op"
            value={op}
            onChange={(e) => setOp(e.target.value)}
          >
            {OPERATIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="frac-n2">
              Second numerator
            </label>
            <input
              className="tool-input"
              id="frac-n2"
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="e.g. 3"
              value={n2}
              onChange={(e) => setN2(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="frac-d2">
              Second denominator
            </label>
            <input
              className="tool-input"
              id="frac-d2"
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="e.g. 4"
              value={d2}
              onChange={(e) => setD2(e.target.value)}
            />
          </div>
        </div>
      </div>

      {result && result.error ? (
        <p className="tool-error" role="alert">
          {result.error}
        </p>
      ) : (
        <div className="tool-result">
          <p className="tool-result-label">
            {result ? result.expression + " =" : "Result"}
          </p>
          <div className="tool-result-value">
            {result ? result.improper : "—"}
          </div>
          {result && (
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{result.improper}</div>
                <div className="tool-stat-label">Improper fraction</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{result.mixed}</div>
                <div className="tool-stat-label">
                  {result.isWhole ? "Whole number" : "Mixed number"}
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{result.decimal}</div>
                <div className="tool-stat-label">Decimal</div>
              </div>
            </div>
          )}
        </div>
      )}

      {result && !result.error && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy result"}
          </button>
          <button type="button" className="btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      )}

      <p className="tool-note">
        Enter whole numbers for each numerator and denominator. Results are
        automatically reduced to lowest terms using the greatest common divisor.
      </p>
    </div>
  );
}
