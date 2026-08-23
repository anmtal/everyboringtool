"use client";

import { useState, useMemo } from "react";

const PRESETS = [5, 12, 18, 28];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function GstVatCalculator() {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState("add");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    const amt = parseFloat(amount);
    const rt = parseFloat(rate);
    const validAmount = Number.isFinite(amt) && amt >= 0;
    const validRate = Number.isFinite(rt) && rt >= 0;

    if (!validAmount || !validRate) {
      return { ok: false, amt, rt, validAmount, validRate };
    }

    let tax, gross, net, base;
    if (mode === "add") {
      // amount is the pre-tax (net) amount
      base = amt;
      tax = amt * (rt / 100);
      gross = amt + tax;
      net = amt;
    } else {
      // remove: amount is the tax-inclusive (gross) amount
      base = amt;
      net = amt / (1 + rt / 100);
      tax = amt - net;
      gross = amt;
    }

    return { ok: true, amt, rt, tax, gross, net, base };
  }, [amount, rate, mode]);

  const showError =
    amount !== "" &&
    (!Number.isFinite(parseFloat(amount)) ||
      parseFloat(amount) < 0 ||
      !Number.isFinite(parseFloat(rate)) ||
      parseFloat(rate) < 0);

  const primaryLabel = mode === "add" ? "Gross (incl. tax)" : "Net (excl. tax)";
  const primaryValue = parsed.ok
    ? mode === "add"
      ? parsed.gross
      : parsed.net
    : 0;

  const handleCopy = async () => {
    if (!parsed.ok) return;
    const lines =
      mode === "add"
        ? [
            `Net amount: ${usd.format(parsed.net)}`,
            `Tax @ ${parsed.rt}%: ${usd.format(parsed.tax)}`,
            `Gross (incl. tax): ${usd.format(parsed.gross)}`,
          ]
        : [
            `Gross amount: ${usd.format(parsed.gross)}`,
            `Tax @ ${parsed.rt}%: ${usd.format(parsed.tax)}`,
            `Net (excl. tax): ${usd.format(parsed.net)}`,
          ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard unavailable; ignore silently
    }
  };

  const handleReset = () => {
    setAmount("");
    setRate("18");
    setMode("add");
    setCopied(false);
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="gst-amount">
              {mode === "add" ? "Amount (excl. tax)" : "Amount (incl. tax)"}
            </label>
            <input
              id="gst-amount"
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="gst-mode">
              Mode
            </label>
            <select
              id="gst-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="add">Add tax</option>
              <option value="remove">Remove tax</option>
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="gst-rate">
            Tax rate (%)
          </label>
          <input
            id="gst-rate"
            className="tool-input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="e.g. 18"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <div className="tool-actions" style={{ marginTop: "0.5rem" }}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={
                  "btn" + (String(p) === String(rate) ? " btn-primary" : "")
                }
                onClick={() => setRate(String(p))}
              >
                {p}%
              </button>
            ))}
          </div>
          <p className="tool-note">
            Tap a preset for common GST/VAT slabs, or type any custom rate.
          </p>
        </div>
      </div>

      {showError && (
        <div className="tool-error">
          Enter a valid non-negative amount and tax rate.
        </div>
      )}

      {parsed.ok && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">{primaryLabel}</span>
            <span className="tool-result-value">{usd.format(primaryValue)}</span>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(parsed.net)}</div>
              <div className="tool-stat-label">Net (excl. tax)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(parsed.tax)}</div>
              <div className="tool-stat-label">Tax @ {parsed.rt}%</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(parsed.gross)}</div>
              <div className="tool-stat-label">Gross (incl. tax)</div>
            </div>
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-success"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy breakdown"}
            </button>
            <button type="button" className="btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </>
      )}

      {!parsed.ok && !showError && (
        <p className="tool-note">
          Enter an amount to calculate the tax and total.
        </p>
      )}
    </div>
  );
}
