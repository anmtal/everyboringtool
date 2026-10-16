"use client";

import { useState } from "react";

// Everything is computed in feet and cubic feet, then converted for display.

// How many feet in one of each length unit.
const TO_FEET = {
  ft: 1,
  in: 1 / 12,
  m: 1 / 0.3048,
  cm: 1 / 30.48,
};

const UNIT_LABELS = {
  ft: "Feet (ft)",
  in: "Inches (in)",
  m: "Meters (m)",
  cm: "Centimeters (cm)",
};

const UNIT_ORDER = ["ft", "in", "m", "cm"];

// How many square feet in one of each area unit (the "Total area" input).
const AREA_TO_SQFT = {
  sqft: 1,
  m2: 1 / (0.3048 * 0.3048),
};

const AREA_LABELS = {
  sqft: "Square feet (sq ft)",
  m2: "Square meters (m²)",
};

// If any measurement uses one of these, the headline reads in cubic yards;
// otherwise it reads in cubic meters.
const IMPERIAL_UNITS = new Set(["ft", "in", "sqft"]);

const FT3_PER_YD3 = 27; // a cubic yard is 3 ft x 3 ft x 3 ft
const M3_PER_FT3 = 0.3048 * 0.3048 * 0.3048; // 0.0283168...
const FT3_PER_M3 = 1 / M3_PER_FT3; // 35.3147...
const LITRES_PER_FT3 = M3_PER_FT3 * 1000; // 28.3168...
const FT3_PER_LITRE = 0.0353147;
const KG_PER_LB = 0.45359237;

// Normal-weight concrete is roughly 145-150 lb/ft³ (about 2,400 kg/m³), which
// puts a cubic yard at about 4,000 lb (150 x 27 = 4,050). Approximate.
const CONCRETE_LB_PER_FT3 = 150;
const CONCRETE_KG_PER_M3 = 2400;

// Bag yields: cubic feet of placed concrete per bag.
// lb sizes come from the QUIKRETE Concrete Mix (No. 1101) data sheet: 40 lb
// yields about 0.30 ft³ (8.5 L), 50 lb 0.375 ft³ (10.6 L), 60 lb 0.45 ft³
// (12.7 L) and 80 lb 0.60 ft³ (17 L).
// kg sizes are NOT manufacturer figures. They are scaled at the same yield per
// kg as the 80 lb bag (0.60 ft³ / 36.29 kg = about 0.468 L per kg), giving
// 25 kg about 11.7 L (85.4 per m³, so 86 bags) and 20 kg about 9.4 L. They are
// approximate, and the UI says so.
const FT3_PER_KG = 0.6 / (80 * KG_PER_LB);

const BAG_OPTIONS = [
  { id: "80lb", label: "80 lb", yieldFt3: 0.6, lb: 80 },
  { id: "60lb", label: "60 lb", yieldFt3: 0.45, lb: 60 },
  { id: "50lb", label: "50 lb", yieldFt3: 0.375, lb: 50 },
  { id: "40lb", label: "40 lb", yieldFt3: 0.3, lb: 40 },
  { id: "25kg", label: "25 kg", yieldFt3: 25 * FT3_PER_KG, kg: 25, approx: true },
  { id: "20kg", label: "20 kg", yieldFt3: 20 * FT3_PER_KG, kg: 20, approx: true },
  { id: "custom", label: "Custom (yield from bag)" },
];

const STANDARD_BAGS = BAG_OPTIONS.filter((b) => b.yieldFt3);
const BAG_80 = BAG_OPTIONS[0];
const BAG_60 = BAG_OPTIONS[1];

// Actual (dressed) sizes of nominal lumber posts.
const POST_OPTIONS = [
  { id: "none", label: "None", sideIn: 0 },
  { id: "4x4", label: "4×4 post (3.5 × 3.5 in actual)", sideIn: 3.5 },
  { id: "6x6", label: "6×6 post (5.5 × 5.5 in actual)", sideIn: 5.5 },
];

const WASTE_OPTIONS = [
  { value: "0", label: "None" },
  { value: "5", label: "5%" },
  { value: "10", label: "10% (typical)" },
  { value: "15", label: "15%" },
];

const THICKNESS_PRESETS = [
  { inches: "4", title: "patio / walkway" },
  { inches: "5", title: "driveway" },
  { inches: "6", title: "heavy-duty driveway or garage" },
];

const SHAPES = [
  { id: "slab", label: "Slab / footing" },
  { id: "round", label: "Round hole / column" },
  { id: "steps", label: "Steps" },
];

const SHAPE_HELP = {
  slab: "For slabs, pads, patios, driveways and footings. For a wall, enter its height as the width.",
  round:
    "Also works for Sonotube forms, round columns and round slabs (use thickness as depth). The post option assumes the post runs the full depth.",
  steps:
    "For solid steps poured down to the ground, like a front stoop. Rise is the height of each step; run is the depth of each tread.",
};

// Bag counts round UP, but a float artifact must never add a bag: a 12 x 12 ft
// slab at 4 in is exactly 80 x 80 lb bags, and 48 / 0.6 can come out as
// 80.00000000000001, which a bare Math.ceil would turn into 81.
function ceilCount(x) {
  return Math.ceil(Number(x.toFixed(6)));
}

function bagsFor(ft3, yieldFt3) {
  return ceilCount(ft3 / yieldFt3);
}

function parsePositive(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

// Optional measurement (e.g. the top landing): empty counts as 0.
function parseOptional(value) {
  if (typeof value !== "string" || value.trim() === "") return 0;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

// Whole number of 1 or more. Empty returns emptyValue.
function parseCount(value, emptyValue) {
  if (typeof value !== "string" || value.trim() === "") return emptyValue;
  const n = Number(value);
  if (!isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

// Cylinder minus a square post that runs the full depth.
function roundVolumeFt3(diameterFt, depthFt, postSideFt) {
  const r = diameterFt / 2;
  return (Math.PI * r * r - postSideFt * postSideFt) * depthFt;
}

// Solid steps poured to the ground: step i is a block i rises tall, so the
// side profile is R x T x n(n+1)/2, plus an optional top landing at full height.
// V = W x (R x T x n(n+1)/2 + P x R x n)
function stepsVolumeFt3(n, riseFt, runFt, widthFt, landingFt) {
  return widthFt * ((riseFt * runFt * n * (n + 1)) / 2 + landingFt * riseFt * n);
}

// The units that decide whether the headline reads in yd³ or m³.
function activeUnits(s) {
  if (s.shape === "round") return [s.diameterUnit, s.depthUnit];
  if (s.shape === "steps") {
    const units = [s.riseUnit, s.runUnit, s.stepWidthUnit];
    if (s.landing.trim() !== "") units.push(s.landingUnit);
    return units;
  }
  if (s.measure === "area") return [s.areaUnit, s.thicknessUnit];
  return [s.lengthUnit, s.widthUnit, s.thicknessUnit];
}

// Returns null while inputs are incomplete, { error } for impossible input,
// or { rawFt3 } (volume before any waste allowance, all quantities included).
function pourVolume(s) {
  const qty = parseCount(s.quantity, 1);
  if (qty === null) return { error: "Quantity must be a whole number, 1 or more." };

  let unitFt3;
  if (s.shape === "round") {
    const d = parsePositive(s.diameter);
    const h = parsePositive(s.depth);
    if (d === null || h === null) return null;
    const dFt = d * TO_FEET[s.diameterUnit];
    const hFt = h * TO_FEET[s.depthUnit];
    const post = POST_OPTIONS.find((p) => p.id === s.post) || POST_OPTIONS[0];
    const postFt = post.sideIn / 12;
    if (postFt * postFt >= Math.PI * (dFt / 2) * (dFt / 2)) {
      return { error: "The post fills the whole hole. Enter a wider hole or choose a smaller post." };
    }
    unitFt3 = roundVolumeFt3(dFt, hFt, postFt);
  } else if (s.shape === "steps") {
    const n = parseCount(s.steps, null);
    const rise = parsePositive(s.rise);
    const run = parsePositive(s.run);
    const width = parsePositive(s.stepWidth);
    const landing = parseOptional(s.landing);
    if (n === null || rise === null || run === null || width === null || landing === null) return null;
    unitFt3 = stepsVolumeFt3(
      n,
      rise * TO_FEET[s.riseUnit],
      run * TO_FEET[s.runUnit],
      width * TO_FEET[s.stepWidthUnit],
      landing * TO_FEET[s.landingUnit]
    );
  } else {
    const t = parsePositive(s.thickness);
    let areaFt2 = null;
    if (s.measure === "area") {
      const a = parsePositive(s.area);
      if (a !== null) areaFt2 = a * AREA_TO_SQFT[s.areaUnit];
    } else {
      const l = parsePositive(s.length);
      const w = parsePositive(s.width);
      if (l !== null && w !== null) areaFt2 = l * TO_FEET[s.lengthUnit] * (w * TO_FEET[s.widthUnit]);
    }
    if (areaFt2 === null || t === null) return null;
    unitFt3 = areaFt2 * (t * TO_FEET[s.thicknessUnit]);
  }

  const rawFt3 = unitFt3 * qty;
  if (!isFinite(rawFt3) || rawFt3 <= 0) return null;
  return { rawFt3 };
}

// Yield per bag in ft³ for the selected size, or null for an unfilled Custom.
function selectedYieldFt3(bagId, customYield, customYieldUnit) {
  const opt = BAG_OPTIONS.find((b) => b.id === bagId);
  if (opt && opt.yieldFt3) return opt.yieldFt3;
  const y = parsePositive(customYield);
  if (y === null) return null;
  return customYieldUnit === "L" ? y * FT3_PER_LITRE : y;
}

// Order amounts for a raw volume: the waste allowance is added once here, and
// bags, cost and the other bag sizes all come from the same orderFt3.
function orderFor(rawFt3, wasteValue, yieldFt3) {
  const wastePct = Number(wasteValue) || 0;
  const orderFt3 = rawFt3 * (1 + wastePct / 100);
  return {
    wastePct,
    rawFt3,
    rawYd3: rawFt3 / FT3_PER_YD3,
    rawM3: rawFt3 * M3_PER_FT3,
    orderFt3,
    orderYd3: orderFt3 / FT3_PER_YD3,
    orderM3: orderFt3 * M3_PER_FT3,
    bags: yieldFt3 ? bagsFor(orderFt3, yieldFt3) : null,
    pourLb: rawFt3 * CONCRETE_LB_PER_FT3,
    pourKg: rawFt3 * M3_PER_FT3 * CONCRETE_KG_PER_M3,
    others: STANDARD_BAGS.map((b) => ({
      id: b.id,
      label: b.label,
      approx: !!b.approx,
      count: bagsFor(orderFt3, b.yieldFt3),
    })),
  };
}

// toPrecision(12) first strips float noise, so 9.624999999999998 (3 steps at
// 7 x 11 in, 3 ft wide) rounds as 9.625 -> 9.63 like the hand calculation.
function formatNumber(n, decimals) {
  if (!isFinite(n)) return "-";
  const rounded = Number(Number(n.toPrecision(12)).toFixed(decimals));
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// Volumes: 2 decimals, or 3 for small pours so a post hole doesn't read 0.00.
function formatVolume(n) {
  return formatNumber(n, n < 0.1 ? 3 : 2);
}

function formatMoney(n) {
  if (!isFinite(n)) return "-";
  const parts = Number(n.toPrecision(12)).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// Data-sheet yields keep their precision (0.30, 0.375, 0.45, 0.60); the
// estimated kg yields show 2 decimals.
function formatYield(ft3, approx) {
  if (approx) return ft3.toFixed(2);
  const s = String(Number(ft3.toFixed(3)));
  const decimals = (s.split(".")[1] || "").length;
  return decimals < 2 ? ft3.toFixed(2) : s;
}

// Reference tables, generated from the same constants as the calculator.
const BAG_TABLE = STANDARD_BAGS.map((b) => ({
  id: b.id,
  label: b.label,
  approx: !!b.approx,
  yieldFt3: b.yieldFt3,
  yieldL: b.yieldFt3 * LITRES_PER_FT3,
  perYd3: bagsFor(FT3_PER_YD3, b.yieldFt3),
  perM3: bagsFor(FT3_PER_M3, b.yieldFt3),
  sqFtAt4in: b.yieldFt3 / (4 / 12),
}));

const SLAB_SIZES = [
  [4, 4],
  [4, 8],
  [10, 10],
  [12, 12],
  [10, 20],
  [20, 20],
  [24, 24],
];

const SLAB_TABLE = SLAB_SIZES.map(([l, w]) => {
  const ft3 = l * w * (4 / 12);
  return {
    key: `${l}x${w}`,
    l,
    w,
    yd3: ft3 / FT3_PER_YD3,
    bags80: bagsFor(ft3, BAG_80.yieldFt3),
    bags60: bagsFor(ft3, BAG_60.yieldFt3),
    bags80Extra: bagsFor(ft3 * 1.1, BAG_80.yieldFt3),
  };
});

const SIX_INCH_10X10_FT3 = 10 * 10 * (6 / 12);
const SIX_INCH_EXAMPLE = {
  yd3: SIX_INCH_10X10_FT3 / FT3_PER_YD3,
  bags80: bagsFor(SIX_INCH_10X10_FT3, BAG_80.yieldFt3),
};

export default function ConcreteCalculator() {
  const [shape, setShape] = useState("slab");
  // Slab / footing
  const [measure, setMeasure] = useState("dims"); // "dims" | "area"
  const [length, setLength] = useState("");
  const [lengthUnit, setLengthUnit] = useState("ft");
  const [width, setWidth] = useState("");
  const [widthUnit, setWidthUnit] = useState("ft");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("sqft");
  const [thickness, setThickness] = useState("");
  const [thicknessUnit, setThicknessUnit] = useState("in");
  // Round hole / column
  const [diameter, setDiameter] = useState("");
  const [diameterUnit, setDiameterUnit] = useState("in");
  const [depth, setDepth] = useState("");
  const [depthUnit, setDepthUnit] = useState("in");
  const [post, setPost] = useState("none");
  // Steps
  const [steps, setSteps] = useState("");
  const [rise, setRise] = useState("");
  const [riseUnit, setRiseUnit] = useState("in");
  const [run, setRun] = useState("");
  const [runUnit, setRunUnit] = useState("in");
  const [stepWidth, setStepWidth] = useState("");
  const [stepWidthUnit, setStepWidthUnit] = useState("ft");
  const [landing, setLanding] = useState("");
  const [landingUnit, setLandingUnit] = useState("in");
  // Every shape
  const [quantity, setQuantity] = useState("1");
  const [waste, setWaste] = useState("10");
  const [bag, setBag] = useState("80lb");
  const [customYield, setCustomYield] = useState("");
  const [customYieldUnit, setCustomYieldUnit] = useState("ft3");
  const [priceBag, setPriceBag] = useState("");
  const [priceReady, setPriceReady] = useState("");

  const bagOpt = BAG_OPTIONS.find((b) => b.id === bag) || BAG_80;
  const isCustom = bag === "custom";

  const inputs = {
    shape, measure, length, lengthUnit, width, widthUnit, area, areaUnit, thickness, thicknessUnit,
    diameter, diameterUnit, depth, depthUnit, post,
    steps, rise, riseUnit, run, runUnit, stepWidth, stepWidthUnit, landing, landingUnit,
    quantity,
  };
  const imperial = activeUnits(inputs).some((u) => IMPERIAL_UNITS.has(u));

  // Cheap arithmetic, so it simply runs on every render.
  const volume = pourVolume(inputs);
  const error = volume && volume.error ? volume.error : null;
  const result =
    volume && !volume.error
      ? orderFor(volume.rawFt3, waste, selectedYieldFt3(bag, customYield, customYieldUnit))
      : null;

  const bagWord = isCustom ? "Bags" : `${bagOpt.label} bags`;

  let bagWeight = null;
  if (result && result.bags !== null && !isCustom) {
    if (bagOpt.kg) {
      const kg = result.bags * bagOpt.kg;
      bagWeight = { value: `${formatNumber(kg, 0)} kg`, alt: `≈ ${formatNumber(kg / KG_PER_LB, 0)} lb` };
    } else {
      const lb = result.bags * bagOpt.lb;
      bagWeight = { value: `${formatNumber(lb, 0)} lb`, alt: `≈ ${formatNumber(lb * KG_PER_LB, 0)} kg` };
    }
  }

  const bagPrice = parsePositive(priceBag);
  const readyPrice = parsePositive(priceReady);
  const readyUnit = imperial ? "yd³" : "m³";
  const readyVolume = result ? (imperial ? result.orderYd3 : result.orderM3) : null;

  const applyPreset = (inches) => {
    setThickness(inches);
    setThicknessUnit("in");
  };

  const renderUnitSelect = (id, labelText, unit, setUnit) => (
    <select
      className="tool-select"
      id={`${id}-unit`}
      aria-label={`${labelText} unit`}
      value={unit}
      onChange={(e) => setUnit(e.target.value)}
      style={{ flex: "0 0 auto", width: "auto" }}
    >
      {UNIT_ORDER.map((u) => (
        <option key={u} value={u}>
          {UNIT_LABELS[u]}
        </option>
      ))}
    </select>
  );

  const renderDimensionField = (id, labelText, value, setValue, unit, setUnit, placeholder, extra) => (
    <div className="tool-row">
      <div className="tool-field">
        <label className="tool-label" htmlFor={id}>
          {labelText}
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="tool-input"
            id={id}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, minWidth: 0 }}
          />
          {renderUnitSelect(id, labelText, unit, setUnit)}
        </div>
        {extra}
      </div>
    </div>
  );

  const thicknessPresets = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span className="tool-note">Common:</span>
      {THICKNESS_PRESETS.map((p) => (
        <button
          key={p.inches}
          type="button"
          className="btn btn-sm"
          title={p.title}
          aria-label={`${p.inches} in (${p.title})`}
          onClick={() => applyPreset(p.inches)}
        >
          {p.inches} in
        </button>
      ))}
    </div>
  );

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Shape of the pour" style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
        {SHAPES.map((sh) => (
          <button
            key={sh.id}
            type="button"
            role="tab"
            aria-selected={shape === sh.id}
            className={`seg-btn ${shape === sh.id ? "is-active" : ""}`}
            onClick={() => setShape(sh.id)}
          >
            {sh.label}
          </button>
        ))}
      </div>
      <p className="tool-note">{SHAPE_HELP[shape]}</p>

      <div className="tool-fields">
        {shape === "slab" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="concrete-measure">
                  Measure by
                </label>
                <select
                  className="tool-select"
                  id="concrete-measure"
                  value={measure}
                  onChange={(e) => setMeasure(e.target.value)}
                >
                  <option value="dims">Length × width</option>
                  <option value="area">Total area</option>
                </select>
              </div>
            </div>

            {measure === "dims" ? (
              <>
                {renderDimensionField("concrete-length", "Length", length, setLength, lengthUnit, setLengthUnit, "e.g. 10")}
                {renderDimensionField("concrete-width", "Width", width, setWidth, widthUnit, setWidthUnit, "e.g. 10")}
              </>
            ) : (
              <div className="tool-row">
                <div className="tool-field">
                  <label className="tool-label" htmlFor="concrete-area">
                    Total area
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      className="tool-input"
                      id="concrete-area"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. 100"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <select
                      className="tool-select"
                      id="concrete-area-unit"
                      aria-label="Total area unit"
                      value={areaUnit}
                      onChange={(e) => setAreaUnit(e.target.value)}
                      style={{ flex: "0 0 auto", width: "auto" }}
                    >
                      {Object.keys(AREA_LABELS).map((u) => (
                        <option key={u} value={u}>
                          {AREA_LABELS[u]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {renderDimensionField(
              "concrete-thickness",
              "Thickness / Depth",
              thickness,
              setThickness,
              thicknessUnit,
              setThicknessUnit,
              "e.g. 4",
              thicknessPresets
            )}
          </>
        )}

        {shape === "round" && (
          <>
            {renderDimensionField("concrete-diameter", "Diameter", diameter, setDiameter, diameterUnit, setDiameterUnit, "e.g. 10")}
            {renderDimensionField("concrete-depth", "Depth / height", depth, setDepth, depthUnit, setDepthUnit, "e.g. 36")}
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="concrete-post">
                  Post in hole
                </label>
                <select className="tool-select" id="concrete-post" value={post} onChange={(e) => setPost(e.target.value)}>
                  {POST_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {shape === "steps" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="concrete-steps">
                  Number of steps
                </label>
                <input
                  className="tool-input"
                  id="concrete-steps"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
            </div>
            {renderDimensionField("concrete-rise", "Rise (height of each step)", rise, setRise, riseUnit, setRiseUnit, "e.g. 7")}
            {renderDimensionField("concrete-run", "Run (depth of each tread)", run, setRun, runUnit, setRunUnit, "e.g. 11")}
            {renderDimensionField("concrete-step-width", "Width of the steps", stepWidth, setStepWidth, stepWidthUnit, setStepWidthUnit, "e.g. 3")}
            {renderDimensionField("concrete-landing", "Top landing depth (optional)", landing, setLanding, landingUnit, setLandingUnit, "0")}
          </>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="concrete-quantity">
              Quantity
            </label>
            <input
              className="tool-input"
              id="concrete-quantity"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="concrete-waste">
              Extra for waste
            </label>
            <select className="tool-select" id="concrete-waste" value={waste} onChange={(e) => setWaste(e.target.value)}>
              {WASTE_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="concrete-bag">
              Bag size
            </label>
            <select className="tool-select" id="concrete-bag" value={bag} onChange={(e) => setBag(e.target.value)}>
              {BAG_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.approx ? `${b.label} (approx. yield)` : b.label}
                </option>
              ))}
            </select>
          </div>
          {isCustom && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="concrete-yield">
                Yield per bag
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="tool-input"
                  id="concrete-yield"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={customYield}
                  onChange={(e) => setCustomYield(e.target.value)}
                  placeholder={customYieldUnit === "L" ? "e.g. 17" : "e.g. 0.6"}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <select
                  className="tool-select"
                  id="concrete-yield-unit"
                  aria-label="Yield per bag unit"
                  value={customYieldUnit}
                  onChange={(e) => setCustomYieldUnit(e.target.value)}
                  style={{ flex: "0 0 auto", width: "auto" }}
                >
                  <option value="ft3">ft³</option>
                  <option value="L">litres</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">CONCRETE TO ORDER</p>
        <div className="tool-result-value">
          {result ? (imperial ? `${formatVolume(result.orderYd3)} yd³` : `${formatVolume(result.orderM3)} m³`) : "-"}
        </div>
        {error && (
          <p className="tool-note" style={{ margin: "6px 0 0" }}>
            {error}
          </p>
        )}
        {result && (
          <p className="tool-note" style={{ margin: "6px 0 0" }}>
            {result.wastePct > 0
              ? `${
                  imperial
                    ? `${formatVolume(result.rawYd3)} yd³ (${formatVolume(result.rawM3)} m³)`
                    : `${formatVolume(result.rawM3)} m³ (${formatVolume(result.rawYd3)} yd³)`
                } before the ${result.wastePct}% allowance.`
              : "No extra added for waste. Most people allow 5 to 10%."}
          </p>
        )}
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{result ? formatVolume(result.orderYd3) : "-"}</div>
          <div className="tool-stat-label">Cubic yards to order (yd³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.orderFt3, result.orderFt3 < 10 ? 2 : 1) : "-"}
          </div>
          <div className="tool-stat-label">Cubic feet to order (ft³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{result ? formatVolume(result.orderM3) : "-"}</div>
          <div className="tool-stat-label">Cubic meters to order (m³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{result && result.bags !== null ? formatNumber(result.bags, 0) : "-"}</div>
          <div className="tool-stat-label">
            {isCustom ? "Bags (custom yield)" : `${bagWord} (approx.)`}
          </div>
        </div>
        {!isCustom && (
          <div className="tool-stat">
            <div className="tool-stat-num">{bagWeight ? bagWeight.value : "-"}</div>
            <div className="tool-stat-label">Total bag weight{bagWeight ? ` (${bagWeight.alt})` : ""}</div>
          </div>
        )}
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result
              ? imperial
                ? `${formatNumber(result.pourLb, 0)} lb`
                : `${formatNumber(result.pourKg, 0)} kg`
              : "-"}
          </div>
          <div className="tool-stat-label">
            Approx. weight of the pour
            {result
              ? imperial
                ? ` (≈ ${formatNumber(result.pourKg, 0)} kg)`
                : ` (≈ ${formatNumber(result.pourLb, 0)} lb)`
              : ""}
          </div>
        </div>
      </div>

      {result && (
        <div>
          <p className="tool-result-label">
            Same pour in other bag sizes{result.wastePct > 0 ? ` (with ${result.wastePct}% extra)` : ""}
          </p>
          <div className="csc-cards">
            {result.others.map((b) => (
              <div key={b.id} className={`csc-card${b.id === bag ? " is-input" : ""}`}>
                <div className="csc-card-country">
                  {b.approx ? "≈ " : ""}
                  {b.label}
                </div>
                <div className="csc-card-size">{formatNumber(b.count, 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && result.orderYd3 >= 1 && (
        <p className="tool-note">
          This pour is a cubic yard or more. Ready-mix delivery is often easier at this size than mixing bags by hand.
        </p>
      )}

      <details>
        <summary className="tool-label" style={{ cursor: "pointer" }}>
          Estimate material cost (optional)
        </summary>
        <div className="tool-fields" style={{ marginTop: 12 }}>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="concrete-price-bag">
                Price per {isCustom ? "bag" : `${bagOpt.label} bag`}
              </label>
              <input
                className="tool-input"
                id="concrete-price-bag"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={priceBag}
                onChange={(e) => setPriceBag(e.target.value)}
                placeholder="Your local price"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="concrete-price-ready">
                Ready-mix price per {imperial ? "cubic yard" : "cubic meter"}
              </label>
              <input
                className="tool-input"
                id="concrete-price-ready"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={priceReady}
                onChange={(e) => setPriceReady(e.target.value)}
                placeholder="Your local price"
              />
            </div>
          </div>
          {result && ((bagPrice !== null && result.bags !== null) || readyPrice !== null) && (
            <div className="tool-stat-grid">
              {bagPrice !== null && result.bags !== null && (
                <div className="tool-stat">
                  <div className="tool-stat-num">{formatMoney(result.bags * bagPrice)}</div>
                  <div className="tool-stat-label">
                    Bags: {formatNumber(result.bags, 0)} × {formatMoney(bagPrice)}
                  </div>
                </div>
              )}
              {readyPrice !== null && (
                <div className="tool-stat">
                  <div className="tool-stat-num">{formatMoney(readyVolume * readyPrice)}</div>
                  <div className="tool-stat-label">
                    Ready-mix: {formatVolume(readyVolume)} {readyUnit} × {formatMoney(readyPrice)}
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="tool-note">
            Totals are in your currency and use the order amount above. Material only: delivery, small-load fees, labor,
            base and finishing are extra.
          </p>
        </div>
      </details>

      <p className="tool-note">
        Bag counts use the yield printed on standard concrete mix (about 0.60 ft³ per 80 lb bag). Fast-setting and
        specialty mixes can differ, so if your bag lists a yield, choose Custom. The 20 kg and 25 kg yields are
        estimates, so check your bag.
      </p>

      <section className="tool-about" style={{ marginTop: 26 }}>
        <h2 className="tool-h2">Concrete bag yields</h2>
        <div className="csc-table-wrap">
          <table className="csc-table">
            <thead>
              <tr>
                <th>Bag</th>
                <th>Yield per bag</th>
                <th>Bags per yd³</th>
                <th>Bags per m³</th>
                <th>Sq ft per bag at 4 in</th>
              </tr>
            </thead>
            <tbody>
              {BAG_TABLE.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td>
                    {r.approx ? "≈" : ""}
                    {formatYield(r.yieldFt3, r.approx)} ft³ ({r.approx ? "≈" : ""}
                    {formatNumber(r.yieldL, 1)} L)
                  </td>
                  <td>
                    {r.approx ? "≈" : ""}
                    {r.perYd3}
                  </td>
                  <td>
                    {r.approx ? "≈" : ""}
                    {r.perM3}
                  </td>
                  <td>
                    {r.approx ? "≈" : ""}
                    {r.sqFtAt4in.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tool-note" style={{ marginTop: 10 }}>
          Yields from the QUIKRETE Concrete Mix (No. 1101) data sheet. The kg rows are estimated at the same yield per
          kg, so check your bag. Bag counts are rounded up.
        </p>
      </section>

      <section className="tool-about" style={{ marginTop: 26 }}>
        <h2 className="tool-h2">Common slab sizes at 4 in thick</h2>
        <div className="csc-table-wrap">
          <table className="csc-table">
            <thead>
              <tr>
                <th>Size (ft)</th>
                <th>Cubic yards</th>
                <th>80 lb bags</th>
                <th>60 lb bags</th>
                <th>80 lb with 10% extra</th>
              </tr>
            </thead>
            <tbody>
              {SLAB_TABLE.map((r) => (
                <tr key={r.key}>
                  <td>
                    {r.l} × {r.w}
                  </td>
                  <td>{r.yd3.toFixed(2)}</td>
                  <td>{r.bags80}</td>
                  <td>{r.bags60}</td>
                  <td>{r.bags80Extra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tool-note" style={{ marginTop: 10 }}>
          At 6 in thick you need 1.5 times as much: a 10 × 10 ft slab takes {formatNumber(SIX_INCH_EXAMPLE.yd3, 2)} yd³,
          or {SIX_INCH_EXAMPLE.bags80} × 80 lb bags before waste.
        </p>
      </section>
    </div>
  );
}
