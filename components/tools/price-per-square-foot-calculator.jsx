"use client";

import { useState, useMemo } from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

function formatNumber(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const SQFT_PER_SQM = 10.76391041671;

export default function PricePerSquareFootCalculator() {
  const [mode, setMode] = useState("ppsf"); // "ppsf" | "total" | "compare"

  // Shared single-property inputs.
  const [price, setPrice] = useState("350000");
  const [sqft, setSqft] = useState("1800");
  const [pricePerSqft, setPricePerSqft] = useState("195");

  // Comparison inputs.
  const [priceA, setPriceA] = useState("350000");
  const [sqftA, setSqftA] = useState("1800");
  const [priceB, setPriceB] = useState("420000");
  const [sqftB, setSqftB] = useState("2300");

  const single = useMemo(() => {
    if (mode === "ppsf") {
      const p = toNumber(price);
      const s = toNumber(sqft);
      if (p === null || s === null) return { incomplete: true };
      if (p <= 0 || s <= 0) return { invalid: true };
      const ppsf = p / s;
      return {
        ppsf,
        total: p,
        area: s,
        pricePerSqm: ppsf * SQFT_PER_SQM,
      };
    }
    // mode === "total"
    const rate = toNumber(pricePerSqft);
    const s = toNumber(sqft);
    if (rate === null || s === null) return { incomplete: true };
    if (rate <= 0 || s <= 0) return { invalid: true };
    const total = rate * s;
    return {
      ppsf: rate,
      total,
      area: s,
      pricePerSqm: rate * SQFT_PER_SQM,
    };
  }, [mode, price, sqft, pricePerSqft]);

  const compare = useMemo(() => {
    const pa = toNumber(priceA);
    const sa = toNumber(sqftA);
    const pb = toNumber(priceB);
    const sb = toNumber(sqftB);
    if (pa === null || sa === null || pb === null || sb === null)
      return { incomplete: true };
    if (pa <= 0 || sa <= 0 || pb <= 0 || sb <= 0) return { invalid: true };
    const a = pa / sa;
    const b = pb / sb;
    const diff = Math.abs(a - b);
    let better = "tie";
    if (a < b) better = "A";
    else if (b < a) better = "B";
    return { a, b, diff, better };
  }, [priceA, sqftA, priceB, sqftB]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ppsf-mode">
            What do you want to calculate?
          </label>
          <select
            className="tool-select"
            id="ppsf-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="ppsf">Price per square foot (from total price)</option>
            <option value="total">Total price (from price per sq ft)</option>
            <option value="compare">Compare two properties</option>
          </select>
        </div>

        {mode === "ppsf" && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ppsf-price">
                Total price ($)
              </label>
              <input
                className="tool-input"
                id="ppsf-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="350000"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ppsf-sqft">
                Square footage (sq ft)
              </label>
              <input
                className="tool-input"
                id="ppsf-sqft"
                type="number"
                inputMode="decimal"
                min="0"
                step="10"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="1800"
              />
            </div>
          </div>
        )}

        {mode === "total" && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ppsf-rate">
                Price per square foot ($)
              </label>
              <input
                className="tool-input"
                id="ppsf-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={pricePerSqft}
                onChange={(e) => setPricePerSqft(e.target.value)}
                placeholder="195"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ppsf-sqft2">
                Square footage (sq ft)
              </label>
              <input
                className="tool-input"
                id="ppsf-sqft2"
                type="number"
                inputMode="decimal"
                min="0"
                step="10"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="1800"
              />
            </div>
          </div>
        )}

        {mode === "compare" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ppsf-priceA">
                  Property A — price ($)
                </label>
                <input
                  className="tool-input"
                  id="ppsf-priceA"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1000"
                  value={priceA}
                  onChange={(e) => setPriceA(e.target.value)}
                  placeholder="350000"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ppsf-sqftA">
                  Property A — sq ft
                </label>
                <input
                  className="tool-input"
                  id="ppsf-sqftA"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="10"
                  value={sqftA}
                  onChange={(e) => setSqftA(e.target.value)}
                  placeholder="1800"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ppsf-priceB">
                  Property B — price ($)
                </label>
                <input
                  className="tool-input"
                  id="ppsf-priceB"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1000"
                  value={priceB}
                  onChange={(e) => setPriceB(e.target.value)}
                  placeholder="420000"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ppsf-sqftB">
                  Property B — sq ft
                </label>
                <input
                  className="tool-input"
                  id="ppsf-sqftB"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="10"
                  value={sqftB}
                  onChange={(e) => setSqftB(e.target.value)}
                  placeholder="2300"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {mode !== "compare" ? (
        single.incomplete ? (
          <p className="tool-note">
            {mode === "ppsf"
              ? "Enter a total price and the square footage to see the price per square foot."
              : "Enter a price per square foot and the square footage to see the total price."}
          </p>
        ) : single.invalid ? (
          <p className="tool-note">
            Please enter numbers greater than zero for both fields.
          </p>
        ) : (
          <>
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">
                {mode === "ppsf" ? "PRICE PER SQUARE FOOT" : "TOTAL PRICE"}
              </p>
              <div className="tool-result-value">
                {mode === "ppsf"
                  ? `${formatMoney(single.ppsf)} / sq ft`
                  : formatMoney(single.total)}
              </div>
            </div>

            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">{formatMoney(single.ppsf)}</div>
                <div className="tool-stat-label">Price per sq ft</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{formatMoney(single.total)}</div>
                <div className="tool-stat-label">Total price</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatNumber(single.area)} ft²
                </div>
                <div className="tool-stat-label">Square footage</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(single.pricePerSqm)}
                </div>
                <div className="tool-stat-label">Price per sq meter</div>
              </div>
            </div>

            <p className="tool-note">
              {mode === "ppsf"
                ? "Price per square foot = total price ÷ square footage."
                : "Total price = price per square foot × square footage."}
            </p>
          </>
        )
      ) : compare.incomplete ? (
        <p className="tool-note">
          Enter a price and square footage for both properties to compare their
          price per square foot.
        </p>
      ) : compare.invalid ? (
        <p className="tool-note">
          Please enter numbers greater than zero for every field.
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">BETTER VALUE PER SQUARE FOOT</p>
            <div className="tool-result-value">
              {compare.better === "tie"
                ? "Tie — same price per sq ft"
                : `Property ${compare.better}`}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(compare.a)}</div>
              <div className="tool-stat-label">Property A per sq ft</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(compare.b)}</div>
              <div className="tool-stat-label">Property B per sq ft</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(compare.diff)}</div>
              <div className="tool-stat-label">Difference per sq ft</div>
            </div>
          </div>

          <p className="tool-note">
            {compare.better === "tie"
              ? "Both properties cost the same per square foot."
              : `Property ${compare.better} costs ${formatMoney(
                  compare.diff
                )} less per square foot, making it the lower cost per square foot on a size-adjusted basis.`}
          </p>
        </>
      )}

      <p className="tool-note">
        This is an estimate for education and general comparison, not financial,
        appraisal, or investment advice. Price per square foot ignores lot size,
        condition, location, and finishes — always weigh those alongside it.
      </p>
    </div>
  );
}
