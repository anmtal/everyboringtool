"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// A stable id generator for holding rows so React keys stay put as rows
// are added and removed.
let ROW_SEQ = 4;
function nextId() {
  ROW_SEQ += 1;
  return ROW_SEQ;
}

function parseNum(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

function clampNonNeg(n) {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function PortfolioRebalanceCalculator() {
  // Prefill a realistic 3-fund example so the tool shows a working result
  // on first load.
  const [rows, setRows] = useState([
    { id: 1, name: "US Stocks", value: "12000", target: "60" },
    { id: 2, name: "Intl Stocks", value: "5000", target: "20" },
    { id: 3, name: "Bonds", value: "4000", target: "20" },
  ]);
  const [contribution, setContribution] = useState("0");
  const [copied, setCopied] = useState(false);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const pct = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    []
  );

  function updateRow(id, field, val) {
    setCopied(false);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  }

  function addRow() {
    setCopied(false);
    setRows((rs) => [...rs, { id: nextId(), name: "", value: "", target: "" }]);
  }

  function removeRow(id) {
    setCopied(false);
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  const result = useMemo(() => {
    // Build a clean, computable view of the rows. A row counts as an asset
    // if it has a non-negative current value OR a positive target weight.
    const assets = rows.map((r) => {
      const value = clampNonNeg(parseNum(r.value));
      const targetRaw = parseNum(r.target);
      const target = Number.isFinite(targetRaw) && targetRaw > 0 ? targetRaw : 0;
      const name = (r.name || "").trim();
      return { id: r.id, name, value, target };
    });

    const currentTotal = assets.reduce((s, a) => s + a.value, 0);
    const targetSum = assets.reduce((s, a) => s + a.target, 0);
    const addCash = clampNonNeg(parseNum(contribution));
    const newTotal = currentTotal + addCash;

    const hasValue = assets.some((a) => a.value > 0);
    const hasTarget = targetSum > 0;

    if (!hasValue && !hasTarget) {
      return { status: "empty" };
    }
    if (!hasTarget) {
      return { status: "no-target", currentTotal };
    }
    if (newTotal <= 0) {
      return { status: "no-value", targetSum };
    }

    // Normalize target weights so they always sum to 100%. This is what makes
    // the tool forgiving: users can enter 60/20/20 or 3/1/1 and it just works,
    // but we still surface whether the raw entries summed to 100.
    const lines = assets.map((a) => {
      const targetWeight = a.target / targetSum; // 0..1
      const targetValue = targetWeight * newTotal;
      const currentWeight = currentTotal > 0 ? a.value / currentTotal : 0;
      // Trade needed to hit target given the (optionally larger) new total.
      const trade = targetValue - a.value;
      return {
        id: a.id,
        name: a.name,
        value: a.value,
        currentWeight,
        targetWeight,
        targetValue,
        drift: currentWeight - targetWeight,
        trade, // + = buy, - = sell
      };
    });

    const totalBuy = lines.reduce((s, l) => s + (l.trade > 0 ? l.trade : 0), 0);
    const totalSell = lines.reduce(
      (s, l) => s + (l.trade < 0 ? -l.trade : 0),
      0
    );
    // Largest absolute drift from target, as a quick "how off am I" gauge.
    const maxDrift = lines.reduce(
      (m, l) => Math.max(m, Math.abs(l.drift)),
      0
    );

    return {
      status: "ok",
      lines,
      currentTotal,
      newTotal,
      addCash,
      targetSum,
      totalBuy,
      totalSell,
      maxDrift,
    };
  }, [rows, contribution]);

  const planText = useMemo(() => {
    if (result.status !== "ok") return "";
    const out = [];
    out.push("Portfolio Rebalancing Plan");
    out.push(
      `Portfolio value: ${currency.format(result.currentTotal)}` +
        (result.addCash > 0
          ? ` + ${currency.format(result.addCash)} new cash = ${currency.format(
              result.newTotal
            )}`
          : "")
    );
    out.push("");
    result.lines.forEach((l) => {
      const label = l.name || "(unnamed)";
      let action;
      if (Math.abs(l.trade) < 0.005) action = "Hold";
      else if (l.trade > 0) action = `Buy ${currency.format(l.trade)}`;
      else action = `Sell ${currency.format(-l.trade)}`;
      out.push(
        `${label}: now ${currency.format(l.value)} (${pct.format(
          l.currentWeight
        )}) -> target ${currency.format(l.targetValue)} (${pct.format(
          l.targetWeight
        )})  |  ${action}`
      );
    });
    out.push("");
    out.push(
      `Total to buy: ${currency.format(
        result.totalBuy
      )}   Total to sell: ${currency.format(result.totalSell)}`
    );
    return out.join("\n");
  }, [result, currency, pct]);

  async function handleCopy() {
    if (!planText) return;
    try {
      await copyText(planText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const targetOk =
    result.status === "ok" && Math.abs(result.targetSum - 100) < 0.01;

  return (
    <div className="tool">
      <div className="tool-fields">
        {rows.map((r, i) => (
          <div className="tool-row" key={r.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`pr-name-${r.id}`}>
                {i === 0 ? "Asset / holding" : ""}
              </label>
              <input
                className="tool-input"
                id={`pr-name-${r.id}`}
                type="text"
                placeholder="e.g. US Stocks"
                value={r.name}
                onChange={(e) => updateRow(r.id, "name", e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`pr-value-${r.id}`}>
                {i === 0 ? "Current value ($)" : ""}
              </label>
              <input
                className="tool-input"
                id={`pr-value-${r.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={r.value}
                onChange={(e) => updateRow(r.id, "value", e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`pr-target-${r.id}`}>
                {i === 0 ? "Target (%)" : ""}
              </label>
              <input
                className="tool-input"
                id={`pr-target-${r.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={r.target}
                onChange={(e) => updateRow(r.id, "target", e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`pr-remove-${r.id}`}>
                {i === 0 ? " " : ""}
              </label>
              <button
                type="button"
                id={`pr-remove-${r.id}`}
                className="btn"
                onClick={() => removeRow(r.id)}
                disabled={rows.length <= 1}
                aria-label={`Remove ${r.name || "row"}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button type="button" className="btn" onClick={addRow}>
            + Add asset
          </button>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="pr-contribution">
            New cash to invest ($, optional)
          </label>
          <input
            className="tool-input"
            id="pr-contribution"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={contribution}
            onChange={(e) => {
              setCopied(false);
              setContribution(e.target.value);
            }}
          />
          <p className="tool-note">
            Adding cash lets you rebalance by buying more of what is underweight,
            so you can avoid selling (and any taxes on gains).
          </p>
        </div>
      </div>

      {result.status === "empty" && (
        <p className="tool-note">
          Add each holding with its current dollar value and the target
          percentage you want it to be. The calculator shows exactly how much to
          buy or sell of each to get back to your target mix.
        </p>
      )}

      {result.status === "no-target" && (
        <p className="tool-note">
          Enter a target percentage for at least one holding to see a
          rebalancing plan. Targets can be any positive numbers (they are
          normalized to 100%).
        </p>
      )}

      {result.status === "no-value" && (
        <p className="tool-note">
          Enter a current value for at least one holding, or add new cash to
          invest, to see how to allocate toward your targets.
        </p>
      )}

      {result.status === "ok" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">REBALANCING PLAN</p>
            <pre className="tool-output">{planText}</pre>
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn btn-primary"}
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy plan"}
            </button>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.newTotal)}
              </div>
              <div className="tool-stat-label">
                {result.addCash > 0 ? "Total after new cash" : "Portfolio total"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.totalBuy)}
              </div>
              <div className="tool-stat-label">Total to buy</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.totalSell)}
              </div>
              <div className="tool-stat-label">Total to sell</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pct.format(result.maxDrift)}</div>
              <div className="tool-stat-label">Largest drift</div>
            </div>
          </div>

          <p className="tool-note">
            {targetOk
              ? "Your targets add up to 100%. "
              : `Your target percentages add up to ${result.targetSum.toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 2 }
                )}%, so they were scaled proportionally to total 100%. `}
            "Buy" and "sell" amounts are the trades that move each holding from
            its current value to its target value. This is an estimate for
            planning only. It does not account for taxes, transaction fees,
            trading lot sizes, or the timing of orders. Nothing here is
            financial advice.
          </p>
        </>
      )}
    </div>
  );
}
