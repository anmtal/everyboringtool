"use client";

import { useState, useMemo } from "react";

// Wall width (in the chosen unit) removed per door or window opening.
// Rough average of a standard door and window run.
const OPENING_WIDTH = { m: 0.9, ft: 3 };

// Sensible default hints per unit (standard European roll ≈ 0.53 m × 10 m).
const HINTS = {
  m: { cover: "e.g. 4", height: "e.g. 2.4", rw: "0.53", rl: "10", repeat: "0.32" },
  ft: { cover: "e.g. 13", height: "e.g. 8", rw: "1.74", rl: "33", repeat: "1.05" },
};

function parsePositive(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

// Non-negative number: empty string counts as 0 (e.g. a plain, no-repeat paper).
function parseNonNegative(value) {
  if (value.trim() === "") return 0;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return null;
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

export default function WallpaperCalculator() {
  const [unit, setUnit] = useState("m"); // "m" or "ft"
  const [mode, setMode] = useState("width"); // "width" or "perimeter"
  const [coverWidth, setCoverWidth] = useState("");
  const [wallHeight, setWallHeight] = useState("");
  const [rollWidth, setRollWidth] = useState("");
  const [rollLength, setRollLength] = useState("");
  const [patternRepeat, setPatternRepeat] = useState("");
  const [openings, setOpenings] = useState("");

  const u = unit === "ft" ? "ft" : "m";
  const unitLabel = u === "ft" ? "ft" : "m";
  const hint = HINTS[u];

  const result = useMemo(() => {
    const width = parsePositive(coverWidth); // total width to cover
    const height = parsePositive(wallHeight);
    const rw = parsePositive(rollWidth);
    const rl = parsePositive(rollLength);
    if (width === null || height === null || rw === null || rl === null) {
      return null;
    }

    const repeat = parseNonNegative(patternRepeat);
    const openingsN = parseNonNegativeInt(openings);
    if (repeat === null || openingsN === null) return null;

    // Subtract opening width from the run to cover, never below zero.
    const openingWidth = OPENING_WIDTH[u];
    const effectiveWidth = Math.max(0, width - openingsN * openingWidth);

    // Number of full-height vertical drops (strips) across the wall.
    const stripsNeeded = Math.ceil(effectiveWidth / rw);

    // Each strip is cut to the next whole pattern repeat so patterns line up.
    const cutLength = repeat > 0 ? Math.ceil(height / repeat) * repeat : height;
    const wastePerStrip = cutLength - height;

    // How many usable strips come from one roll.
    const stripsPerRoll = Math.floor(rl / cutLength);
    const rollTooShort = stripsPerRoll < 1;

    let rollsRequired = null;
    if (!rollTooShort) {
      rollsRequired =
        stripsNeeded === 0 ? 0 : Math.ceil(stripsNeeded / stripsPerRoll);
    }

    return {
      effectiveWidth,
      stripsNeeded,
      cutLength,
      wastePerStrip,
      stripsPerRoll,
      rollTooShort,
      rollsRequired,
    };
  }, [coverWidth, wallHeight, rollWidth, rollLength, patternRepeat, openings, u]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="wp-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="m">Meters (m)</option>
              <option value="ft">Feet (ft)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-mode">
              Wall measurement
            </label>
            <select
              className="tool-select"
              id="wp-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="width">Total wall width</option>
              <option value="perimeter">Room perimeter</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-cover">
              {mode === "perimeter" ? "Room perimeter" : "Total wall width"} (
              {unitLabel})
            </label>
            <input
              className="tool-input"
              id="wp-cover"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={coverWidth}
              onChange={(e) => setCoverWidth(e.target.value)}
              placeholder={hint.cover}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-height">
              Wall height ({unitLabel})
            </label>
            <input
              className="tool-input"
              id="wp-height"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={wallHeight}
              onChange={(e) => setWallHeight(e.target.value)}
              placeholder={hint.height}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-roll-width">
              Roll width ({unitLabel})
            </label>
            <input
              className="tool-input"
              id="wp-roll-width"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={rollWidth}
              onChange={(e) => setRollWidth(e.target.value)}
              placeholder={hint.rw}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-roll-length">
              Roll length ({unitLabel})
            </label>
            <input
              className="tool-input"
              id="wp-roll-length"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={rollLength}
              onChange={(e) => setRollLength(e.target.value)}
              placeholder={hint.rl}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-repeat">
              Pattern repeat ({unitLabel}, 0 if plain)
            </label>
            <input
              className="tool-input"
              id="wp-repeat"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={patternRepeat}
              onChange={(e) => setPatternRepeat(e.target.value)}
              placeholder={hint.repeat}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="wp-openings">
              Doors &amp; windows to subtract (optional)
            </label>
            <input
              className="tool-input"
              id="wp-openings"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        </div>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">ROLLS REQUIRED</p>
        <div className="tool-result-value">
          {result && !result.rollTooShort
            ? `${formatNumber(result.rollsRequired, 0)} ${
                result.rollsRequired === 1 ? "roll" : "rolls"
              }`
            : "-"}
        </div>
      </div>

      {result && result.rollTooShort && (
        <p className="tool-error">
          Each roll is too short for one full drop ({formatNumber(result.cutLength, 2)}{" "}
          {unitLabel} including pattern repeat). Check the roll length, wall
          height, or pattern repeat.
        </p>
      )}

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.stripsNeeded, 0) : "-"}
          </div>
          <div className="tool-stat-label">Strips needed</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result && !result.rollTooShort
              ? formatNumber(result.stripsPerRoll, 0)
              : "-"}
          </div>
          <div className="tool-stat-label">Strips per roll</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? `${formatNumber(result.cutLength, 2)} ${unitLabel}` : "-"}
          </div>
          <div className="tool-stat-label">Cut length per strip</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? `${formatNumber(result.wastePerStrip, 2)} ${unitLabel}` : "-"}
          </div>
          <div className="tool-stat-label">Trim waste per strip</div>
        </div>
      </div>

      <p className="tool-note">
        Strips needed = width to cover ÷ roll width (rounded up). Each strip is
        cut up to the next whole pattern repeat so patterns match, so cut length
        = height rounded up to a multiple of the repeat. Strips per roll = roll
        length ÷ cut length (rounded down), and rolls = strips needed ÷ strips
        per roll (rounded up). Each door or window subtracts about{" "}
        {OPENING_WIDTH[u]} {unitLabel} of width. Buy one extra roll for trims and
        future repairs, and check that all rolls share the same batch number.
      </p>
    </div>
  );
}
