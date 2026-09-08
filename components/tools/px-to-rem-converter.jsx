"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Trim trailing zeros from a fixed-precision string so 1.5000 -> "1.5"
// and 2.0000 -> "2", while keeping meaningful decimals intact.
function trimNumber(n, decimals = 4) {
  if (!Number.isFinite(n)) return "";
  const fixed = n.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}

// Parse a user-entered number, tolerating an accidental "px"/"rem" suffix
// and surrounding whitespace. Returns null when there is no valid number.
function parseNumber(str) {
  if (typeof str !== "string") return null;
  const cleaned = str.trim().replace(/(px|rem)$/i, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Common pixel sizes people convert most often, for the reference table.
const COMMON_PX = [1, 2, 4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 80, 96];

export default function PxToRemConverter() {
  const [base, setBase] = useState("16");
  const [pxInput, setPxInput] = useState("24");
  const [remInput, setRemInput] = useState("1.5");
  const [copied, setCopied] = useState("");

  const baseVal = parseNumber(base);
  const baseValid = baseVal !== null && baseVal > 0;

  const pxVal = parseNumber(pxInput);
  const remVal = parseNumber(remInput);

  // px -> rem uses the current base; guard against a missing/zero base.
  const pxToRem = useMemo(() => {
    if (pxVal === null || !baseValid) return null;
    return pxVal / baseVal;
  }, [pxVal, baseVal, baseValid]);

  // rem -> px uses the current base.
  const remToPx = useMemo(() => {
    if (remVal === null || !baseValid) return null;
    return remVal * baseVal;
  }, [remVal, baseVal, baseValid]);

  const table = useMemo(() => {
    if (!baseValid) return [];
    return COMMON_PX.map((px) => ({
      px,
      rem: trimNumber(px / baseVal),
    }));
  }, [baseVal, baseValid]);

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

  const pxToRemStr = pxToRem === null ? "" : `${trimNumber(pxToRem)}rem`;
  const remToPxStr = remToPx === null ? "" : `${trimNumber(remToPx)}px`;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ptr-base">
            Root font size (base, px)
          </label>
          <input
            id="ptr-base"
            className="tool-input"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
          <p className="tool-note">
            1rem equals this many pixels. Browsers default to 16, so 1rem = 16px
            unless you change the html font-size.
          </p>
        </div>

        {!baseValid && (
          <p className="tool-error">
            Enter a base font size greater than 0 (for example 16).
          </p>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ptr-px">
              Pixels (px)
            </label>
            <input
              id="ptr-px"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode="decimal"
              placeholder="24"
              value={pxInput}
              onChange={(e) => setPxInput(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ptr-rem">
              REM
            </label>
            <input
              id="ptr-rem"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode="decimal"
              placeholder="1.5"
              value={remInput}
              onChange={(e) => setRemInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">
          {pxVal === null ? "px to rem" : `${trimNumber(pxVal)}px in rem`}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="tool-result-value">
            {pxToRemStr || "Enter a pixel value above"}
          </div>
          {pxToRemStr && (
            <button
              type="button"
              className="btn"
              onClick={() => copy(pxToRemStr, "px")}
            >
              {copied === "px" ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">
          {remVal === null ? "rem to px" : `${trimNumber(remVal)}rem in px`}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="tool-result-value">
            {remToPxStr || "Enter a rem value above"}
          </div>
          {remToPxStr && (
            <button
              type="button"
              className="btn"
              onClick={() => copy(remToPxStr, "rem")}
            >
              {copied === "rem" ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {table.length > 0 && (
        <>
          <p className="tool-note" style={{ marginBottom: 0 }}>
            Quick reference at base {trimNumber(baseVal)}px:
          </p>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            {table.map((row) => (
              <div className="tool-stat" key={row.px}>
                <div className="tool-stat-num">{row.rem}</div>
                <div className="tool-stat-label">{row.px}px</div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="tool-note">
        Convert both ways between pixels and rem. The formula is rem = px ÷ base
        and px = rem × base, where the base is your root (html) font-size. Change
        the base above if your project sets html {"{"} font-size {"}"} to
        something other than 16px (a common trick is 62.5%, which makes the base
        10px so 1rem = 10px). Everything is calculated in your browser.
      </p>
    </div>
  );
}
