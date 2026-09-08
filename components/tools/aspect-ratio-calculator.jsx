"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

// Simplify a width:height pair to its smallest integer ratio, handling
// common cinema ratios that don't reduce to tidy small numbers.
function simplifyRatio(w, h) {
  if (!(w > 0) || !(h > 0)) return null;
  // Work with integers where possible; scale decimals up.
  let scale = 1;
  if (!Number.isInteger(w) || !Number.isInteger(h)) {
    scale = 1000;
  }
  const wi = Math.round(w * scale);
  const hi = Math.round(h * scale);
  const g = gcd(wi, hi);
  let rw = wi / g;
  let rh = hi / g;

  // If the reduced numbers are large and ugly, offer a rounded decimal ratio.
  return { rw, rh, decimal: w / h };
}

const PRESETS = [
  { label: "16:9 — Widescreen / YouTube", w: 16, h: 9 },
  { label: "9:16 — Vertical / Reels & TikTok", w: 9, h: 16 },
  { label: "4:3 — Standard / iPad", w: 4, h: 3 },
  { label: "1:1 — Square / Instagram", w: 1, h: 1 },
  { label: "3:2 — 35mm photo / DSLR", w: 3, h: 2 },
  { label: "21:9 — Ultrawide / Cinematic", w: 21, h: 9 },
  { label: "2:3 — Portrait photo / Pinterest", w: 2, h: 3 },
  { label: "5:4 — Large format", w: 5, h: 4 },
  { label: "1.85:1 — Cinema flat", w: 1.85, h: 1 },
  { label: "2.39:1 — Anamorphic scope", w: 2.39, h: 1 },
];

export default function AspectRatioCalculator() {
  // Ratio pair (the aspect ratio to hold constant).
  const [rw, setRw] = useState("16");
  const [rh, setRh] = useState("9");
  // New dimensions to solve.
  const [newW, setNewW] = useState("1920");
  const [newH, setNewH] = useState("1080");
  const [copied, setCopied] = useState("");

  const rwNum = parseFloat(rw);
  const rhNum = parseFloat(rh);
  const ratioValid = rwNum > 0 && rhNum > 0;

  function applyPreset(w, h) {
    setRw(String(w));
    setRh(String(h));
    // Re-solve height from the current width using the new ratio.
    const wNum = parseFloat(newW);
    if (wNum > 0) {
      setNewH(round(wNum * (h / w)));
    }
  }

  function round(n) {
    // Keep integers clean, show up to 2 decimals otherwise.
    if (!Number.isFinite(n)) return "";
    return String(Math.round(n * 100) / 100);
  }

  function onWidthChange(e) {
    const raw = e.target.value;
    setNewW(raw);
    setCopied("");
    const val = parseFloat(raw);
    if (ratioValid && val > 0) {
      setNewH(round(val * (rhNum / rwNum)));
    } else if (raw === "") {
      setNewH("");
    }
  }

  function onHeightChange(e) {
    const raw = e.target.value;
    setNewH(raw);
    setCopied("");
    const val = parseFloat(raw);
    if (ratioValid && val > 0) {
      setNewW(round(val * (rwNum / rhNum)));
    } else if (raw === "") {
      setNewW("");
    }
  }

  function onRatioWidthChange(e) {
    const raw = e.target.value;
    setRw(raw);
    setCopied("");
    const rwv = parseFloat(raw);
    const wNum = parseFloat(newW);
    if (rwv > 0 && rhNum > 0 && wNum > 0) {
      setNewH(round(wNum * (rhNum / rwv)));
    }
  }

  function onRatioHeightChange(e) {
    const raw = e.target.value;
    setRh(raw);
    setCopied("");
    const rhv = parseFloat(raw);
    const wNum = parseFloat(newW);
    if (rwNum > 0 && rhv > 0 && wNum > 0) {
      setNewH(round(wNum * (rhv / rwNum)));
    }
  }

  // Simplified form of the ratio the user typed.
  const simplified = useMemo(() => {
    if (!ratioValid) return null;
    return simplifyRatio(rwNum, rhNum);
  }, [rwNum, rhNum, ratioValid]);

  // Simplified form of the actual new dimensions (independent check).
  const dimSimplified = useMemo(() => {
    const w = parseFloat(newW);
    const h = parseFloat(newH);
    if (!(w > 0) || !(h > 0)) return null;
    return simplifyRatio(w, h);
  }, [newW, newH]);

  const wNum = parseFloat(newW);
  const hNum = parseFloat(newH);
  const dimsValid = wNum > 0 && hNum > 0;

  async function copyDims() {
    if (!dimsValid) return;
    try {
      await copyText(`${round(wNum)} × ${round(hNum)}`);
      setCopied("dims");
    } catch {
      /* clipboard unavailable — leave the button label unchanged */
    }
  }

  const ratioLabel = simplified ? `${round(simplified.rw)}:${round(simplified.rh)}` : "—";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ar-preset">
            Common aspect ratio
          </label>
          <select
            id="ar-preset"
            className="tool-select"
            value={`${rw}:${rh}`}
            onChange={(e) => {
              const p = PRESETS.find((x) => `${x.w}:${x.h}` === e.target.value);
              if (p) applyPreset(p.w, p.h);
            }}
          >
            <option value="">Custom ratio…</option>
            {PRESETS.map((p) => (
              <option key={p.label} value={`${p.w}:${p.h}`}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ar-rw">
              Ratio width
            </label>
            <input
              id="ar-rw"
              className="tool-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={rw}
              onChange={onRatioWidthChange}
              placeholder="e.g. 16"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ar-rh">
              Ratio height
            </label>
            <input
              id="ar-rh"
              className="tool-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={rh}
              onChange={onRatioHeightChange}
              placeholder="e.g. 9"
            />
          </div>
        </div>

        <p className="tool-note">
          Pick a preset or type any ratio. Then enter a width or a height below —
          the other side is filled in to keep the same aspect ratio.
        </p>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ar-w">
              Width (px)
            </label>
            <input
              id="ar-w"
              className="tool-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={newW}
              onChange={onWidthChange}
              placeholder="e.g. 1920"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ar-h">
              Height (px)
            </label>
            <input
              id="ar-h"
              className="tool-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={newH}
              onChange={onHeightChange}
              placeholder="e.g. 1080"
            />
          </div>
        </div>
      </div>

      {ratioValid ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{ratioLabel}</div>
            <div className="tool-stat-label">Aspect ratio</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {simplified ? (simplified.decimal).toFixed(4) : "—"}
            </div>
            <div className="tool-stat-label">Decimal (w ÷ h)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {dimsValid ? `${round(wNum)} × ${round(hNum)}` : "—"}
            </div>
            <div className="tool-stat-label">Dimensions (px)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {dimSimplified
                ? `${round(dimSimplified.rw)}:${round(dimSimplified.rh)}`
                : "—"}
            </div>
            <div className="tool-stat-label">Simplified from px</div>
          </div>
        </div>
      ) : (
        <p className="tool-note">
          Enter a ratio width and height greater than zero to see results.
        </p>
      )}

      {dimsValid && (
        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={copyDims}>
            {copied === "dims" ? "Copied!" : "Copy dimensions"}
          </button>
        </div>
      )}

      <p className="tool-note">
        Everything is calculated in your browser — nothing is uploaded. Great for
        resizing video, photos, and canvases while keeping proportions exact.
      </p>
    </div>
  );
}
