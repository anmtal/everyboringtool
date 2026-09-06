"use client";

import { useMemo, useRef, useState } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Per-ml prices are small, so show more precision there.
const perMl = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function PerfumeSplitCalculator() {
  const [mode, setMode] = useState("split");

  // ----- Split a bottle -----
  const [size, setSize] = useState("100");
  const [price, setPrice] = useState("150");
  const [extras, setExtras] = useState("12");
  const [extrasMethod, setExtrasMethod] = useState("even"); // "even" | "volume"

  const nextId = useRef(4);
  const [people, setPeople] = useState([
    { id: 1, name: "Sam", ml: "30" },
    { id: 2, name: "Alex", ml: "20" },
    { id: 3, name: "Jordan", ml: "10" },
  ]);

  function updatePerson(id, patch) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function addPerson() {
    setPeople((prev) => [...prev, { id: nextId.current++, name: "", ml: "" }]);
  }
  function removePerson(id) {
    setPeople((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  const split = useMemo(() => {
    const sizeMl = toNumber(size);
    const priceAmt = toNumber(price);
    const extrasAmt = toNumber(extras) ?? 0;
    if (sizeMl === null || sizeMl <= 0) return null;
    if (priceAmt === null || priceAmt < 0) return null;

    const pricePerMl = priceAmt / sizeMl;
    const rows = people.map((p) => {
      const ml = toNumber(p.ml);
      return { ...p, mlNum: ml !== null && ml > 0 ? ml : 0 };
    });
    const claimed = rows.reduce((a, r) => a + r.mlNum, 0);
    const active = rows.filter((r) => r.mlNum > 0);

    const extrasEach = active.length > 0 ? extrasAmt / active.length : 0;
    const results = rows.map((r) => {
      const juice = r.mlNum * pricePerMl;
      let extraShare = 0;
      if (r.mlNum > 0 && extrasAmt > 0) {
        extraShare =
          extrasMethod === "volume" && claimed > 0
            ? extrasAmt * (r.mlNum / claimed)
            : extrasEach;
      }
      return { ...r, juice, extraShare, total: juice + extraShare };
    });

    const collected = results.reduce((a, r) => a + r.total, 0);
    const leftover = sizeMl - claimed;
    const organizerNet = priceAmt + extrasAmt - collected;

    return {
      pricePerMl,
      results,
      claimed,
      leftover,
      collected,
      organizerNet,
      organizerPerMl: leftover > 0 ? organizerNet / leftover : null,
      overClaimed: claimed > sizeMl,
      activeCount: active.length,
    };
  }, [size, price, extras, extrasMethod, people]);

  // ----- Decant value check -----
  const [bPrice, setBPrice] = useState("150");
  const [bSize, setBSize] = useState("100");
  const [dPrice, setDPrice] = useState("14");
  const [dSize, setDSize] = useState("5");

  const value = useMemo(() => {
    const bp = toNumber(bPrice);
    const bs = toNumber(bSize);
    const dp = toNumber(dPrice);
    const ds = toNumber(dSize);
    if (bp === null || bp < 0 || bs === null || bs <= 0) return null;
    if (dp === null || dp < 0 || ds === null || ds <= 0) return null;

    const bottlePerMl = bp / bs;
    const decantPerMl = dp / ds;
    const multiple = bottlePerMl > 0 ? decantPerMl / bottlePerMl : null;
    const atBottleRate = ds * bottlePerMl;
    const premium = dp - atBottleRate;

    let verdict;
    if (multiple === null) verdict = "";
    else if (multiple <= 1.2)
      verdict = "Great value — you're paying close to the full-bottle rate per ml.";
    else if (multiple <= 1.8)
      verdict = "Fair — a normal decant markup for splitting, vials and labour.";
    else if (multiple <= 2.6)
      verdict = "On the pricey side — common for tiny sizes, but shop around.";
    else
      verdict = "Steep per ml — you're paying a big premium for a small size.";

    return { bottlePerMl, decantPerMl, multiple, atBottleRate, premium, verdict };
  }, [bPrice, bSize, dPrice, dSize]);

  const cell = { padding: "9px 12px", borderBottom: "1px solid var(--border)", textAlign: "left" };
  const num = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="What do you want to work out?" style={{ marginBottom: 16 }}>
        <button
          type="button" role="tab" aria-selected={mode === "split"}
          className={`seg-btn ${mode === "split" ? "is-active" : ""}`}
          onClick={() => setMode("split")}
        >
          Split a bottle
        </button>
        <button
          type="button" role="tab" aria-selected={mode === "value"}
          className={`seg-btn ${mode === "value" ? "is-active" : ""}`}
          onClick={() => setMode("value")}
        >
          Is a decant worth it?
        </button>
      </div>

      {mode === "split" ? (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ps-size">Bottle size (ml)</label>
              <input className="tool-input" id="ps-size" type="number" inputMode="decimal"
                min="0" step="1" value={size} onChange={(e) => setSize(e.target.value)} placeholder="100" />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ps-price">Bottle price ($)</label>
              <input className="tool-input" id="ps-price" type="number" inputMode="decimal"
                min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150.00" />
            </div>
          </div>

          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ps-extras">Shipping, vials &amp; fees ($)</label>
              <input className="tool-input" id="ps-extras" type="number" inputMode="decimal"
                min="0" step="0.01" value={extras} onChange={(e) => setExtras(e.target.value)} placeholder="0.00" />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ps-extras-method">Split those extras</label>
              <select className="tool-select" id="ps-extras-method" value={extrasMethod}
                onChange={(e) => setExtrasMethod(e.target.value)}>
                <option value="even">Evenly per person</option>
                <option value="volume">By ml taken</option>
              </select>
            </div>
          </div>

          <div className="tool-field">
            <span className="tool-label" id="ps-people-label">Who's buying in (and how many ml)</span>
            <div role="group" aria-labelledby="ps-people-label" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {people.map((p) => (
                <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="tool-input" style={{ flex: "2 1 0" }} type="text"
                    aria-label="Name" value={p.name}
                    onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                    placeholder="Name (optional)"
                  />
                  <input
                    className="tool-input" style={{ flex: "1 1 0", minWidth: 80 }} type="number"
                    inputMode="decimal" min="0" step="1" aria-label="Millilitres" value={p.ml}
                    onChange={(e) => updatePerson(p.id, { ml: e.target.value })}
                    placeholder="ml"
                  />
                  <button
                    type="button" className="btn btn-sm" aria-label={`Remove ${p.name || "this person"}`}
                    disabled={people.length <= 1} onClick={() => removePerson(p.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="tool-actions">
                <button type="button" className="btn btn-sm" onClick={addPerson}>+ Add person</button>
              </div>
            </div>
          </div>

          {split ? (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">Bottle price per ml</p>
                <div className="tool-result-value">{perMl.format(split.pricePerMl)}</div>
              </div>

              <div style={{ overflowX: "auto", marginTop: 4 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={cell}>Person</th>
                      <th style={num}>ml</th>
                      <th style={num}>Juice</th>
                      <th style={num}>Extras</th>
                      <th style={num}>Pays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {split.results.map((r, i) => (
                      <tr key={r.id}>
                        <td style={cell}>{r.name || `Person ${i + 1}`}</td>
                        <td style={num}>{r.mlNum || "—"}</td>
                        <td style={num}>{r.mlNum ? usd.format(r.juice) : "—"}</td>
                        <td style={num}>{r.mlNum ? usd.format(r.extraShare) : "—"}</td>
                        <td style={{ ...num, fontWeight: 600 }}>{r.mlNum ? usd.format(r.total) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 14 }}>
                <div className="tool-stat">
                  <div className="tool-stat-num">{usd.format(split.collected)}</div>
                  <div className="tool-stat-label">Collected from {split.activeCount} {split.activeCount === 1 ? "person" : "people"}</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{split.overClaimed ? "0 ml" : `${+split.leftover.toFixed(1)} ml`}</div>
                  <div className="tool-stat-label">You keep</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{usd.format(Math.max(0, split.organizerNet))}</div>
                  <div className="tool-stat-label">Your net cost for it</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{split.organizerPerMl !== null ? perMl.format(split.organizerPerMl) : "—"}</div>
                  <div className="tool-stat-label">Your cost per ml</div>
                </div>
              </div>

              {split.overClaimed ? (
                <p className="tool-note" style={{ color: "var(--danger, #b4462d)" }}>
                  People have claimed {+split.claimed.toFixed(1)} ml — that's {+(split.claimed - toNumber(size)).toFixed(1)} ml more than the bottle holds.
                  Trim someone's share, or size up the bottle.
                </p>
              ) : (
                <p className="tool-note">
                  Juice is split by the ml each person takes ({perMl.format(split.pricePerMl)}/ml). You front the bottle,
                  collect {usd.format(split.collected)}, and keep the leftover {+split.leftover.toFixed(1)} ml — which nets out to
                  {" "}{split.organizerPerMl !== null ? `${perMl.format(split.organizerPerMl)}/ml` : "your cost above"}.
                </p>
              )}
            </>
          ) : (
            <p className="tool-note">Enter a bottle size and price to split the cost fairly.</p>
          )}
        </div>
      ) : (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="dv-bprice">Full bottle price ($)</label>
              <input className="tool-input" id="dv-bprice" type="number" inputMode="decimal"
                min="0" step="0.01" value={bPrice} onChange={(e) => setBPrice(e.target.value)} placeholder="150.00" />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="dv-bsize">Bottle size (ml)</label>
              <input className="tool-input" id="dv-bsize" type="number" inputMode="decimal"
                min="0" step="1" value={bSize} onChange={(e) => setBSize(e.target.value)} placeholder="100" />
            </div>
          </div>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="dv-dprice">Decant price ($)</label>
              <input className="tool-input" id="dv-dprice" type="number" inputMode="decimal"
                min="0" step="0.01" value={dPrice} onChange={(e) => setDPrice(e.target.value)} placeholder="14.00" />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="dv-dsize">Decant size (ml)</label>
              <input className="tool-input" id="dv-dsize" type="number" inputMode="decimal"
                min="0" step="0.5" value={dSize} onChange={(e) => setDSize(e.target.value)} placeholder="5" />
            </div>
          </div>

          {value ? (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">Decant vs bottle, per ml</p>
                <div className="tool-result-value">
                  {value.multiple !== null ? `${value.multiple.toFixed(2)}×` : "—"}
                </div>
              </div>

              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">{perMl.format(value.decantPerMl)}</div>
                  <div className="tool-stat-label">Decant per ml</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{perMl.format(value.bottlePerMl)}</div>
                  <div className="tool-stat-label">Bottle per ml</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{usd.format(value.atBottleRate)}</div>
                  <div className="tool-stat-label">This size at bottle rate</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">{usd.format(Math.max(0, value.premium))}</div>
                  <div className="tool-stat-label">Premium you pay</div>
                </div>
              </div>

              <p className="tool-note">{value.verdict}</p>
            </>
          ) : (
            <p className="tool-note">Enter the bottle and decant prices and sizes to compare their cost per ml.</p>
          )}
        </div>
      )}
    </div>
  );
}
