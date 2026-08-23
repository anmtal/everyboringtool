"use client";

import { useState, useMemo } from "react";

// Base cooling load in BTU/hr per square foot, by climate zone.
const CLIMATE = {
  mild: { label: "Mild (cooler summers)", cool: 18, heat: 45 },
  moderate: { label: "Moderate (warm summers)", cool: 22, heat: 35 },
  hot: { label: "Hot (very warm / humid)", cool: 27, heat: 25 },
};

// Multiplier applied for how much direct sun the space gets.
const SUN = {
  shaded: { label: "Mostly shaded", factor: 0.9 },
  average: { label: "Average", factor: 1.0 },
  sunny: { label: "Very sunny", factor: 1.1 },
};

const BTU_PER_OCCUPANT = 600; // heat added per person
const BTU_PER_WINDOW = 1000; // heat gain per window
const STANDARD_CEILING_FT = 8; // baseline ceiling height
const SQFT_PER_SQM = 10.7639;
const FT_PER_M = 3.28084;

function parsePositive(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

function parseCount(value) {
  if (value.trim() === "") return 0;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function formatInt(n) {
  if (!isFinite(n)) return "-";
  return Math.round(n).toLocaleString("en-US");
}

function formatDecimal(n, decimals) {
  if (!isFinite(n)) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function HvacLoadEstimator() {
  const [units, setUnits] = useState("imperial"); // "imperial" or "metric"
  const [area, setArea] = useState("");
  const [ceiling, setCeiling] = useState("8");
  const [climate, setClimate] = useState("moderate");
  const [sun, setSun] = useState("average");
  const [occupants, setOccupants] = useState("2");
  const [windows, setWindows] = useState("4");

  const isMetric = units === "metric";

  // Convert existing values when the user switches unit systems so the
  // numbers stay physically meaningful instead of silently changing.
  function switchUnits(next) {
    if (next === units) return;
    const a = Number(area);
    const c = Number(ceiling);
    if (next === "metric") {
      if (area.trim() !== "" && isFinite(a)) {
        setArea(String(Number((a / SQFT_PER_SQM).toFixed(2))));
      }
      if (ceiling.trim() !== "" && isFinite(c)) {
        setCeiling(String(Number((c / FT_PER_M).toFixed(2))));
      }
    } else {
      if (area.trim() !== "" && isFinite(a)) {
        setArea(String(Number((a * SQFT_PER_SQM).toFixed(0))));
      }
      if (ceiling.trim() !== "" && isFinite(c)) {
        setCeiling(String(Number((c * FT_PER_M).toFixed(1))));
      }
    }
    setUnits(next);
  }

  const result = useMemo(() => {
    const rawArea = parsePositive(area);
    if (rawArea === null) return null;

    const occ = parseCount(occupants);
    const wins = parseCount(windows);
    if (occ === null || wins === null) return null;

    // Normalise everything to imperial units for the calculation.
    const areaSqFt = isMetric ? rawArea * SQFT_PER_SQM : rawArea;

    let ceilingFt = STANDARD_CEILING_FT;
    const rawCeiling = parsePositive(ceiling);
    if (rawCeiling !== null) {
      ceilingFt = isMetric ? rawCeiling * FT_PER_M : rawCeiling;
    }
    const ceilingFactor = ceilingFt / STANDARD_CEILING_FT;

    const climateData = CLIMATE[climate] || CLIMATE.moderate;
    const sunData = SUN[sun] || SUN.average;

    // Cooling: base envelope load, scaled for ceiling volume and sun,
    // then internal gains from people and windows.
    const envelopeCool = areaSqFt * climateData.cool * ceilingFactor;
    const coolingBtu =
      envelopeCool * sunData.factor +
      occ * BTU_PER_OCCUPANT +
      wins * BTU_PER_WINDOW;

    // Round cooling load to the nearest 500 BTU for a cleaner estimate.
    const coolingBtuRounded = Math.round(coolingBtu / 500) * 500;

    const tons = coolingBtu / 12000;
    // Suggested unit size rounded up to the nearest half ton.
    const tonsRounded = Math.max(0.5, Math.ceil(tons * 2) / 2);

    // Heating: envelope-driven furnace estimate for the same climate.
    const furnaceBtu = areaSqFt * climateData.heat * ceilingFactor;
    const furnaceBtuRounded = Math.round(furnaceBtu / 1000) * 1000;

    return {
      areaSqFt,
      coolingBtu: coolingBtuRounded,
      tons,
      tonsRounded,
      furnaceBtu: furnaceBtuRounded,
      btuPerSqFt: coolingBtu / areaSqFt,
    };
  }, [area, ceiling, climate, sun, occupants, windows, isMetric]);

  const areaLabel = isMetric ? "Floor area (m²)" : "Floor area (sq ft)";
  const ceilingLabel = isMetric ? "Ceiling height (m)" : "Ceiling height (ft)";
  const areaPlaceholder = isMetric ? "e.g. 90" : "e.g. 1000";
  const ceilingPlaceholder = isMetric ? "2.4" : "8";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-actions">
          <button
            type="button"
            className={
              units === "imperial" ? "btn btn-primary" : "btn"
            }
            onClick={() => switchUnits("imperial")}
          >
            Imperial (sq ft)
          </button>
          <button
            type="button"
            className={units === "metric" ? "btn btn-primary" : "btn"}
            onClick={() => switchUnits("metric")}
          >
            Metric (m²)
          </button>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hvac-area">
              {areaLabel}
            </label>
            <input
              className="tool-input"
              id="hvac-area"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={areaPlaceholder}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hvac-ceiling">
              {ceilingLabel}
            </label>
            <input
              className="tool-input"
              id="hvac-ceiling"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={ceiling}
              onChange={(e) => setCeiling(e.target.value)}
              placeholder={ceilingPlaceholder}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hvac-climate">
              Climate zone
            </label>
            <select
              className="tool-select"
              id="hvac-climate"
              value={climate}
              onChange={(e) => setClimate(e.target.value)}
            >
              {Object.keys(CLIMATE).map((key) => (
                <option key={key} value={key}>
                  {CLIMATE[key].label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hvac-sun">
              Sun exposure
            </label>
            <select
              className="tool-select"
              id="hvac-sun"
              value={sun}
              onChange={(e) => setSun(e.target.value)}
            >
              {Object.keys(SUN).map((key) => (
                <option key={key} value={key}>
                  {SUN[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hvac-occupants">
              Number of occupants
            </label>
            <input
              className="tool-input"
              id="hvac-occupants"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={occupants}
              onChange={(e) => setOccupants(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hvac-windows">
              Number of windows
            </label>
            <input
              className="tool-input"
              id="hvac-windows"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={windows}
              onChange={(e) => setWindows(e.target.value)}
              placeholder="e.g. 4"
            />
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">ESTIMATED COOLING LOAD</p>
        <div className="tool-result-value">
          {result ? `${formatInt(result.coolingBtu)} BTU/hr` : "-"}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatDecimal(result.tonsRounded, 1) : "-"}
          </div>
          <div className="tool-stat-label">Suggested AC size (tons)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatDecimal(result.tons, 2) : "-"}
          </div>
          <div className="tool-stat-label">Exact cooling (tons)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? `${formatInt(result.furnaceBtu)}` : "-"}
          </div>
          <div className="tool-stat-label">Rough furnace (BTU/hr)</div>
        </div>
      </div>

      {result ? (
        <p className="tool-note">
          Based on about {formatDecimal(result.btuPerSqFt, 1)} BTU/hr per sq ft
          for this space. One ton of cooling equals 12,000 BTU/hr. Each occupant
          adds {formatInt(BTU_PER_OCCUPANT)} BTU/hr and each window about{" "}
          {formatInt(BTU_PER_WINDOW)} BTU/hr; taller ceilings and stronger sun
          push the load higher.
        </p>
      ) : (
        <p className="tool-note">
          Enter your floor area to estimate the cooling and heating load. Ceiling
          height, climate, sun exposure, occupants, and windows all refine the
          result.
        </p>
      )}

      <p className="tool-error" role="note">
        Rough estimate only. Real sizing depends on insulation, air sealing,
        ductwork, humidity, and local design temperatures. Have an HVAC
        professional run a full Manual J load calculation before buying or
        installing equipment. Oversized systems short-cycle and waste energy.
      </p>
    </div>
  );
}
