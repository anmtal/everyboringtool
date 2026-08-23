"use client";

import { useState, useMemo } from "react";

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

export default function FenceCalculator() {
  const [length, setLength] = useState("");
  const [spacing, setSpacing] = useState("8");
  const [railsPerSection, setRailsPerSection] = useState("3");
  const [unit, setUnit] = useState("feet");
  const [gateCount, setGateCount] = useState("");
  const [gateWidth, setGateWidth] = useState("4");

  const unitLabel = unit === "feet" ? "ft" : "m";

  const result = useMemo(() => {
    const lengthN = parsePositive(length);
    const spacingN = parsePositive(spacing);
    if (lengthN === null || spacingN === null) return null;

    const railsN = parseNonNegativeInt(railsPerSection);
    if (railsN === null) return null;

    const gatesN = parseNonNegativeInt(gateCount);
    if (gatesN === null) return null;

    // A gate replaces a run of fencing, so subtract each gate's width from
    // the total fencing length before working out how many sections remain.
    const gateWidthN = gatesN > 0 ? parsePositive(gateWidth) : 0;
    if (gatesN > 0 && gateWidthN === null) return null;

    const gateTotal = gatesN * (gateWidthN || 0);
    const fenceLength = Math.max(0, lengthN - gateTotal);

    const sections = fenceLength > 0 ? Math.ceil(fenceLength / spacingN) : 0;
    // Each section is bounded by a post, plus one closing post at the end.
    // Every gate is hung between its own pair of posts.
    const linePosts = sections > 0 ? sections + 1 : 0;
    const gatePosts = gatesN * 2;
    const posts = sections > 0 ? linePosts + gatePosts : gatePosts;
    const rails = sections * railsN;

    return {
      sections,
      posts,
      rails,
      fenceLength,
      gateTotal,
      gatesN,
      spacingN,
    };
  }, [length, spacing, railsPerSection, gateCount, gateWidth]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fence-length">
              Total fence length ({unitLabel})
            </label>
            <input
              className="tool-input"
              id="fence-length"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g. 120"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fence-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="fence-unit"
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
            <label className="tool-label" htmlFor="fence-spacing">
              Post spacing ({unitLabel})
            </label>
            <input
              className="tool-input"
              id="fence-spacing"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={spacing}
              onChange={(e) => setSpacing(e.target.value)}
              placeholder="8"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fence-rails">
              Rails per section
            </label>
            <input
              className="tool-input"
              id="fence-rails"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={railsPerSection}
              onChange={(e) => setRailsPerSection(e.target.value)}
              placeholder="3"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fence-gates">
              Gates (optional)
            </label>
            <input
              className="tool-input"
              id="fence-gates"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={gateCount}
              onChange={(e) => setGateCount(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fence-gate-width">
              Gate width ({unitLabel})
            </label>
            <input
              className="tool-input"
              id="fence-gate-width"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={gateWidth}
              onChange={(e) => setGateWidth(e.target.value)}
              placeholder="4"
            />
          </div>
        </div>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">POSTS NEEDED</p>
        <div className="tool-result-value">
          {result ? formatNumber(result.posts, 0) : "-"}
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.sections, 0) : "-"}
          </div>
          <div className="tool-stat-label">Sections</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.posts, 0) : "-"}
          </div>
          <div className="tool-stat-label">Posts</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.rails, 0) : "-"}
          </div>
          <div className="tool-stat-label">Rails</div>
        </div>
      </div>

      <p className="tool-note">
        Sections = fence length ÷ post spacing, rounded up. Posts = sections + 1
        (a post at every join plus one to close the run), and rails = sections ×
        rails per section.
        {result && result.gatesN > 0
          ? ` ${formatNumber(result.gateTotal, 2)} ${unitLabel} was subtracted for ${formatNumber(
              result.gatesN,
              0
            )} gate${result.gatesN === 1 ? "" : "s"}, each hung between its own pair of posts.`
          : " Add gates to subtract their width from the fencing run."}{" "}
        Closer post spacing adds strength on slopes or windy sites — buy a few
        extra posts and rails to allow for corners, waste and cuts.
      </p>
    </div>
  );
}
