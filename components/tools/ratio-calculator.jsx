"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(n, maxDecimals = 6) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(maxDecimals));
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
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

// Reduce a ratio A:B to lowest whole-number terms, coping with decimals.
function simplifyRatio(a, b) {
  if (a === 0 && b === 0) return null;
  // Counting decimal places off String(n) read 0 places for exponent-form
  // values (0.0000001 prints as "1e-7"), so tiny decimals scaled by 1 and
  // rounded straight to 0:1. Grow the scale until both sides are whole
  // numbers instead, capped so the products stay inside safe-integer range.
  let scale = 1;
  while (
    scale < 1e9 &&
    (!Number.isInteger(a * scale) || !Number.isInteger(b * scale))
  ) {
    scale *= 10;
  }
  let ia = Math.round(a * scale);
  let ib = Math.round(b * scale);
  const g = gcd(ia, ib);
  if (g > 0) {
    ia = ia / g;
    ib = ib / g;
  }
  return { a: ia, b: ib };
}

const PROPORTION_KEYS = ["a", "b", "c", "d"];

export default function RatioCalculator() {
  const [mode, setMode] = useState("solve"); // "solve" | "simplify"

  // Proportion solver: A:B = C:D
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [d, setD] = useState("");

  // Simplify ratio
  const [sa, setSa] = useState("");
  const [sb, setSb] = useState("");

  const [copied, setCopied] = useState("");

  const solveResult = useMemo(() => {
    const values = {
      a: toNumber(a),
      b: toNumber(b),
      c: toNumber(c),
      d: toNumber(d),
    };
    const blanks = PROPORTION_KEYS.filter((k) => values[k] === null);

    if (blanks.length === PROPORTION_KEYS.length) {
      return { status: "empty" };
    }
    if (blanks.length === 0) {
      // All four filled — verify whether the proportion holds.
      // Compare cross-products with a relative tolerance. Exact === declared
      // true proportions false: 0.1:0.3 = 0.2:0.6 gives 0.06 vs
      // 0.06000000000000001 in binary floating point.
      const lhs = values.a * values.d;
      const rhs = values.b * values.c;
      const holds = Math.abs(lhs - rhs) <= 1e-9 * Math.max(1, Math.abs(lhs), Math.abs(rhs));
      return { status: "full", holds, values };
    }
    if (blanks.length > 1) {
      return { status: "need-more", missing: blanks.length };
    }

    const missing = blanks[0];
    let solved;
    let divisor;
    if (missing === "a") {
      // A = B * C / D
      divisor = values.d;
      if (divisor === 0) {
        return { status: "divzero", label: "D" };
      }
      solved = (values.b * values.c) / divisor;
    } else if (missing === "b") {
      // B = A * D / C
      divisor = values.c;
      if (divisor === 0) {
        return { status: "divzero", label: "C" };
      }
      solved = (values.a * values.d) / divisor;
    } else if (missing === "c") {
      // C = A * D / B
      divisor = values.b;
      if (divisor === 0) {
        return { status: "divzero", label: "B" };
      }
      solved = (values.a * values.d) / divisor;
    } else {
      // D = B * C / A
      divisor = values.a;
      if (divisor === 0) {
        return { status: "divzero", label: "A" };
      }
      solved = (values.b * values.c) / divisor;
    }

    const full = { ...values, [missing]: solved };
    return { status: "solved", missing, solved, values: full };
  }, [a, b, c, d]);

  const simplifyResult = useMemo(() => {
    const na = toNumber(sa);
    const nb = toNumber(sb);
    if (na === null || nb === null) {
      return { status: "empty" };
    }
    if (na === 0 && nb === 0) {
      return { status: "error", message: "Enter a non-zero value for at least one side." };
    }
    const simplified = simplifyRatio(na, nb);
    const decimal = nb !== 0 ? na / nb : null;
    const percent = nb !== 0 ? (na / nb) * 100 : null;
    const perOneRight = nb !== 0 ? na / nb : null; // n : 1
    const perOneLeft = na !== 0 ? nb / na : null; // 1 : n
    return {
      status: "ok",
      simplified,
      decimal,
      percent,
      perOneRight,
      perOneLeft,
      na,
      nb,
    };
  }, [sa, sb]);

  const copy = async (key, text) => {
    try {
      await copyText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      // Clipboard unavailable — ignore silently.
    }
  };

  const loadSolveExample = () => {
    setA("3");
    setB("4");
    setC("15");
    setD("");
  };

  const clearSolve = () => {
    setA("");
    setB("");
    setC("");
    setD("");
  };

  const loadSimplifyExample = () => {
    setSa("1920");
    setSb("1080");
  };

  const clearSimplify = () => {
    setSa("");
    setSb("");
  };

  const solvedRatioText =
    solveResult.status === "solved" || solveResult.status === "full"
      ? `${formatNumber(solveResult.values.a)} : ${formatNumber(
          solveResult.values.b
        )} = ${formatNumber(solveResult.values.c)} : ${formatNumber(
          solveResult.values.d
        )}`
      : "";

  const simplifiedText =
    simplifyResult.status === "ok" && simplifyResult.simplified
      ? `${formatNumber(simplifyResult.simplified.a)} : ${formatNumber(
          simplifyResult.simplified.b
        )}`
      : "";

  return (
    <div className="tool">
      <div className="tool-actions" role="group" aria-label="Calculator mode">
        <button
          type="button"
          className={"btn" + (mode === "solve" ? " btn-primary" : "")}
          aria-pressed={mode === "solve"}
          onClick={() => setMode("solve")}
        >
          Solve a proportion
        </button>
        <button
          type="button"
          className={"btn" + (mode === "simplify" ? " btn-primary" : "")}
          aria-pressed={mode === "simplify"}
          onClick={() => setMode("simplify")}
        >
          Simplify a ratio
        </button>
      </div>

      {mode === "solve" ? (
        <>
          <p className="tool-note">
            Enter three values in <strong>A : B = C : D</strong> and leave exactly one
            box blank. The missing value is solved instantly.
          </p>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ratio-a">
                  A
                </label>
                <input
                  id="ratio-a"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 3"
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ratio-b">
                  B
                </label>
                <input
                  id="ratio-b"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 4"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ratio-c">
                  C
                </label>
                <input
                  id="ratio-c"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 15"
                  value={c}
                  onChange={(e) => setC(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ratio-d">
                  D
                </label>
                <input
                  id="ratio-d"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="leave blank to solve"
                  value={d}
                  onChange={(e) => setD(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <button type="button" className="btn" onClick={loadSolveExample}>
              Load example
            </button>
            <button
              type="button"
              className="btn"
              onClick={clearSolve}
              disabled={!a && !b && !c && !d}
            >
              Clear
            </button>
          </div>

          {solveResult.status === "empty" && (
            <p className="tool-note">
              Fill any three boxes and leave one blank — the answer appears here.
            </p>
          )}

          {solveResult.status === "need-more" && (
            <p className="tool-note">
              Leave exactly one box blank. {solveResult.missing} boxes are empty
              right now.
            </p>
          )}

          {solveResult.status === "divzero" && (
            <p className="tool-error" role="alert">
              Can't solve — that would divide by zero because {solveResult.label} is 0.
            </p>
          )}

          {solveResult.status === "full" && (
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">
                All four filled — {solveResult.holds ? "this proportion is true" : "this proportion is false"}
              </p>
              <div className="tool-result-value">{solvedRatioText}</div>
              <p className="tool-note">
                {solveResult.holds
                  ? "A × D equals B × C, so the ratios are equal. Clear one box to solve for it instead."
                  : "A × D does not equal B × C, so the ratios are not equal. Clear one box to solve for the value that would balance them."}
              </p>
            </div>
          )}

          {solveResult.status === "solved" && (
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">
                {solveResult.missing.toUpperCase()} =
              </p>
              <div className="tool-result-value">
                {formatNumber(solveResult.solved)}
              </div>
              <p className="tool-note">{solvedRatioText}</p>
              <div className="tool-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    copy("solve", formatNumber(solveResult.solved))
                  }
                >
                  {copied === "solve" ? "Copied!" : "Copy answer"}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="tool-note">
            Enter a ratio as <strong>A : B</strong> to reduce it to its simplest
            whole-number form, with its decimal value and percentage.
          </p>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="simplify-a">
                  A (first term)
                </label>
                <input
                  id="simplify-a"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 1920"
                  value={sa}
                  onChange={(e) => setSa(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="simplify-b">
                  B (second term)
                </label>
                <input
                  id="simplify-b"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 1080"
                  value={sb}
                  onChange={(e) => setSb(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <button type="button" className="btn" onClick={loadSimplifyExample}>
              Load example
            </button>
            <button
              type="button"
              className="btn"
              onClick={clearSimplify}
              disabled={!sa && !sb}
            >
              Clear
            </button>
          </div>

          {simplifyResult.status === "empty" && (
            <p className="tool-note">
              Enter both terms of your ratio and the simplified form appears here.
            </p>
          )}

          {simplifyResult.status === "error" && (
            <p className="tool-error" role="alert">
              {simplifyResult.message}
            </p>
          )}

          {simplifyResult.status === "ok" && (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">Simplified ratio</p>
                <div className="tool-result-value">{simplifiedText}</div>
                <div className="tool-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => copy("simplify", simplifiedText)}
                  >
                    {copied === "simplify" ? "Copied!" : "Copy ratio"}
                  </button>
                </div>
              </div>

              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {simplifyResult.decimal === null
                      ? "—"
                      : formatNumber(simplifyResult.decimal)}
                  </div>
                  <div className="tool-stat-label">Decimal (A ÷ B)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {simplifyResult.percent === null
                      ? "—"
                      : formatNumber(simplifyResult.percent, 4) + "%"}
                  </div>
                  <div className="tool-stat-label">Percentage</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {simplifyResult.perOneRight === null
                      ? "—"
                      : formatNumber(simplifyResult.perOneRight, 4) + " : 1"}
                  </div>
                  <div className="tool-stat-label">Per one (n : 1)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {simplifyResult.perOneLeft === null
                      ? "—"
                      : "1 : " + formatNumber(simplifyResult.perOneLeft, 4)}
                  </div>
                  <div className="tool-stat-label">Per one (1 : n)</div>
                </div>
              </div>

              {simplifyResult.nb === 0 && (
                <p className="tool-note">
                  The second term is 0, so the decimal and percentage are undefined
                  (division by zero).
                </p>
              )}
            </>
          )}
        </>
      )}

      <p className="tool-note">
        Everything runs entirely in your browser — nothing you type is uploaded.
      </p>
    </div>
  );
}
