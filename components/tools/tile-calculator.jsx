"use client";

import { useState, useMemo } from "react";

// Parse a strictly-positive number from a text input; return null when blank
// or invalid so the UI can stay empty instead of showing NaN.
function parsePositive(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

// Parse a non-negative number (used for waste %, where 0 is valid).
function parseNonNegative(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

function formatNumber(n, decimals) {
  if (!isFinite(n)) return "-";
  const rounded = Number(n.toFixed(decimals));
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

const FEET_TO_METERS = 0.3048;

export default function TileCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [unit, setUnit] = useState("feet"); // "feet" or "meters"
  const [tileWidth, setTileWidth] = useState(""); // cm
  const [tileHeight, setTileHeight] = useState(""); // cm
  const [waste, setWaste] = useState("10");
  const [perBox, setPerBox] = useState("");

  const result = useMemo(() => {
    const l = parsePositive(length);
    const w = parsePositive(width);
    const tw = parsePositive(tileWidth);
    const th = parsePositive(tileHeight);
    const wastePct = parseNonNegative(waste);
    if (l === null || w === null || tw === null || th === null || wastePct === null) {
      return null;
    }

    // Convert the room dimensions to metres, then to an area in m².
    const factor = unit === "feet" ? FEET_TO_METERS : 1;
    const lengthM = l * factor;
    const widthM = w * factor;
    const floorArea = lengthM * widthM; // m²

    // Tile dimensions are entered in centimetres.
    const tileArea = (tw / 100) * (th / 100); // m²

    const areaWithWaste = floorArea * (1 + wastePct / 100);
    const tilesNeeded = Math.ceil(areaWithWaste / tileArea);

    // Tiles per box is optional; only compute boxes when a valid count is given.
    const tilesPerBox = parsePositive(perBox);
    const boxes =
      tilesPerBox !== null ? Math.ceil(tilesNeeded / tilesPerBox) : null;

    return { floorArea, tileArea, areaWithWaste, tilesNeeded, boxes };
  }, [length, width, unit, tileWidth, tileHeight, waste, perBox]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-length">
              Area length
            </label>
            <input
              className="tool-input"
              id="tile-length"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-width-area">
              Area width
            </label>
            <input
              className="tool-input"
              id="tile-width-area"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-unit">
              Unit
            </label>
            <select
              className="tool-select"
              id="tile-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="feet">Feet</option>
              <option value="meters">Meters</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-w">
              Tile width (cm)
            </label>
            <input
              className="tool-input"
              id="tile-w"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={tileWidth}
              onChange={(e) => setTileWidth(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-h">
              Tile height (cm)
            </label>
            <input
              className="tool-input"
              id="tile-h"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={tileHeight}
              onChange={(e) => setTileHeight(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-waste">
              Waste allowance (%)
            </label>
            <input
              className="tool-input"
              id="tile-waste"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={waste}
              onChange={(e) => setWaste(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tile-per-box">
              Tiles per box (optional)
            </label>
            <input
              className="tool-input"
              id="tile-per-box"
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={perBox}
              onChange={(e) => setPerBox(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">FLOOR AREA</p>
        <div className="tool-result-value">
          {result ? `${formatNumber(result.floorArea, 2)} m²` : "-"}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.tilesNeeded, 0) : "-"}
          </div>
          <div className="tool-stat-label">Tiles needed</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.tileArea, 3) : "-"}
          </div>
          <div className="tool-stat-label">Tile area (m²)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result && result.boxes !== null
              ? formatNumber(result.boxes, 0)
              : "-"}
          </div>
          <div className="tool-stat-label">Boxes needed</div>
        </div>
      </div>

      {result && result.boxes === null ? (
        <p className="tool-note">
          Enter the number of tiles per box (shown on the packaging) to
          calculate how many boxes to buy.
        </p>
      ) : null}

      <p className="tool-note">
        Floor area = length × width, converted to square metres. Tiles needed =
        floor area including waste ÷ area of one tile, rounded up. A 10% waste
        allowance covers cuts and breakage; use 15–20% for diagonal or
        herringbone layouts. Keep a few spare tiles for future repairs.
      </p>
    </div>
  );
}
