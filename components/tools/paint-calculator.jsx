"use client";

import { useState, useMemo } from "react";

// Approximate paintable area removed per door or window (m²).
const AREA_PER_OPENING = 1.8;

function parsePositive(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeInt(value) {
  if (value.trim() === "") return 0;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function formatNumber(n, decimals) {
  if (!isFinite(n)) return "-";
  const rounded = Number(n.toFixed(decimals));
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export default function PaintCalculator() {
  const [mode, setMode] = useState("area"); // "area" or "dimensions"
  const [area, setArea] = useState("");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [coats, setCoats] = useState("2");
  const [coverage, setCoverage] = useState("10");
  const [openings, setOpenings] = useState("");

  const result = useMemo(() => {
    // Determine total wall area from the chosen input mode.
    let totalArea = null;
    if (mode === "area") {
      totalArea = parsePositive(area);
    } else {
      const l = parsePositive(length);
      const h = parsePositive(height);
      if (l !== null && h !== null) totalArea = l * h;
    }
    if (totalArea === null) return null;

    const coatsN = parsePositive(coats);
    const coverageN = parsePositive(coverage);
    if (coatsN === null || coverageN === null) return null;

    const openingsN = parseNonNegativeInt(openings);
    if (openingsN === null) return null;

    // Subtract openings, but never go below zero paintable area.
    const paintableArea = Math.max(
      0,
      totalArea - openingsN * AREA_PER_OPENING
    );

    const areaCovered = paintableArea * coatsN;
    const litres = areaCovered / coverageN;

    return {
      totalArea,
      paintableArea,
      areaCovered,
      litres,
      litresToBuy: Math.ceil(litres),
    };
  }, [mode, area, length, height, coats, coverage, openings]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="paint-mode">
              Area input method
            </label>
            <select
              className="tool-select"
              id="paint-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="area">Enter total wall area</option>
              <option value="dimensions">Enter wall length × height</option>
            </select>
          </div>
        </div>

        {mode === "area" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="paint-area">
                Total wall area (m²)
              </label>
              <input
                className="tool-input"
                id="paint-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. 40"
              />
            </div>
          </div>
        ) : (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="paint-length">
                Wall length (m)
              </label>
              <input
                className="tool-input"
                id="paint-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="paint-height">
                Wall height (m)
              </label>
              <input
                className="tool-input"
                id="paint-height"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 2.4"
              />
            </div>
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="paint-coats">
              Number of coats
            </label>
            <input
              className="tool-input"
              id="paint-coats"
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              value={coats}
              onChange={(e) => setCoats(e.target.value)}
              placeholder="2"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="paint-coverage">
              Coverage per litre (m²/L)
            </label>
            <input
              className="tool-input"
              id="paint-coverage"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={coverage}
              onChange={(e) => setCoverage(e.target.value)}
              placeholder="10"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="paint-openings">
              Doors &amp; windows to subtract (optional)
            </label>
            <input
              className="tool-input"
              id="paint-openings"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">PAINT TO BUY</p>
        <div className="tool-result-value">
          {result
            ? `${formatNumber(result.litresToBuy, 0)} L`
            : "-"}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.litres, 2) : "-"}
          </div>
          <div className="tool-stat-label">Litres needed (exact)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.paintableArea, 1) : "-"}
          </div>
          <div className="tool-stat-label">Paintable area (m²)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.areaCovered, 1) : "-"}
          </div>
          <div className="tool-stat-label">Total area covered (m²)</div>
        </div>
      </div>

      <p className="tool-note">
        Paint needed = paintable area × coats ÷ coverage. Each door or window
        subtracts about {AREA_PER_OPENING} m² from the wall area. Coverage
        varies by paint and surface (typically 6–12 m²/L) — buy the rounded-up
        litres and keep a little spare for touch-ups.
      </p>
    </div>
  );
}
