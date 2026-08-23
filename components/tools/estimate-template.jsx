"use client";

import { useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

let uid = 0;
const newItem = (description = "", qty = "1", price = "") => ({
  id: ++uid,
  description,
  qty,
  price,
});

// Print CSS that isolates the estimate card: everything on the page is hidden
// during print except the estimate and its contents. Using `visibility` (rather
// than `display`) keeps the card's ancestors in the layout so it can be pinned
// to the top of the printed page without knowing the host page's structure.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #ebt-estimate-print, #ebt-estimate-print * { visibility: visible !important; }
  #ebt-estimate-print {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
    border: none !important;
  }
  @page { margin: 14mm; }
}
`;

export default function EstimateTemplate() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const validUntil = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [fromName, setFromName] = useState("Acme Contracting LLC");
  const [fromDetails, setFromDetails] = useState(
    "123 Market Street\nSan Francisco, CA 94103\nhello@acmecontracting.com\n(555) 123-4567"
  );
  const [toName, setToName] = useState("Client Co.");
  const [toDetails, setToDetails] = useState(
    "456 Client Avenue\nAustin, TX 78701\naccounts@clientco.com"
  );
  const [estimateNo, setEstimateNo] = useState("EST-001");
  const [date, setDate] = useState(today);
  const [validDate, setValidDate] = useState(validUntil);
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState(
    "This estimate is valid for 30 days. Prices are subject to change after the valid-until date. A 50% deposit is required to begin work."
  );
  const [items, setItems] = useState([
    newItem("Site preparation and labor", "1", "1200"),
    newItem("Materials (per unit)", "8", "85"),
  ]);

  const totals = useMemo(() => {
    const lineAmounts = items.map((it) => toNum(it.qty) * toNum(it.price));
    const subtotal = lineAmounts.reduce((s, a) => s + a, 0);
    const rate = Math.max(0, toNum(taxRate));
    const tax = subtotal * (rate / 100);
    const total = subtotal + tax;
    return { lineAmounts, subtotal, tax, total, rate };
  }, [items, taxRate]);

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }
  function removeItem(id) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  const fmtDate = (d) => {
    if (!d) return "-";
    const parsed = new Date(d + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const rate2 = Math.round(totals.rate * 100) / 100;
  const mutedC = "#6b7280";
  const lineC = "1px solid #e5e7eb";

  // Self-contained, theme-neutral "paper" sheet: an explicit white card with its
  // own colors so it reads identically in light and dark UI and when printed.
  const paper = {
    background: "#ffffff",
    color: "#1f2430",
    borderRadius: 10,
    padding: "32px 34px",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
    fontSize: 13,
    lineHeight: 1.5,
    overflowX: "auto",
  };

  return (
    <div className="tool">
      <style>{PRINT_CSS}</style>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="est-from-name">From (your business)</label>
            <input
              className="tool-input"
              id="est-from-name"
              type="text"
              placeholder="Your business name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
            <textarea
              className="tool-textarea"
              aria-label="Your business address and contact details"
              rows={4}
              placeholder="Address, email, phone…"
              value={fromDetails}
              onChange={(e) => setFromDetails(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="est-to-name">Prepared for (client)</label>
            <input
              className="tool-input"
              id="est-to-name"
              type="text"
              placeholder="Client name"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
            />
            <textarea
              className="tool-textarea"
              aria-label="Client address and contact details"
              rows={4}
              placeholder="Address, email, phone…"
              value={toDetails}
              onChange={(e) => setToDetails(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="est-number">Estimate number</label>
            <input
              className="tool-input"
              id="est-number"
              type="text"
              placeholder="EST-001"
              value={estimateNo}
              onChange={(e) => setEstimateNo(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="est-date">Date</label>
            <input
              className="tool-input"
              id="est-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="est-valid">Valid until</label>
            <input
              className="tool-input"
              id="est-valid"
              type="date"
              value={validDate}
              onChange={(e) => setValidDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginTop: 22 }}>
        <div className="tool-label" style={{ marginBottom: 8 }}>Line items</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it, idx) => (
            <div
              key={it.id}
              className="lineitem-row"
            >
              <input
                className="tool-input"
                type="text"
                aria-label={`Item ${idx + 1} description`}
                placeholder="Description"
                value={it.description}
                onChange={(e) => updateItem(it.id, "description", e.target.value)}
              />
              <input
                className="tool-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                aria-label={`Item ${idx + 1} quantity`}
                placeholder="Qty"
                value={it.qty}
                onChange={(e) => updateItem(it.id, "qty", e.target.value)}
              />
              <input
                className="tool-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                aria-label={`Item ${idx + 1} unit price`}
                placeholder="Unit price"
                value={it.price}
                onChange={(e) => updateItem(it.id, "price", e.target.value)}
              />
              <div
                aria-label={`Item ${idx + 1} amount`}
                style={{
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                }}
              >
                {money.format(totals.lineAmounts[idx] || 0)}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => removeItem(it.id)}
                disabled={items.length <= 1}
                aria-label={`Remove item ${idx + 1}`}
                title="Remove line"
                style={{ padding: "8px 0", minWidth: 36 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="tool-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={addItem}>+ Add line item</button>
        </div>
      </div>

      <div className="tool-row" style={{ marginTop: 18 }}>
        <div className="tool-field">
          <label className="tool-label" htmlFor="est-tax">Tax rate (%)</label>
          <input
            className="tool-input"
            id="est-tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="est-notes">Notes / terms</label>
          <textarea
            className="tool-textarea"
            id="est-notes"
            rows={2}
            placeholder="Validity, deposit terms, scope notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Totals summary */}
      <div className="tool-stat-grid" style={{ marginTop: 18 }}>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.subtotal)}</div>
          <div className="tool-stat-label">Subtotal</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.tax)}</div>
          <div className="tool-stat-label">Tax ({rate2}%)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.total)}</div>
          <div className="tool-stat-label">Total</div>
        </div>
      </div>

      <div className="tool-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          🖨 Print / Save as PDF
        </button>
      </div>

      <p className="tool-note" style={{ marginTop: 10 }}>
        Tip: In the print dialog, choose “Save as PDF” as the destination to download a PDF copy.
        Only the estimate below is printed.
      </p>

      {/* Live estimate preview (printable sheet) */}
      <div className="tool-label" style={{ marginTop: 24, marginBottom: 8 }}>Preview</div>
      <div id="ebt-estimate-print" style={paper}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, color: "#21497e" }}>
            ESTIMATE
          </div>
          <div style={{ textAlign: "right", minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{estimateNo ? "#" + estimateNo : ""}</div>
            <div style={{ color: mutedC, marginTop: 4 }}>Date: {fmtDate(date)}</div>
            <div style={{ color: mutedC }}>Valid until: {fmtDate(validDate)}</div>
          </div>
        </div>

        <div style={{ borderTop: lineC, margin: "16px 0" }} />

        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: mutedC, fontWeight: 700 }}>FROM</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{fromName || "-"}</div>
            <div style={{ color: mutedC, whiteSpace: "pre-wrap", marginTop: 2 }}>{fromDetails}</div>
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: mutedC, fontWeight: 700 }}>PREPARED FOR</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{toName || "-"}</div>
            <div style={{ color: mutedC, whiteSpace: "pre-wrap", marginTop: 2 }}>{toDetails}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, fontSize: 13 }}>
          <thead>
            <tr style={{ color: mutedC, fontSize: 10, letterSpacing: 0.5 }}>
              <th style={{ textAlign: "left", padding: "0 0 8px", borderBottom: lineC }}>DESCRIPTION</th>
              <th style={{ textAlign: "right", padding: "0 0 8px 8px", borderBottom: lineC }}>QTY</th>
              <th style={{ textAlign: "right", padding: "0 0 8px 8px", borderBottom: lineC }}>UNIT PRICE</th>
              <th style={{ textAlign: "right", padding: "0 0 8px 8px", borderBottom: lineC }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td style={{ textAlign: "left", padding: "8px 0", borderBottom: "1px solid #f1f2f4", wordBreak: "break-word" }}>
                  {it.description || "-"}
                </td>
                <td style={{ textAlign: "right", padding: "8px 0 8px 8px", borderBottom: "1px solid #f1f2f4", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {it.qty || 0}
                </td>
                <td style={{ textAlign: "right", padding: "8px 0 8px 8px", borderBottom: "1px solid #f1f2f4", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {money.format(toNum(it.price))}
                </td>
                <td style={{ textAlign: "right", padding: "8px 0 8px 8px", borderBottom: "1px solid #f1f2f4", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {money.format(totals.lineAmounts[idx] || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: "min(260px, 100%)", fontVariantNumeric: "tabular-nums" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: mutedC }}>
              <span>Subtotal</span>
              <span style={{ color: "#1f2430" }}>{money.format(totals.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: mutedC }}>
              <span>Tax ({rate2}%)</span>
              <span style={{ color: "#1f2430" }}>{money.format(totals.tax)}</span>
            </div>
            <div style={{ borderTop: lineC, margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: 700, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: "#21497e" }}>{money.format(totals.total)}</span>
            </div>
          </div>
        </div>

        {notes && notes.trim() !== "" && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: mutedC, fontWeight: 700 }}>NOTES & TERMS</div>
            <div style={{ color: mutedC, whiteSpace: "pre-wrap", marginTop: 4 }}>{notes}</div>
          </div>
        )}
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Everything runs in your browser — your estimate data is never uploaded. Fill in the fields
        above and the printable estimate updates instantly.
      </p>
    </div>
  );
}
