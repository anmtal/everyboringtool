"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// The three permission classes, in the order chmod uses them.
const CLASSES = [
  { key: "owner", label: "Owner", short: "u" },
  { key: "group", label: "Group", short: "g" },
  { key: "other", label: "Others", short: "o" },
];

// Within each class: read = 4, write = 2, execute = 1.
const PERMS = [
  { key: "r", label: "Read", value: 4 },
  { key: "w", label: "Write", value: 2 },
  { key: "x", label: "Execute", value: 1 },
];

// Special bits form the leading (fourth) octal digit.
const SPECIAL = [
  { key: "setuid", label: "Setuid", value: 4, letter: "s", pos: "owner" },
  { key: "setgid", label: "Setgid", value: 2, letter: "s", pos: "group" },
  { key: "sticky", label: "Sticky", value: 1, letter: "t", pos: "other" },
];

// Default: 644 (rw-r--r--), the common file permission.
const DEFAULT_STATE = {
  owner: { r: true, w: true, x: false },
  group: { r: true, w: false, x: false },
  other: { r: true, w: false, x: false },
  setuid: false,
  setgid: false,
  sticky: false,
};

function clsDigit(cls) {
  return (cls.r ? 4 : 0) + (cls.w ? 2 : 0) + (cls.x ? 1 : 0);
}

function specialDigit(state) {
  return (
    (state.setuid ? 4 : 0) + (state.setgid ? 2 : 0) + (state.sticky ? 1 : 0)
  );
}

// Build the 9-character (or 10 with the leading type slot) symbolic string,
// folding in the setuid/setgid/sticky letters exactly as `ls -l` shows them.
function symbolicFor(state) {
  const out = [];
  for (const c of CLASSES) {
    const cls = state[c.key];
    out.push(cls.r ? "r" : "-");
    out.push(cls.w ? "w" : "-");
    // Execute column carries the special-bit letter when set.
    let xChar = cls.x ? "x" : "-";
    if (c.key === "owner" && state.setuid) xChar = cls.x ? "s" : "S";
    if (c.key === "group" && state.setgid) xChar = cls.x ? "s" : "S";
    if (c.key === "other" && state.sticky) xChar = cls.x ? "t" : "T";
    out.push(xChar);
  }
  return out.join("");
}

// Parse an octal string like "755", "0644", or "1777" into full state.
function parseOctal(raw) {
  const trimmed = String(raw).trim();
  if (!/^[0-7]{1,4}$/.test(trimmed)) return null;
  const digits = trimmed.padStart(4, "0").slice(-4).split("").map(Number);
  const [sp, o, g, ot] = digits;
  const mk = (d) => ({
    r: (d & 4) === 4,
    w: (d & 2) === 2,
    x: (d & 1) === 1,
  });
  return {
    owner: mk(o),
    group: mk(g),
    other: mk(ot),
    setuid: (sp & 4) === 4,
    setgid: (sp & 2) === 2,
    sticky: (sp & 1) === 1,
  };
}

// Plain-English description of what the mode grants.
function describe(state) {
  const parts = CLASSES.map((c) => {
    const cls = state[c.key];
    const granted = PERMS.filter((p) => cls[p.key]).map((p) =>
      p.label.toLowerCase()
    );
    const text = granted.length ? granted.join(", ") : "no access";
    return `${c.label} can ${text}`;
  });
  const specials = SPECIAL.filter((s) => state[s.key]).map((s) => s.label);
  let s = parts.join("; ") + ".";
  if (specials.length) s += ` Special bits: ${specials.join(", ")}.`;
  return s;
}

export default function ChmodCalculator() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [octalInput, setOctalInput] = useState("644");
  const [octalError, setOctalError] = useState("");
  const [copied, setCopied] = useState("");

  const digits = useMemo(() => {
    return {
      special: specialDigit(state),
      owner: clsDigit(state.owner),
      group: clsDigit(state.group),
      other: clsDigit(state.other),
    };
  }, [state]);

  const octal3 = `${digits.owner}${digits.group}${digits.other}`;
  const octal4 = `${digits.special}${octal3}`;
  const useSpecial = digits.special > 0;
  const displayOctal = useSpecial ? octal4 : octal3;
  const symbolic = useMemo(() => symbolicFor(state), [state]);
  const command = `chmod ${displayOctal} filename`;
  const humanText = useMemo(() => describe(state), [state]);

  function togglePerm(clsKey, permKey) {
    setCopied("");
    setState((prev) => {
      const next = {
        ...prev,
        [clsKey]: { ...prev[clsKey], [permKey]: !prev[clsKey][permKey] },
      };
      setOctalInput(
        `${specialDigit(next)}${clsDigit(next.owner)}${clsDigit(
          next.group
        )}${clsDigit(next.other)}`.replace(/^0/, "")
      );
      setOctalError("");
      return next;
    });
  }

  function toggleSpecial(key) {
    setCopied("");
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const sp = specialDigit(next);
      setOctalInput(
        (sp > 0 ? String(sp) : "") +
          `${clsDigit(next.owner)}${clsDigit(next.group)}${clsDigit(
            next.other
          )}`
      );
      setOctalError("");
      return next;
    });
  }

  function applyOctal(value) {
    setOctalInput(value);
    setCopied("");
    if (value.trim() === "") {
      setOctalError("");
      return;
    }
    const parsed = parseOctal(value);
    if (!parsed) {
      setOctalError("Enter 1-4 octal digits (0-7), e.g. 755 or 1777.");
      return;
    }
    setOctalError("");
    setState(parsed);
  }

  async function handleCopy(text, which) {
    try {
      await copyText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }

  function reset() {
    setState(DEFAULT_STATE);
    setOctalInput("644");
    setOctalError("");
    setCopied("");
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        {/* Permission grid */}
        <div className="tool-field">
          <span className="tool-label">Permissions</span>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "22rem",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.5rem" }}>
                    Class
                  </th>
                  {PERMS.map((p) => (
                    <th
                      key={p.key}
                      style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}
                    >
                      {p.label} ({p.value})
                    </th>
                  ))}
                  <th
                    style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}
                  >
                    Octal
                  </th>
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((c) => (
                  <tr key={c.key}>
                    <td style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>
                      {c.label}
                    </td>
                    {PERMS.map((p) => {
                      const id = `chmod-${c.key}-${p.key}`;
                      return (
                        <td
                          key={p.key}
                          style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}
                        >
                          <input
                            id={id}
                            type="checkbox"
                            aria-label={`${c.label} ${p.label}`}
                            checked={state[c.key][p.key]}
                            onChange={() => togglePerm(c.key, p.key)}
                            style={{ width: "1.15rem", height: "1.15rem" }}
                          />
                        </td>
                      );
                    })}
                    <td
                      style={{
                        textAlign: "center",
                        padding: "0.4rem 0.5rem",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                        fontWeight: 700,
                      }}
                    >
                      {clsDigit(state[c.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Special bits */}
        <div className="tool-field">
          <span className="tool-label">Special bits (optional)</span>
          <div
            className="tool-row"
            style={{ flexWrap: "wrap", gap: "1rem", alignItems: "center" }}
          >
            {SPECIAL.map((s) => {
              const id = `chmod-special-${s.key}`;
              return (
                <label
                  key={s.key}
                  htmlFor={id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={state[s.key]}
                    onChange={() => toggleSpecial(s.key)}
                    style={{ width: "1.15rem", height: "1.15rem" }}
                  />
                  {s.label} ({s.value})
                </label>
              );
            })}
          </div>
        </div>

        {/* Octal entry */}
        <div className="tool-field" style={{ maxWidth: "16rem" }}>
          <label className="tool-label" htmlFor="chmod-octal">
            Or type an octal mode
          </label>
          <input
            id="chmod-octal"
            className="tool-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={octalInput}
            placeholder="e.g. 755"
            onChange={(e) => applyOctal(e.target.value)}
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          />
        </div>
        {octalError ? <p className="tool-error">{octalError}</p> : null}
      </div>

      {/* Results */}
      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          >
            {displayOctal}
          </div>
          <div className="tool-stat-label">Octal</div>
        </div>
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          >
            {symbolic}
          </div>
          <div className="tool-stat-label">Symbolic</div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">chmod command</div>
        <div
          className="tool-result-value"
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            wordBreak: "break-all",
          }}
        >
          {command}
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "0.5rem" }}>
        {humanText}
      </p>

      <div className="tool-actions">
        <button
          className={copied === "octal" ? "btn btn-success" : "btn btn-primary"}
          type="button"
          onClick={() => handleCopy(displayOctal, "octal")}
        >
          {copied === "octal" ? "Copied!" : `Copy ${displayOctal}`}
        </button>
        <button
          className={copied === "cmd" ? "btn btn-success" : "btn"}
          type="button"
          onClick={() => handleCopy(command, "cmd")}
        >
          {copied === "cmd" ? "Copied!" : "Copy command"}
        </button>
        <button
          className={copied === "sym" ? "btn btn-success" : "btn"}
          type="button"
          onClick={() => handleCopy(symbolic, "sym")}
        >
          {copied === "sym" ? "Copied!" : "Copy symbolic"}
        </button>
        <button className="btn" type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <p className="tool-note">
        Read = 4, write = 2, execute = 1; add them per class to get each octal
        digit. The leading digit covers the setuid (4), setgid (2) and sticky
        (1) bits and only appears when one is set. Everything is computed in
        your browser — nothing is uploaded.
      </p>
    </div>
  );
}
