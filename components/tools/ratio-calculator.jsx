"use client";

import { useMemo, useRef, useState } from "react";
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

// Number for the worked steps. No thousands separators: inside "GCD(1920, 1080)"
// a grouping comma would read as a list comma.
function fmtW(n, maxDecimals = 6) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  let rounded = Number(n.toFixed(maxDecimals));
  if (Object.is(rounded, -0)) rounded = 0;
  return rounded.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: maxDecimals,
  });
}

// An operand inside "a × b ÷ c": negatives go in brackets.
function fmtOp(n, maxDecimals = 6) {
  const s = fmtW(n, maxDecimals);
  return n < 0 && s !== "0" ? `(${s})` : s;
}

// True when showing n to maxDecimals places drops digits, so the steps can
// print "≈" instead of a false "=".
function isRounded(n, maxDecimals = 6) {
  return Math.abs(n - Number(n.toFixed(maxDecimals))) > 1e-9;
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

// Reduce a ratio of any number of terms to lowest whole-number terms, coping
// with decimals. Returns null when every term is, or rounds to, zero.
function simplifyTerms(values) {
  if (!values.length || values.every((v) => v === 0)) return null;
  // Counting decimal places off String(n) read 0 places for exponent-form
  // values (0.0000001 prints as "1e-7"), so tiny decimals scaled by 1 and
  // rounded straight to 0:1. Grow the scale until every term is a whole
  // number instead, capped so the products stay inside safe-integer range.
  let scale = 1;
  while (scale < 1e9 && values.some((v) => !Number.isInteger(v * scale))) {
    scale *= 10;
  }
  let scaled = values.map((v) => Math.round(v * scale));
  // More than nine decimal places: the extra digits were rounded off.
  const rounded = values.some((v, i) => Math.abs(v * scale - scaled[i]) > 1e-6);
  // Float noise can push the scale past what the decimals need (1.1 × 10 is
  // 11.000000000000002), so drop shared trailing zeros. The simplified ratio is
  // the same; the shown working just uses the smallest scale (×10, not ×10^9).
  while (scale > 1 && scaled.every((n) => n % 10 === 0)) {
    scaled = scaled.map((n) => n / 10);
    scale /= 10;
  }
  const g = scaled.reduce((acc, n) => gcd(acc, n), 0);
  if (g === 0) return null;
  return { terms: scaled.map((n) => n / g), scaled, scale, g, rounded };
}

// "Multiply by 10 to clear decimals: 25 : 50 · GCD(25, 50) = 25 · 25 ÷ 25 : 50 ÷ 25 = 1 : 2"
function simplifyWorking(s) {
  const steps = [];
  if (s.scale > 1) {
    steps.push(
      `Multiply by ${fmtW(s.scale)} to clear decimals: ${s.scaled.map((n) => fmtW(n)).join(" : ")}`
    );
  }
  const gcdArgs = s.scaled.map((n) => fmtW(Math.abs(n))).join(", ");
  const result = s.terms.map((n) => fmtW(n)).join(" : ");
  if (s.g === 1) {
    steps.push(`GCD(${gcdArgs}) = 1, so ${result} is already in simplest form`);
  } else {
    steps.push(
      `GCD(${gcdArgs}) = ${fmtW(s.g)} · ${s.scaled
        .map((n) => `${fmtOp(n)} ÷ ${fmtW(s.g)}`)
        .join(" : ")} = ${result}`
    );
  }
  return steps.join(" · ");
}

// num/den in lowest terms, e.g. (2, 10) -> "1/5".
function fractionText(num, den) {
  if (num === 0) return "0";
  const g = gcd(num, den) || 1;
  let n = num / g;
  let d = den / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return `${fmtW(n)}/${fmtW(d)}`;
}

// Whole-number split that still adds up to `total` (an integer): floor every
// amount, then hand the leftover units, one each, to the amounts with the
// largest fractional remainders (largest remainder method).
function largestRemainder(amounts, total) {
  const floors = amounts.map((x) => Math.floor(x + 1e-9));
  const leftover = Math.round(total - floors.reduce((acc, x) => acc + x, 0));
  const order = amounts
    .map((x, i) => ({ i, r: x - floors[i] }))
    .sort((p, q) => q.r - p.r || p.i - q.i);
  const out = floors.slice();
  for (let j = 0; j < leftover && j < order.length; j += 1) {
    out[order[j].i] += 1;
  }
  return out;
}

// "100 ml", or "$100" for a lone currency symbol.
function withUnit(text, unit) {
  const u = String(unit || "").trim();
  if (!u) return text;
  if (/^[$€£¥₹]$/.test(u)) return `${u}${text}`;
  return `${text} ${u}`;
}

const ratioText = (terms) => terms.map((n) => formatNumber(n)).join(" : ");

const MIN_TERMS = 2;
const MAX_TERMS = 6;
const LETTERS = ["A", "B", "C", "D", "E", "F"];
const partLabel = (i) => `Part ${i + 1}`;
const letterLabel = (i) => LETTERS[i];

// Common two-part ratios as shares of a total, computed rather than typed in.
const COMMON_RATIOS = [
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 10],
  [2, 1], [2, 3], [3, 1], [3, 2], [3, 4], [4, 1],
];
const REFERENCE_ROWS = COMMON_RATIOS.map(([a, b]) => {
  const sum = a + b;
  return {
    a,
    b,
    shareA: (a / sum) * 100,
    shareB: (b / sum) * 100,
    mlA: (1000 * a) / sum,
    mlB: (1000 * b) / sum,
    ozA: (128 * a) / sum,
    ozB: (128 * b) / sum,
  };
});

const SOLVE_FORMULAS = {
  a: { expr: "B × C ÷ D", keys: ["b", "c", "d"] },
  b: { expr: "A × D ÷ C", keys: ["a", "d", "c"] },
  c: { expr: "A × D ÷ B", keys: ["a", "d", "b"] },
  d: { expr: "B × C ÷ A", keys: ["b", "c", "a"] },
};

const PROPORTION_KEYS = ["a", "b", "c", "d"];

// Solve A : B = C : D for the one blank box, or check all four.
function solveProportion(a, b, c, d) {
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
    const working = `A × D = ${fmtOp(values.a)} × ${fmtOp(values.d)} = ${fmtW(lhs)} · B × C = ${fmtOp(
      values.b
    )} × ${fmtOp(values.c)} = ${fmtW(rhs)} → ${
      holds ? "equal" : `${fmtW(lhs)} ≠ ${fmtW(rhs)}, not equal`
    }`;
    return {
      status: "full",
      holds,
      values,
      working,
      simplestAB: simplifyTerms([values.a, values.b]),
      simplestCD: simplifyTerms([values.c, values.d]),
    };
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
  const f = SOLVE_FORMULAS[missing];
  const [x, y, z] = f.keys.map((k) => values[k]);
  const working = `Cross-multiply: A × D = B × C, so ${missing.toUpperCase()} = ${f.expr} = ${fmtOp(
    x
  )} × ${fmtOp(y)} ÷ ${fmtOp(z)} ${isRounded(solved) ? "≈" : "="} ${fmtW(solved)}`;
  // The pair with both terms typed in gives the exact simplest form; the
  // solved term can be a long decimal.
  const known = missing === "c" || missing === "d" ? [values.a, values.b] : [values.c, values.d];
  return {
    status: "solved",
    missing,
    solved,
    values: full,
    working,
    simplest: simplifyTerms(known),
  };
}

// Simplify a ratio of 2–6 terms (raw input strings).
function simplifyRatio(rawValues) {
  const vals = rawValues.map(toNumber);
  if (vals.some((v) => v === null)) {
    return { status: "empty" };
  }
  if (vals.every((v) => v === 0)) {
    return { status: "error", message: "Enter a non-zero value for at least one term." };
  }
  const s = simplifyTerms(vals);
  if (!s) {
    return {
      status: "error",
      message: "These values are too small to simplify. Use nine or fewer decimal places.",
    };
  }
  const sum = s.terms.reduce((acc, t) => acc + t, 0);
  // Shares of a total only make sense when no term is negative.
  const shares =
    s.terms.every((t) => t >= 0) && sum > 0
      ? s.terms.map((t) => ({ t, frac: fractionText(t, sum), pct: (t / sum) * 100 }))
      : null;
  let pair = null;
  if (vals.length === 2) {
    const [na, nb] = vals;
    pair = {
      na,
      nb,
      decimal: nb !== 0 ? na / nb : null,
      percent: nb !== 0 ? (na / nb) * 100 : null,
      perOneRight: nb !== 0 ? na / nb : null, // n : 1
      perOneLeft: na !== 0 ? nb / na : null, // 1 : n
      fraction: s.terms[1] !== 0 ? fractionText(s.terms[0], s.terms[1]) : null,
    };
  }
  return { status: "ok", s, sum, shares, pair, working: simplifyWorking(s) };
}

// Scale a ratio by a factor, or so one term hits a value, plus the ×1–×10 table.
function scaleRatio(rawValues, scaleMethod, scaleFactor, scaleDir, scaleTargetIdx, scaleTarget) {
  const vals = rawValues.map(toNumber);
  if (vals.some((v) => v === null)) {
    return { status: "empty" };
  }
  if (vals.every((v) => v === 0)) {
    return { status: "error", message: "Enter a non-zero value for at least one term." };
  }
  const simplest = simplifyTerms(vals);
  const inLowest = !!simplest && simplest.terms.every((t, i) => t === vals[i]);
  const rows = [];
  for (let m = 1; m <= 10; m += 1) {
    rows.push({ m, terms: vals.map((v) => v * m) });
  }
  const base = { status: "ok", vals, simplest, inLowest, rows };

  let k;
  let scaled;
  let factorText;
  let working;
  if (scaleMethod === "factor") {
    const f = toNumber(scaleFactor);
    if (f === null) return { ...base, scale: { status: "empty" } };
    if (f <= 0) {
      return {
        ...base,
        scale: { status: "error", message: "The scale factor must be greater than 0." },
      };
    }
    if (scaleDir === "enlarge") {
      k = f;
      scaled = vals.map((v) => v * f);
      factorText = `× ${formatNumber(f)}`;
      working = `× ${fmtW(f)}: ${vals.map((v) => `${fmtOp(v)} × ${fmtOp(f)}`).join(" : ")}`;
    } else {
      k = 1 / f;
      scaled = vals.map((v) => v / f);
      factorText = `÷ ${formatNumber(f)}`;
      working = `÷ ${fmtW(f)}: ${vals.map((v) => `${fmtOp(v)} ÷ ${fmtOp(f)}`).join(" : ")}`;
    }
  } else {
    const idx = Math.min(Number(scaleTargetIdx) || 0, vals.length - 1);
    const target = toNumber(scaleTarget);
    if (target === null) return { ...base, scale: { status: "empty" } };
    const part = vals[idx];
    if (part === 0) {
      return {
        ...base,
        scale: {
          status: "error",
          message: `${partLabel(idx)} is 0, so it can't be scaled to a new value. Pick a part that isn't 0.`,
        },
      };
    }
    k = target / part;
    if (k <= 0) {
      return {
        ...base,
        scale: {
          status: "error",
          message:
            part > 0
              ? "The new value must be greater than 0."
              : `${partLabel(idx)} is negative, so the new value must be negative too.`,
        },
      };
    }
    scaled = vals.map((v, i) => (i === idx ? target : (v * target) / part));
    factorText = `× ${formatNumber(k)}`;
    working = `Scale factor: ${fmtOp(target)} ÷ ${fmtOp(part)} ${isRounded(k) ? "≈" : "="} ${fmtW(
      k
    )} · ${vals.map((v) => `${fmtOp(v)} × ${fmtOp(k)}`).join(" : ")}`;
  }
  const approx = scaled.some((v) => isRounded(v));
  working += ` ${approx ? "≈" : "="} ${scaled.map((v) => fmtW(v)).join(" : ")}`;
  const kInt = Math.round(k);
  const match = Math.abs(k - kInt) < 1e-9 && kInt >= 1 && kInt <= 10 ? kInt : null;
  return {
    ...base,
    scale: { status: "ok", k, scaled, factorText, working, match },
  };
}

// Split a total between the parts of a ratio.
function splitByRatio(rawValues, splitTotal, splitWhole) {
  const vals = rawValues.map(toNumber);
  const total = toNumber(splitTotal);
  if (vals.every((v) => v === null) && total === null) {
    return { status: "empty" };
  }
  // Negative or zero parts make "share of the total" meaningless.
  if (vals.some((v) => v !== null && v <= 0)) {
    return { status: "error", message: "Ratio parts must be positive numbers." };
  }
  if (vals.some((v) => v === null) || total === null) {
    return { status: "empty" };
  }
  if (total <= 0) {
    return { status: "error", message: "The total to split must be greater than 0." };
  }
  const sum = vals.reduce((acc, v) => acc + v, 0);
  const onePart = total / sum;
  const exact = vals.map((v) => (v * total) / sum);
  const shares = vals.map((v) => (v / sum) * 100);
  const wholeTotal = Number.isInteger(total);
  const useWhole = splitWhole && wholeTotal;
  const amounts = useWhole ? largestRemainder(exact, total) : exact;
  return {
    status: "ok",
    vals,
    total,
    sum,
    onePart,
    exact,
    shares,
    amounts,
    useWhole,
    wholeTotal,
    wholeBlocked: splitWhole && !wholeTotal,
    wholeChanged: useWhole && exact.some((x, i) => Math.abs(x - amounts[i]) > 1e-9),
    displayRounded: !useWhole && exact.some((x) => isRounded(x, 4)),
  };
}

let nextTermId = 0;
function makeTerm(value = "") {
  nextTermId += 1;
  return { id: `t${nextTermId}`, value };
}
const makeTerms = (values) => values.map((v) => makeTerm(v));

// 2–6 ratio terms with "+ Add term" and a remove × on each term once there are
// more than two (same add-row pattern as the grade calculator).
function TermsInput({ idPrefix, terms, setTerms, labelFor, placeholders }) {
  const update = (id, value) =>
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, value } : t)));
  const add = () =>
    setTerms((prev) => (prev.length < MAX_TERMS ? [...prev, makeTerm()] : prev));
  const remove = (id) =>
    setTerms((prev) =>
      prev.length > MIN_TERMS ? prev.filter((t) => t.id !== id) : prev
    );
  const canRemove = terms.length > MIN_TERMS;

  return (
    <div className="tool-row">
      {terms.map((t, i) => {
        const inputId = `${idPrefix}-${t.id}`;
        const label = labelFor(i);
        return (
          <div className="tool-field" key={t.id}>
            <label className="tool-label" htmlFor={inputId}>
              {label}
            </label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                id={inputId}
                className="tool-input"
                style={{ flex: 1, minWidth: 0 }}
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={(placeholders && placeholders[i]) || "e.g. 1"}
                value={t.value}
                onChange={(e) => update(t.id, e.target.value)}
              />
              {canRemove && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => remove(t.id)}
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
      {terms.length < MAX_TERMS && (
        <div className="tool-field">
          <span className="tool-label" aria-hidden="true">
            &nbsp;
          </span>
          <button
            type="button"
            className="btn"
            style={{ alignSelf: "flex-start" }}
            onClick={add}
          >
            + Add term
          </button>
        </div>
      )}
    </div>
  );
}

// Stacked bar: one segment per term, width = its share of the total.
function RatioBar({ shares }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        height: 14,
        borderRadius: 999,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-2)",
      }}
    >
      {shares.map((s, i) => (
        <div
          key={i}
          style={{
            width: `${s}%`,
            background: i % 2 === 0 ? "var(--text)" : "var(--surface-2)",
            borderLeft: i > 0 ? "1px solid var(--border-strong)" : "none",
          }}
        />
      ))}
    </div>
  );
}

const MODES = [
  { key: "solve", label: "Solve A:B = C:D" },
  { key: "simplify", label: "Simplify" },
  { key: "scale", label: "Scale" },
  { key: "split", label: "Split a total" },
];

export default function RatioCalculator() {
  const [mode, setMode] = useState("solve"); // "solve" | "simplify" | "scale" | "split"
  const rootRef = useRef(null);

  // Proportion solver: A:B = C:D
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [d, setD] = useState("");

  // Simplify a ratio of 2–6 terms
  const [simpTerms, setSimpTerms] = useState(() => makeTerms(["", ""]));

  // Scale (equivalent ratios)
  const [scaleTerms, setScaleTerms] = useState(() => makeTerms(["", ""]));
  const [scaleMethod, setScaleMethod] = useState("factor"); // "factor" | "target"
  const [scaleFactor, setScaleFactor] = useState("");
  const [scaleDir, setScaleDir] = useState("enlarge"); // "enlarge" | "shrink"
  const [scaleTargetIdx, setScaleTargetIdx] = useState("0");
  const [scaleTarget, setScaleTarget] = useState("");

  // Split a total
  const [splitTerms, setSplitTerms] = useState(() => makeTerms(["", ""]));
  const [splitTotal, setSplitTotal] = useState("");
  const [splitUnit, setSplitUnit] = useState("");
  const [splitWhole, setSplitWhole] = useState(false);

  const [copied, setCopied] = useState("");

  const solveResult = useMemo(() => solveProportion(a, b, c, d), [a, b, c, d]);

  const simplifyResult = useMemo(
    () => simplifyRatio(simpTerms.map((t) => t.value)),
    [simpTerms]
  );

  const scaleResult = useMemo(
    () =>
      scaleRatio(
        scaleTerms.map((t) => t.value),
        scaleMethod,
        scaleFactor,
        scaleDir,
        scaleTargetIdx,
        scaleTarget
      ),
    [scaleTerms, scaleMethod, scaleFactor, scaleDir, scaleTargetIdx, scaleTarget]
  );

  const splitResult = useMemo(
    () => splitByRatio(splitTerms.map((t) => t.value), splitTotal, splitWhole),
    [splitTerms, splitTotal, splitWhole]
  );

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

  const clearScale = () => {
    setScaleTerms(makeTerms(["", ""]));
    setScaleFactor("");
    setScaleTarget("");
    setScaleTargetIdx("0");
  };

  const loadScaleExample = () => {
    setScaleTerms(makeTerms(["2", "5"]));
    setScaleMethod("factor");
    setScaleDir("enlarge");
    setScaleFactor("4");
  };

  const clearSplit = () => {
    setSplitTerms(makeTerms(["", ""]));
    setSplitTotal("");
    setSplitUnit("");
    setSplitWhole(false);
  };

  const loadSplit = (parts, total, unit) => {
    setSplitTerms(makeTerms(parts));
    setSplitTotal(total);
    setSplitUnit(unit);
    setSplitWhole(false);
    setMode("split");
  };

  // "Split" buttons in the reference table: load the row and bring the tool
  // into view, since the table sits below the mode panel.
  const splitFromTable = (row) => {
    loadSplit([String(row.a), String(row.b)], "1000", "ml");
    if (rootRef.current && rootRef.current.scrollIntoView) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
    simplifyResult.status === "ok" ? ratioText(simplifyResult.s.terms) : "";

  const scaledText =
    scaleResult.status === "ok" && scaleResult.scale.status === "ok"
      ? ratioText(scaleResult.scale.scaled)
      : "";

  const splitAmountTexts =
    splitResult.status === "ok"
      ? splitResult.amounts.map((x) => withUnit(formatNumber(x, 4), splitUnit))
      : [];

  const simpBlank = simpTerms.every((t) => t.value === "");
  const scaleBlank = scaleTerms.every((t) => t.value === "") && !scaleFactor && !scaleTarget;
  const splitBlank =
    splitTerms.every((t) => t.value === "") && !splitTotal && !splitUnit && !splitWhole;
  const scaleIdx = Math.min(Number(scaleTargetIdx) || 0, scaleTerms.length - 1);

  // Bring a solved/full result's simplest form(s) into one or two stats.
  let solveSimplest = null;
  if (solveResult.status === "solved") {
    solveSimplest = [
      {
        label: "Both ratios in simplest form",
        value: solveResult.simplest ? ratioText(solveResult.simplest.terms) : "—",
      },
    ];
  } else if (solveResult.status === "full") {
    const ab = solveResult.simplestAB;
    const cd = solveResult.simplestCD;
    const same =
      ab && cd && ab.terms.length === cd.terms.length && ab.terms.every((t, i) => t === cd.terms[i]);
    solveSimplest =
      solveResult.holds && same
        ? [{ label: "Both ratios in simplest form", value: ratioText(ab.terms) }]
        : [
            { label: "A : B in simplest form", value: ab ? ratioText(ab.terms) : "—" },
            { label: "C : D in simplest form", value: cd ? ratioText(cd.terms) : "—" },
          ];
  }

  return (
    <div className="tool" ref={rootRef} style={{ scrollMarginTop: 72 }}>
      <div className="tool-actions" role="group" aria-label="Calculator mode">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={"btn" + (mode === m.key ? " btn-primary" : "")}
            aria-pressed={mode === m.key}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "solve" && (
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
              <p className="tool-note" style={{ marginTop: 6 }}>
                {solveResult.working}
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
              <p className="tool-note" style={{ marginTop: 6 }}>
                {solveResult.working}
              </p>
              <div className="tool-actions" style={{ marginTop: 10 }}>
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

          {solveSimplest && (
            <div className="tool-stat-grid">
              {solveSimplest.map((st) => (
                <div className="tool-stat" key={st.label}>
                  <div className="tool-stat-num">{st.value}</div>
                  <div className="tool-stat-label">{st.label}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mode === "simplify" && (
        <>
          <p className="tool-note">
            Enter a ratio of two to six terms, such as <strong>A : B</strong> or{" "}
            <strong>A : B : C</strong>, to reduce it to its simplest whole-number form,
            with the working and each term&apos;s share of the total.
          </p>

          <div className="tool-fields">
            <TermsInput
              idPrefix="simplify"
              terms={simpTerms}
              setTerms={setSimpTerms}
              labelFor={letterLabel}
              placeholders={["e.g. 1920", "e.g. 1080"]}
            />
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setSimpTerms(makeTerms(["1920", "1080"]))}
            >
              Load example
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setSimpTerms(makeTerms(["6", "9", "15"]))}
            >
              Try 3 terms
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setSimpTerms(makeTerms(["", ""]))}
              disabled={simpBlank && simpTerms.length === MIN_TERMS}
            >
              Clear
            </button>
          </div>

          {simplifyResult.status === "empty" && (
            <p className="tool-note">
              Enter every term of your ratio and the simplified form appears here.
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
                <p className="tool-note" style={{ marginTop: 6 }}>
                  {simplifyResult.working}
                </p>
                {simplifyResult.s.rounded && (
                  <p className="tool-note" style={{ marginTop: 6 }}>
                    Digits past the ninth decimal place were rounded off.
                  </p>
                )}
                <div className="tool-actions" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => copy("simplify", simplifiedText)}
                  >
                    {copied === "simplify" ? "Copied!" : "Copy ratio"}
                  </button>
                </div>
              </div>

              {simplifyResult.pair && (
                <div className="tool-stat-grid" role="status" aria-live="polite">
                  <div className="tool-stat">
                    <div className="tool-stat-num">
                      {simplifyResult.pair.decimal === null
                        ? "—"
                        : formatNumber(simplifyResult.pair.decimal)}
                    </div>
                    <div className="tool-stat-label">Decimal (A ÷ B)</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">
                      {simplifyResult.pair.percent === null
                        ? "—"
                        : formatNumber(simplifyResult.pair.percent, 4) + "%"}
                    </div>
                    <div className="tool-stat-label">A as % of B</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">
                      {simplifyResult.pair.perOneRight === null
                        ? "—"
                        : formatNumber(simplifyResult.pair.perOneRight, 4) + " : 1"}
                    </div>
                    <div className="tool-stat-label">Per one (n : 1)</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">
                      {simplifyResult.pair.perOneLeft === null
                        ? "—"
                        : "1 : " + formatNumber(simplifyResult.pair.perOneLeft, 4)}
                    </div>
                    <div className="tool-stat-label">Per one (1 : n)</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">
                      {simplifyResult.pair.fraction === null
                        ? "—"
                        : simplifyResult.pair.fraction}
                    </div>
                    <div className="tool-stat-label">Fraction A/B</div>
                  </div>
                  {simplifyResult.shares &&
                    simplifyResult.shares.map((sh, i) => (
                      <div className="tool-stat" key={i}>
                        <div className="tool-stat-num">
                          {`${sh.frac} (${formatNumber(sh.pct, 2)}%)`}
                        </div>
                        <div className="tool-stat-label">
                          {letterLabel(i)} as part of total
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {!simplifyResult.pair && simplifyResult.shares && (
                <div className="tool-stat-grid" role="status" aria-live="polite">
                  {simplifyResult.shares.map((sh, i) => (
                    <div className="tool-stat" key={i}>
                      <div className="tool-stat-num">
                        {`${sh.frac} (${formatNumber(sh.pct, 2)}%)`}
                      </div>
                      <div className="tool-stat-label">
                        {letterLabel(i)} share of total
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {simplifyResult.shares && (
                <>
                  <RatioBar shares={simplifyResult.shares.map((sh) => sh.pct)} />
                  <p className="tool-note">
                    {`Share of total: ${simplifyResult.s.terms
                      .map((t) => fmtW(t))
                      .join(" + ")} = ${fmtW(simplifyResult.sum)} parts · `}
                    {simplifyResult.shares
                      .map(
                        (sh, i) =>
                          `${letterLabel(i)}: ${fmtW(sh.t)}/${fmtW(simplifyResult.sum)} = ${formatNumber(
                            sh.pct,
                            2
                          )}%`
                      )
                      .join(" · ")}
                  </p>
                </>
              )}

              {simplifyResult.pair && simplifyResult.pair.nb === 0 && (
                <p className="tool-note">
                  The second term is 0, so the decimal, percentage and fraction are
                  undefined (division by zero).
                </p>
              )}
            </>
          )}
        </>
      )}

      {mode === "scale" && (
        <>
          <p className="tool-note">
            Enter a ratio, then multiply or divide every term by the same factor, or set
            one term to a new value. Equivalent ratios from ×1 to ×10 are listed below.
          </p>

          <div className="tool-fields">
            <TermsInput
              idPrefix="scale"
              terms={scaleTerms}
              setTerms={setScaleTerms}
              labelFor={partLabel}
              placeholders={["e.g. 2", "e.g. 5"]}
            />

            <div className="tool-actions" role="group" aria-label="How to scale">
              <button
                type="button"
                className={"btn btn-sm" + (scaleMethod === "factor" ? " btn-primary" : "")}
                aria-pressed={scaleMethod === "factor"}
                onClick={() => setScaleMethod("factor")}
              >
                Multiply / divide by
              </button>
              <button
                type="button"
                className={"btn btn-sm" + (scaleMethod === "target" ? " btn-primary" : "")}
                aria-pressed={scaleMethod === "target"}
                onClick={() => setScaleMethod("target")}
              >
                Set one term to a value
              </button>
            </div>

            {scaleMethod === "factor" ? (
              <div className="tool-row">
                <div className="tool-field">
                  <label className="tool-label" htmlFor="scale-factor">
                    Scale factor
                  </label>
                  <input
                    id="scale-factor"
                    className="tool-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="e.g. 4"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(e.target.value)}
                  />
                </div>
                <div className="tool-field">
                  <span className="tool-label" id="scale-dir-label">
                    Direction
                  </span>
                  <div
                    className="tool-actions"
                    role="group"
                    aria-labelledby="scale-dir-label"
                  >
                    <button
                      type="button"
                      className={"btn btn-sm" + (scaleDir === "enlarge" ? " btn-primary" : "")}
                      aria-pressed={scaleDir === "enlarge"}
                      onClick={() => setScaleDir("enlarge")}
                    >
                      Enlarge (×)
                    </button>
                    <button
                      type="button"
                      className={"btn btn-sm" + (scaleDir === "shrink" ? " btn-primary" : "")}
                      aria-pressed={scaleDir === "shrink"}
                      onClick={() => setScaleDir("shrink")}
                    >
                      Shrink (÷)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="tool-row">
                <div className="tool-field">
                  <label className="tool-label" htmlFor="scale-target-part">
                    Term to set
                  </label>
                  <select
                    id="scale-target-part"
                    className="tool-select"
                    value={String(scaleIdx)}
                    onChange={(e) => setScaleTargetIdx(e.target.value)}
                  >
                    {scaleTerms.map((t, i) => (
                      <option key={t.id} value={String(i)}>
                        {partLabel(i)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tool-field">
                  <label className="tool-label" htmlFor="scale-target-value">
                    New value
                  </label>
                  <input
                    id="scale-target-value"
                    className="tool-input"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="e.g. 7"
                    value={scaleTarget}
                    onChange={(e) => setScaleTarget(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="tool-actions">
            <button type="button" className="btn" onClick={loadScaleExample}>
              Load example
            </button>
            <button
              type="button"
              className="btn"
              onClick={clearScale}
              disabled={scaleBlank && scaleTerms.length === MIN_TERMS}
            >
              Clear
            </button>
          </div>

          {scaleResult.status === "empty" && (
            <p className="tool-note">
              Enter every part of the ratio — the scaled ratio and its equivalent
              ratios appear here.
            </p>
          )}

          {scaleResult.status === "error" && (
            <p className="tool-error" role="alert">
              {scaleResult.message}
            </p>
          )}

          {scaleResult.status === "ok" && (
            <>
              {scaleResult.scale.status === "empty" && (
                <p className="tool-note">
                  {scaleMethod === "factor"
                    ? "Enter a scale factor to scale the ratio."
                    : "Enter the new value for the term you picked."}
                </p>
              )}

              {scaleResult.scale.status === "error" && (
                <p className="tool-error" role="alert">
                  {scaleResult.scale.message}
                </p>
              )}

              {scaleResult.scale.status === "ok" && (
                <>
                  <div className="tool-result" role="status" aria-live="polite">
                    <p className="tool-result-label">Scaled ratio</p>
                    <div className="tool-result-value">{scaledText}</div>
                    <p className="tool-note" style={{ marginTop: 6 }}>
                      {scaleResult.scale.working}
                    </p>
                    <div className="tool-actions" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => copy("scale", scaledText)}
                      >
                        {copied === "scale" ? "Copied!" : "Copy ratio"}
                      </button>
                    </div>
                  </div>

                  <div className="tool-stat-grid">
                    <div className="tool-stat">
                      <div className="tool-stat-num">{scaleResult.scale.factorText}</div>
                      <div className="tool-stat-label">Scale factor</div>
                    </div>
                  </div>
                </>
              )}

              <div className="csc-table-wrap" style={{ marginTop: 4 }}>
                <table className="csc-table">
                  <caption className="tool-note" style={{ textAlign: "left", paddingBottom: 6 }}>
                    Equivalent ratios
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Multiplier</th>
                      {scaleResult.vals.map((v, i) => (
                        <th scope="col" key={i}>
                          {partLabel(i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!scaleResult.inLowest && scaleResult.simplest && (
                      <tr>
                        <td>Simplest</td>
                        {scaleResult.simplest.terms.map((t, i) => (
                          <td key={i}>{formatNumber(t)}</td>
                        ))}
                      </tr>
                    )}
                    {scaleResult.rows.map((row) => (
                      <tr
                        key={row.m}
                        className={
                          scaleResult.scale.status === "ok" &&
                          scaleResult.scale.match === row.m
                            ? "is-match"
                            : undefined
                        }
                      >
                        <td>×{row.m}</td>
                        {row.terms.map((t, i) => (
                          <td key={i}>{formatNumber(t)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {mode === "split" && (
        <>
          <p className="tool-note">
            Share a total between the parts of a ratio — for example 500 ml mixed at{" "}
            <strong>1 : 4</strong> is 100 ml + 400 ml.
          </p>

          <div className="tool-fields">
            <TermsInput
              idPrefix="split"
              terms={splitTerms}
              setTerms={setSplitTerms}
              labelFor={partLabel}
              placeholders={["e.g. 1", "e.g. 4"]}
            />
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="split-total">
                  Total to split
                </label>
                <input
                  id="split-total"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="e.g. 500"
                  value={splitTotal}
                  onChange={(e) => setSplitTotal(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="split-unit">
                  Unit (optional)
                </label>
                <input
                  id="split-unit"
                  className="tool-input"
                  type="text"
                  maxLength={12}
                  placeholder="ml, g, $…"
                  value={splitUnit}
                  onChange={(e) => setSplitUnit(e.target.value)}
                />
              </div>
            </div>
            <label
              className="tool-note"
              style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", margin: 0 }}
            >
              <input
                type="checkbox"
                checked={splitWhole}
                onChange={(e) => setSplitWhole(e.target.checked)}
              />
              Whole numbers only (parts still add up to the total)
            </label>
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="btn"
              onClick={() => loadSplit(["1", "4"], "500", "ml")}
            >
              Load example
            </button>
            <button
              type="button"
              className="btn"
              onClick={clearSplit}
              disabled={splitBlank && splitTerms.length === MIN_TERMS}
            >
              Clear
            </button>
          </div>

          {splitResult.status === "empty" && (
            <p className="tool-note">
              Enter every part of the ratio and the total to split — the amounts
              appear here.
            </p>
          )}

          {splitResult.status === "error" && (
            <p className="tool-error" role="alert">
              {splitResult.message}
            </p>
          )}

          {splitResult.status === "ok" && (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">Amounts</p>
                <div
                  className="csc-cards"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
                >
                  {splitResult.vals.map((v, i) => (
                    <div className="csc-card" key={i}>
                      <div className="csc-card-country">
                        {`${partLabel(i)} · ${formatNumber(v)} part${v === 1 ? "" : "s"}`}
                      </div>
                      <div className="csc-card-size" style={{ overflowWrap: "anywhere" }}>
                        {splitAmountTexts[i]}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <RatioBar shares={splitResult.shares} />
                </div>
                <div className="tool-actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => copy("split", splitAmountTexts.join(" : "))}
                  >
                    {copied === "split" ? "Copied!" : "Copy amounts"}
                  </button>
                </div>
              </div>

              <div className="tool-stat-grid">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {withUnit(formatNumber(splitResult.onePart, 4), splitUnit)}
                  </div>
                  <div className="tool-stat-label">One part</div>
                </div>
                {splitResult.shares.map((sh, i) => (
                  <div className="tool-stat" key={i}>
                    <div className="tool-stat-num">{formatNumber(sh, 2)}%</div>
                    <div className="tool-stat-label">{partLabel(i)} share</div>
                  </div>
                ))}
              </div>

              <p className="tool-note">
                {`Total parts: ${splitResult.vals.map((v) => fmtW(v)).join(" + ")} = ${fmtW(
                  splitResult.sum
                )} · One part: ${fmtW(splitResult.total)} ÷ ${fmtW(splitResult.sum)} ${
                  isRounded(splitResult.onePart, 4) ? "≈" : "="
                } ${fmtW(splitResult.onePart, 4)} · `}
                {splitResult.vals
                  .map(
                    (v, i) =>
                      `${partLabel(i)}: ${fmtW(v)} × ${fmtW(splitResult.onePart, 4)} ${
                        isRounded(splitResult.onePart, 4) || isRounded(splitResult.exact[i], 4)
                          ? "≈"
                          : "="
                      } ${fmtW(splitResult.exact[i], 4)}`
                  )
                  .join(" · ")}
              </p>

              {splitResult.wholeChanged && (
                <p className="tool-note">
                  Rounded so the parts still add up to {formatNumber(splitResult.total)}.
                </p>
              )}
              {splitResult.wholeBlocked && (
                <p className="tool-note">
                  Whole-number rounding needs a whole-number total, so the exact amounts
                  are shown.
                </p>
              )}
              {splitResult.displayRounded && (
                <p className="tool-note">
                  Amounts are shown to 4 decimal places, so they may not add up exactly to{" "}
                  {formatNumber(splitResult.total)}.
                  {splitResult.wholeTotal
                    ? " Tick “Whole numbers only” for amounts that do."
                    : ""}
                </p>
              )}
            </>
          )}
        </>
      )}

      <section className="tool-about" style={{ marginTop: 26 }}>
        <h2 className="tool-h2">Common ratios as shares of a total</h2>
        <p className="tool-note">
          Each ratio as the share of the total each part gets, and what that means for
          1,000 ml or one US gallon. Press Split to load a row into the calculator.
        </p>
        <div className="csc-table-wrap">
          <table className="csc-table">
            <thead>
              <tr>
                <th scope="col">Ratio</th>
                <th scope="col">First part</th>
                <th scope="col">Second part</th>
                <th scope="col">Split of 1,000 ml</th>
                <th scope="col">Split of 1 US gallon (128 fl oz)</th>
                <th scope="col">Try it</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_ROWS.map((row) => (
                <tr key={`${row.a}:${row.b}`}>
                  <td>
                    {row.a} : {row.b}
                  </td>
                  <td>{formatNumber(row.shareA, 2)}%</td>
                  <td>{formatNumber(row.shareB, 2)}%</td>
                  <td>
                    {formatNumber(row.mlA, 1)} + {formatNumber(row.mlB, 1)} ml
                  </td>
                  <td>
                    {formatNumber(row.ozA, 1)} + {formatNumber(row.ozB, 1)} fl oz
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => splitFromTable(row)}
                      aria-label={`Split 1,000 ml in the ratio ${row.a} : ${row.b}`}
                    >
                      Split
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tool-note" style={{ marginTop: 10 }}>
          Amounts split the finished total. 1 US gallon = 128 US fluid ounces.
        </p>
      </section>

      <p className="tool-note">
        Everything runs entirely in your browser — nothing you type is uploaded.
      </p>
    </div>
  );
}
