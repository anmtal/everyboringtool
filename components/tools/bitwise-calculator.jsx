"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Digit alphabet; index === digit value. Covers up to base 16.
const DIGITS = "0123456789abcdef";

const BASES = [
  { value: 10, label: "Decimal", prefixHint: "" },
  { value: 2, label: "Binary", prefixHint: "0b" },
  { value: 16, label: "Hex", prefixHint: "0x" },
  { value: 8, label: "Octal", prefixHint: "0o" },
];

const WIDTHS = [8, 16, 32, 64];

// Operations. `unary` ones ignore operand B.
const OPS = [
  { key: "and", label: "AND  (A & B)", symbol: "&", unary: false },
  { key: "or", label: "OR  (A | B)", symbol: "|", unary: false },
  { key: "xor", label: "XOR  (A ^ B)", symbol: "^", unary: false },
  { key: "not", label: "NOT  (~A)", symbol: "~", unary: true },
  { key: "nand", label: "NAND  ~(A & B)", symbol: "~&", unary: false },
  { key: "nor", label: "NOR  ~(A | B)", symbol: "~|", unary: false },
  { key: "xnor", label: "XNOR  ~(A ^ B)", symbol: "~^", unary: false },
  { key: "shl", label: "Left shift  (A << B)", symbol: "<<", unary: false },
  { key: "shr", label: "Right shift  (A >> B, logical)", symbol: ">>", unary: false },
];

// Strip a base prefix (0x / 0b / 0o) if it matches the selected base, plus
// grouping underscores and spaces, keeping an optional leading sign.
function normalize(raw, base) {
  let s = String(raw).trim();
  let sign = "";
  if (s[0] === "+" || s[0] === "-") {
    sign = s[0] === "-" ? "-" : "";
    s = s.slice(1);
  }
  const lower = s.toLowerCase();
  if (base === 16 && lower.startsWith("0x")) s = s.slice(2);
  else if (base === 2 && lower.startsWith("0b")) s = s.slice(2);
  else if (base === 8 && lower.startsWith("0o")) s = s.slice(2);
  const body = s.replace(/[_\s]/g, "");
  return { sign, body };
}

// Parse a string in the given base into a signed BigInt, or null if invalid.
function parseInBase(raw, base) {
  const { sign, body } = normalize(raw, base);
  if (body === "") return null;
  const b = BigInt(base);
  let val = 0n;
  for (const ch of body.toLowerCase()) {
    const d = DIGITS.indexOf(ch);
    if (d === -1 || d >= base) return null;
    val = val * b + BigInt(d);
  }
  return sign === "-" ? -val : val;
}

// Wrap any signed BigInt into its unsigned representation within `width` bits
// (two's complement for negatives), so every value fits the chosen register.
function toUnsigned(v, width) {
  const mod = 1n << BigInt(width);
  return ((v % mod) + mod) % mod;
}

// Interpret an unsigned width-bit value as a signed two's-complement integer.
function toSigned(u, width) {
  const half = 1n << BigInt(width - 1);
  return u >= half ? u - (1n << BigInt(width)) : u;
}

// Binary string padded to `width` bits and grouped into 4-bit nibbles.
function toBinaryGrouped(u, width) {
  const bits = u.toString(2).padStart(width, "0");
  return bits.replace(/(.{4})(?=.)/g, "$1 ");
}

// Hex string padded to the width's nibble count (uppercase).
function toHexPadded(u, width) {
  return u.toString(16).toUpperCase().padStart(width / 4, "0");
}

export default function BitwiseCalculator() {
  const [aRaw, setARaw] = useState("60");
  const [bRaw, setBRaw] = useState("13");
  const [aBase, setABase] = useState(10);
  const [bBase, setBBase] = useState(10);
  const [op, setOp] = useState("and");
  const [width, setWidth] = useState(32);
  const [copied, setCopied] = useState("");

  const opDef = OPS.find((o) => o.key === op) || OPS[0];

  const aVal = useMemo(() => parseInBase(aRaw, aBase), [aRaw, aBase]);
  const bVal = useMemo(() => parseInBase(bRaw, bBase), [bRaw, bBase]);

  const aEmpty = normalize(aRaw, aBase).body === "";
  const bEmpty = normalize(bRaw, bBase).body === "";
  const aInvalid = !aEmpty && aVal === null;
  const bInvalid = !bEmpty && bVal === null;

  const result = useMemo(() => {
    if (aVal === null) return null;
    if (!opDef.unary && bVal === null) return null;

    const a = toUnsigned(aVal, width);
    const b = bVal === null ? 0n : toUnsigned(bVal, width);
    const mask = (1n << BigInt(width)) - 1n;

    let out;
    switch (op) {
      case "and":
        out = a & b;
        break;
      case "or":
        out = a | b;
        break;
      case "xor":
        out = a ^ b;
        break;
      case "not":
        out = ~a & mask;
        break;
      case "nand":
        out = ~(a & b) & mask;
        break;
      case "nor":
        out = ~(a | b) & mask;
        break;
      case "xnor":
        out = ~(a ^ b) & mask;
        break;
      case "shl":
        // Shifting by >= width pushes every bit out of the register.
        out = b >= BigInt(width) ? 0n : (a << b) & mask;
        break;
      case "shr":
        // Logical right shift within the register; shifting by >= width is 0.
        out = b >= BigInt(width) ? 0n : a >> b;
        break;
      default:
        out = 0n;
    }
    return toUnsigned(out, width);
  }, [aVal, bVal, op, opDef.unary, width]);

  // Aligned binary rows for A, (B), and the result — the visual heart of the
  // calculation, showing exactly how each output bit is produced.
  const rows = useMemo(() => {
    if (result === null) return null;
    const a = toUnsigned(aVal, width);
    const list = [{ tag: "A", u: a }];
    if (!opDef.unary) list.push({ tag: "B", u: toUnsigned(bVal ?? 0n, width) });
    list.push({ tag: "=", u: result });
    return list.map((r) => ({
      tag: r.tag,
      bin: toBinaryGrouped(r.u, width),
    }));
  }, [result, aVal, bVal, opDef.unary, width]);

  const outputs = useMemo(() => {
    if (result === null) return null;
    return {
      bin: toBinaryGrouped(result, width),
      hex: "0x" + toHexPadded(result, width),
      decU: result.toString(10),
      decS: toSigned(result, width).toString(10),
      oct: "0o" + result.toString(8),
    };
  }, [result, width]);

  async function copy(text, key) {
    if (!text) return;
    try {
      await copyText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be unavailable (permissions / insecure context); ignore.
    }
  }

  const mono = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    wordBreak: "break-all",
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bw-a">
              Operand A
            </label>
            <input
              id="bw-a"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. 60 or 0x3C"
              value={aRaw}
              onChange={(e) => setARaw(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bw-a-base">
              A base
            </label>
            <select
              id="bw-a-base"
              className="tool-select"
              value={aBase}
              onChange={(e) => setABase(Number(e.target.value))}
            >
              {BASES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bw-op">
              Operation
            </label>
            <select
              id="bw-op"
              className="tool-select"
              value={op}
              onChange={(e) => setOp(e.target.value)}
            >
              {OPS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bw-width">
              Bit width
            </label>
            <select
              id="bw-width"
              className="tool-select"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            >
              {WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w}-bit
                </option>
              ))}
            </select>
          </div>
        </div>

        {!opDef.unary ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="bw-b">
                {op === "shl" || op === "shr" ? "Shift amount (B)" : "Operand B"}
              </label>
              <input
                id="bw-b"
                className="tool-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 13 or 0xD"
                value={bRaw}
                onChange={(e) => setBRaw(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bw-b-base">
                B base
              </label>
              <select
                id="bw-b-base"
                className="tool-select"
                value={bBase}
                onChange={(e) => setBBase(Number(e.target.value))}
              >
                {BASES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      {aInvalid ? (
        <p className="tool-error">
          Operand A is not a valid {BASES.find((b) => b.value === aBase).label}{" "}
          number.
        </p>
      ) : null}
      {bInvalid && !opDef.unary ? (
        <p className="tool-error">
          Operand B is not a valid {BASES.find((b) => b.value === bBase).label}{" "}
          number.
        </p>
      ) : null}

      {result === null ? (
        <p className="tool-note">
          Enter operand{opDef.unary ? "" : "s"}, pick an operation and a bit
          width, and the result appears here in binary, hex, decimal and octal —
          with a bit-by-bit breakdown showing how it lines up.
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              Bit-by-bit ({width}-bit, {opDef.symbol})
            </div>
            <pre className="tool-output" style={mono}>
              {rows
                .map((r) => `${r.tag.padEnd(2)}  ${r.bin}`)
                .join("\n")}
            </pre>
          </div>

          {[
            { key: "bin", label: "Binary", text: outputs.bin },
            { key: "hex", label: "Hex", text: outputs.hex },
            { key: "decU", label: "Decimal (unsigned)", text: outputs.decU },
            { key: "decS", label: "Decimal (signed, two's complement)", text: outputs.decS },
            { key: "oct", label: "Octal", text: outputs.oct },
          ].map((row) => (
            <div className="tool-result" role="status" aria-live="polite" key={row.key}>
              <div className="tool-result-label">{row.label}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div className="tool-result-value" style={mono}>
                  {row.text}
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => copy(row.text, row.key)}
                >
                  {copied === row.key ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <p className="tool-note">
        Values are computed as fixed-width unsigned registers using two's
        complement, so negative inputs and the NOT / NAND / NOR / XNOR
        operations depend on the bit width you choose. Right shift is logical
        (zero-filled). Everything runs locally in your browser — no data leaves
        your device.
      </p>
    </div>
  );
}
