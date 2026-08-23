"use client";

import { useState, useMemo, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Safe expression engine — tokenizer + recursive-descent parser.    */
/*  No eval / no Function. Handles + - * / % ^ ! ( ), unary sign,      */
/*  implicit multiplication, constants (pi, e) and functions          */
/*  (sin cos tan ln log sqrt) with a Deg/Rad flag.                    */
/* ------------------------------------------------------------------ */

function normalize(s) {
  return String(s)
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt");
}

function tokenize(input) {
  const s = normalize(input);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      let num = "";
      while (i < s.length && ((s[i] >= "0" && s[i] <= "9") || s[i] === ".")) {
        num += s[i];
        i++;
      }
      if ((num.match(/\./g) || []).length > 1) {
        throw new Error('Invalid number "' + num + '".');
      }
      if (num === ".") throw new Error("Type a digit before or after the dot.");
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
      let name = "";
      while (
        i < s.length &&
        ((s[i] >= "a" && s[i] <= "z") || (s[i] >= "A" && s[i] <= "Z"))
      ) {
        name += s[i];
        i++;
      }
      const lname = name.toLowerCase();
      if (lname === "pi") tokens.push({ type: "const", value: Math.PI });
      else if (lname === "e") tokens.push({ type: "const", value: Math.E });
      else if (["sin", "cos", "tan", "ln", "log", "sqrt"].includes(lname)) {
        tokens.push({ type: "func", name: lname });
      } else {
        throw new Error('Unknown name "' + name + '".');
      }
      continue;
    }
    if ("+-*/%^(),!".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    throw new Error('Unexpected character "' + c + '".');
  }
  return tokens;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Factorial needs a whole number ≥ 0.");
  }
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function applyFunc(name, x, deg) {
  const toRad = (v) => (deg ? (v * Math.PI) / 180 : v);
  switch (name) {
    case "sin": {
      const r = Math.sin(toRad(x));
      return Math.abs(r) < 1e-12 ? 0 : r;
    }
    case "cos": {
      const r = Math.cos(toRad(x));
      return Math.abs(r) < 1e-12 ? 0 : r;
    }
    case "tan": {
      const r = Math.tan(toRad(x));
      return Math.abs(r) < 1e-12 ? 0 : r;
    }
    case "ln":
      if (x <= 0) throw new Error("ln needs a positive number.");
      return Math.log(x);
    case "log":
      if (x <= 0) throw new Error("log needs a positive number.");
      return Math.log10(x);
    case "sqrt":
      if (x < 0) throw new Error("√ needs a number ≥ 0.");
      return Math.sqrt(x);
    default:
      throw new Error("Unknown function.");
  }
}

function evaluate(input, deg) {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("Nothing to calculate.");
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const isValueStart = (t) =>
    t &&
    (t.type === "number" ||
      t.type === "const" ||
      t.type === "func" ||
      (t.type === "op" && t.value === "("));

  function parseExpression() {
    let left = parseTerm();
    while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = next().value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (peek()) {
      const t = peek();
      if (t.type === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        const op = next().value;
        const right = parseUnary();
        if (op === "*") left = left * right;
        else if (op === "/") left = left / right;
        else left = left % right;
      } else if (isValueStart(t)) {
        // implicit multiplication: 2pi, 3(4), 2sin(30)
        const right = parseUnary();
        left = left * right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary() {
    const t = peek();
    if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
      next();
      const v = parseUnary();
      return t.value === "-" ? -v : v;
    }
    return parsePower();
  }

  function parsePower() {
    const base = parsePostfix();
    if (peek() && peek().type === "op" && peek().value === "^") {
      next();
      const exp = parseUnary(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  function parsePostfix() {
    let v = parsePrimary();
    while (peek() && peek().type === "op" && peek().value === "!") {
      next();
      v = factorial(v);
    }
    return v;
  }

  function parsePrimary() {
    const t = next();
    if (!t) throw new Error("Expression is incomplete.");
    if (t.type === "number") return t.value;
    if (t.type === "const") return t.value;
    if (t.type === "func") {
      expectOpen(t.name);
      const arg = parseExpression();
      expectClose();
      return applyFunc(t.name, arg, deg);
    }
    if (t.type === "op" && t.value === "(") {
      const v = parseExpression();
      expectClose();
      return v;
    }
    throw new Error("Expression is incomplete.");
  }

  function expectOpen(fn) {
    const t = next();
    if (!t || !(t.type === "op" && t.value === "(")) {
      throw new Error('Add "(" after ' + fn + ".");
    }
  }

  function expectClose() {
    const t = next();
    if (!t || !(t.type === "op" && t.value === ")")) {
      throw new Error('Missing ")".');
    }
  }

  const result = parseExpression();
  if (pos < tokens.length) throw new Error("Expression is incomplete.");
  return result;
}

/* ------------------------------- formatting ----------------------- */

function formatDisplay(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-6) {
    let s = n.toExponential(6);
    s = s.replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e");
    return s;
  }
  const rounded = Number(n.toPrecision(12));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

// A plain, tokenizer-safe string for chaining after "=". Null if it needs
// exponent notation (which would collide with the "e" constant).
function plainString(n) {
  if (!Number.isFinite(n)) return null;
  const rounded = Number(n.toPrecision(12));
  const s = String(rounded);
  if (/[eE]/.test(s)) return null;
  return s;
}

/* ---------------------------- expression edits -------------------- */

function smartBackspace(expr) {
  const multi = ["sqrt(", "sin(", "cos(", "tan(", "log(", "ln(", "pi"];
  for (const t of multi) {
    if (expr.endsWith(t)) return expr.slice(0, -t.length);
  }
  return expr.slice(0, -1);
}

function toggleSign(expr) {
  if (expr === "") return "-";
  const m = expr.match(/(\d*\.?\d+|pi|e)$/);
  if (!m) return expr + "-";
  const operand = m[0];
  const before = expr.slice(0, expr.length - operand.length);
  if (before.endsWith("-")) {
    const bm = before.slice(0, -1);
    if (bm === "" || "(+-*/%^".includes(bm.slice(-1))) {
      return bm + operand; // remove an existing unary minus
    }
  }
  return before + "-" + operand;
}

function prettify(expr) {
  return expr
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/sqrt/g, "√")
    .replace(/pi/g, "π")
    .replace(/%/g, " mod ")
    .replace(/-/g, "−");
}

/* ------------------------------- component ------------------------ */

export default function ScientificCalculator() {
  const [expr, setExpr] = useState("");
  const [error, setError] = useState("");
  const [deg, setDeg] = useState(true);

  const preview = useMemo(() => {
    if (expr.trim() === "") return null;
    try {
      const v = evaluate(expr, deg);
      if (!Number.isFinite(v)) return null;
      return v;
    } catch {
      return null;
    }
  }, [expr, deg]);

  const append = useCallback((s) => {
    setError("");
    setExpr((e) => e + s);
  }, []);

  const handleEquals = useCallback(() => {
    if (expr.trim() === "") return;
    let v;
    try {
      v = evaluate(expr, deg);
    } catch (err) {
      setError(err && err.message ? err.message : "Invalid expression.");
      return;
    }
    if (!Number.isFinite(v)) {
      setError(
        v === Infinity || v === -Infinity
          ? "Result is infinite — check for division by zero."
          : "Result is not a real number."
      );
      return;
    }
    setError("");
    const plain = plainString(v);
    if (plain !== null) setExpr(plain); // let the result become the next input
  }, [expr, deg]);

  const clearAll = useCallback(() => {
    setExpr("");
    setError("");
  }, []);

  const backspace = useCallback(() => {
    setError("");
    setExpr((e) => smartBackspace(e));
  }, []);

  const signToggle = useCallback(() => {
    setError("");
    setExpr((e) => toggleSign(e));
  }, []);

  const onKeyDown = useCallback(
    (ev) => {
      const k = ev.key;
      if (/^[0-9]$/.test(k)) append(k);
      else if (k === ".") append(".");
      else if (["+", "-", "*", "/", "(", ")", "^", "%", "!"].includes(k)) append(k);
      else if (k === "Enter" || k === "=") {
        ev.preventDefault();
        handleEquals();
      } else if (k === "Backspace") {
        ev.preventDefault();
        backspace();
      } else if (k === "Escape") {
        clearAll();
      } else {
        return;
      }
    },
    [append, handleEquals, backspace, clearAll]
  );

  // Button definitions: [label, handler, kind, ariaLabel?]
  const K_FN = "btn";
  const K_NUM = "btn";
  const K_OP = "btn btn-primary";
  const K_EQ = "btn btn-success";

  const gridBtn = (label, onClick, className, ariaLabel, span) => (
    <button
      key={label + (span || "")}
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: "100%",
        minWidth: 0,
        minHeight: "46px",
        padding: "0.5rem 0.25rem",
        gridColumn: span ? `span ${span}` : undefined,
      }}
    >
      {label}
    </button>
  );

  const displayText = expr ? prettify(expr) : "0";
  const previewText = formatDisplay(preview);

  return (
    <div className="tool">
      <div
        className="tool-fields"
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Scientific calculator"
        style={{ outline: "none" }}
      >
        {/* Angle mode toggle */}
        <div className="tool-row" style={{ alignItems: "center", gap: "0.75rem" }}>
          <span className="tool-label" style={{ margin: 0 }}>
            Angle mode
          </span>
          <div style={{ display: "inline-flex", gap: "0.4rem" }}>
            <button
              type="button"
              className={deg ? "btn btn-primary" : "btn"}
              aria-pressed={deg}
              onClick={() => {
                setError("");
                setDeg(true);
              }}
              style={{ minHeight: "38px", padding: "0.35rem 0.9rem" }}
            >
              Deg
            </button>
            <button
              type="button"
              className={!deg ? "btn btn-primary" : "btn"}
              aria-pressed={!deg}
              onClick={() => {
                setError("");
                setDeg(false);
              }}
              style={{ minHeight: "38px", padding: "0.35rem 0.9rem" }}
            >
              Rad
            </button>
          </div>
        </div>

        {/* Display screen */}
        <div
          aria-hidden="false"
          style={{
            border: "1px solid rgba(128,128,128,0.28)",
            background: "rgba(128,128,128,0.08)",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: "1.35rem",
              lineHeight: 1.3,
              wordBreak: "break-all",
              minHeight: "1.5em",
              color: "currentColor",
              opacity: expr ? 1 : 0.5,
            }}
          >
            {displayText}
          </div>
          <div
            aria-live="polite"
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: "1rem",
              marginTop: "0.35rem",
              minHeight: "1.2em",
              opacity: 0.7,
              wordBreak: "break-all",
            }}
          >
            {previewText !== null ? "= " + previewText : ""}
          </div>
        </div>

        {error ? (
          <p className="tool-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* Function / scientific pad — 5 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "0.4rem",
          }}
        >
          {gridBtn("sin", () => append("sin("), K_FN, "sine")}
          {gridBtn("cos", () => append("cos("), K_FN, "cosine")}
          {gridBtn("tan", () => append("tan("), K_FN, "tangent")}
          {gridBtn("ln", () => append("ln("), K_FN, "natural log")}
          {gridBtn("log", () => append("log("), K_FN, "log base 10")}

          {gridBtn("√", () => append("sqrt("), K_FN, "square root")}
          {gridBtn("x²", () => append("^2"), K_FN, "square")}
          {gridBtn("xʸ", () => append("^"), K_FN, "power")}
          {gridBtn("π", () => append("pi"), K_FN, "pi")}
          {gridBtn("e", () => append("e"), K_FN, "euler's number")}

          {gridBtn("(", () => append("("), K_FN, "open parenthesis")}
          {gridBtn(")", () => append(")"), K_FN, "close parenthesis")}
          {gridBtn("n!", () => append("!"), K_FN, "factorial")}
          {gridBtn("%", () => append("%"), K_FN, "modulo")}
          {gridBtn("⌫", backspace, K_FN, "backspace")}
        </div>

        {/* Number / operator pad — 4 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.4rem",
          }}
        >
          {gridBtn("7", () => append("7"), K_NUM)}
          {gridBtn("8", () => append("8"), K_NUM)}
          {gridBtn("9", () => append("9"), K_NUM)}
          {gridBtn("÷", () => append("/"), K_OP, "divide")}

          {gridBtn("4", () => append("4"), K_NUM)}
          {gridBtn("5", () => append("5"), K_NUM)}
          {gridBtn("6", () => append("6"), K_NUM)}
          {gridBtn("×", () => append("*"), K_OP, "multiply")}

          {gridBtn("1", () => append("1"), K_NUM)}
          {gridBtn("2", () => append("2"), K_NUM)}
          {gridBtn("3", () => append("3"), K_NUM)}
          {gridBtn("−", () => append("-"), K_OP, "subtract")}

          {gridBtn("0", () => append("0"), K_NUM)}
          {gridBtn(".", () => append("."), K_NUM, "decimal point")}
          {gridBtn("±", signToggle, K_NUM, "toggle sign")}
          {gridBtn("+", () => append("+"), K_OP, "add")}

          {gridBtn("C", clearAll, K_FN, "clear all")}
          {gridBtn("=", handleEquals, K_EQ, "equals", 3)}
        </div>

        <p className="tool-note">
          Type on your keyboard too: digits, + − × ÷, ^, ! , ( ), Enter to
          evaluate, Backspace to delete, Esc to clear. Functions accept degrees
          or radians via the toggle above. &ldquo;%&rdquo; is modulo
          (remainder).
        </p>
      </div>
    </div>
  );
}
