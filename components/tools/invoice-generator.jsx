"use client";

import { useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

// Keep only characters the WinAnsi-encoded StandardFonts can draw, so pdf-lib
// never throws on smart quotes, emoji, or other non-Latin-1 input.
function sanitize(str) {
  if (str == null) return "";
  return String(str)
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/ /g, " ")
    .split("")
    .map((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 9) return "    "; // tab -> spaces
      if (c < 32) return ""; // other control chars
      if (c === 0x81 || c === 0x8d || c === 0x8f || c === 0x90 || c === 0x9d) return "";
      if (c > 255) return "";
      return ch;
    })
    .join("");
}

// Wrap sanitized text to a pixel width, honoring existing line breaks and
// hard-breaking any single token that is wider than the column.
function wrapLines(text, font, size, maxWidth) {
  const out = [];
  const paragraphs = sanitize(text).split(/\r?\n/);
  for (const para of paragraphs) {
    if (para.trim() === "") {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (let word of words) {
      // Hard-break a token that can never fit on its own.
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let cut = word.length;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
        const head = word.slice(0, cut);
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(head);
        word = word.slice(cut);
      }
      const test = line ? line + " " + word : word;
      if (line && font.widthOfTextAtSize(test, size) > maxWidth) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

let uid = 0;
const newItem = (description = "", qty = "1", price = "") => ({
  id: ++uid,
  description,
  qty,
  price,
});

export default function InvoiceGenerator() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const due = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  const [fromName, setFromName] = useState("Acme Studio LLC");
  const [fromDetails, setFromDetails] = useState(
    "123 Market Street\nSan Francisco, CA 94103\nbilling@acmestudio.com"
  );
  const [toName, setToName] = useState("Client Co.");
  const [toDetails, setToDetails] = useState(
    "456 Client Avenue\nAustin, TX 78701\naccounts@clientco.com"
  );
  const [invoiceNo, setInvoiceNo] = useState("INV-001");
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(due);
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState(
    "Payment due within 14 days. Thank you for your business!"
  );
  const [items, setItems] = useState([
    newItem("Website design", "1", "1200"),
    newItem("Copywriting (hours)", "6", "85"),
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const totals = useMemo(() => {
    const lines = items.map((it) => {
      const qty = toNum(it.qty);
      const price = toNum(it.price);
      return { amount: qty * price };
    });
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const rate = Math.max(0, toNum(taxRate));
    const tax = subtotal * (rate / 100);
    const total = subtotal + tax;
    return { lineAmounts: lines.map((l) => l.amount), subtotal, tax, total, rate };
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

  async function downloadPdf() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

      const PAGE_W = 595.28; // A4
      const PAGE_H = 841.89;
      const margin = 50;
      const dark = rgb(0.12, 0.13, 0.16);
      const muted = rgb(0.42, 0.45, 0.5);
      const line = rgb(0.82, 0.84, 0.87);
      const accent = rgb(0.13, 0.31, 0.62);

      let page = pdf.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H - margin;

      const rightEdge = PAGE_W - margin;
      const colAmountR = rightEdge;
      const colPriceR = colAmountR - 90;
      const colQtyR = colPriceR - 70;
      const descL = margin;
      const descW = colQtyR - 40 - descL;

      const text = (str, x, yy, size, f = font, color = dark) =>
        page.drawText(sanitize(str), { x, y: yy, size, font: f, color });
      const textRight = (str, xRight, yy, size, f = font, color = dark) => {
        const s = sanitize(str);
        page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y: yy, size, font: f, color });
      };

      function ensureSpace(needed) {
        if (y - needed < margin + 90) {
          page = pdf.addPage([PAGE_W, PAGE_H]);
          y = PAGE_H - margin;
          drawTableHeader();
        }
      }

      // --- Header ---
      text("INVOICE", margin, y - 24, 30, bold, accent);
      textRight(invoiceNo ? "#" + sanitize(invoiceNo) : "", rightEdge, y - 6, 12, bold, dark);
      textRight("Date: " + sanitize(date || "-"), rightEdge, y - 24, 10, font, muted);
      textRight("Due: " + sanitize(dueDate || "-"), rightEdge, y - 38, 10, font, muted);
      y -= 64;

      page.drawLine({
        start: { x: margin, y },
        end: { x: rightEdge, y },
        thickness: 1,
        color: line,
      });
      y -= 26;

      // --- From / Bill To ---
      const colGap = 30;
      const halfW = (rightEdge - margin - colGap) / 2;
      const rightColX = margin + halfW + colGap;
      const topY = y;

      text("FROM", margin, y, 8, bold, muted);
      text("BILL TO", rightColX, y, 8, bold, muted);
      y -= 16;

      let leftY = y;
      text(fromName || "-", margin, leftY, 12, bold, dark);
      leftY -= 15;
      for (const ln of wrapLines(fromDetails, font, 10, halfW)) {
        text(ln, margin, leftY, 10, font, muted);
        leftY -= 13;
      }

      let rY = topY - 16;
      text(toName || "-", rightColX, rY, 12, bold, dark);
      rY -= 15;
      for (const ln of wrapLines(toDetails, font, 10, halfW)) {
        text(ln, rightColX, rY, 10, font, muted);
        rY -= 13;
      }

      y = Math.min(leftY, rY) - 14;

      // --- Line items table ---
      function drawTableHeader() {
        text("DESCRIPTION", descL, y, 8, bold, muted);
        textRight("QTY", colQtyR, y, 8, bold, muted);
        textRight("UNIT PRICE", colPriceR, y, 8, bold, muted);
        textRight("AMOUNT", colAmountR, y, 8, bold, muted);
        y -= 8;
        page.drawLine({
          start: { x: margin, y },
          end: { x: rightEdge, y },
          thickness: 1,
          color: line,
        });
        y -= 16;
      }
      drawTableHeader();

      items.forEach((it) => {
        const descLines = wrapLines(it.description || "-", font, 10, descW);
        if (descLines.length === 0) descLines.push("-");
        const rowH = Math.max(descLines.length * 13, 16) + 8;
        ensureSpace(rowH);

        const qty = toNum(it.qty);
        const price = toNum(it.price);
        const amount = qty * price;
        const firstLineY = y;

        descLines.forEach((ln, i) => {
          text(ln, descL, y - i * 13, 10, font, dark);
        });
        textRight(String(it.qty || 0), colQtyR, firstLineY, 10, font, dark);
        textRight(money.format(price), colPriceR, firstLineY, 10, font, dark);
        textRight(money.format(amount), colAmountR, firstLineY, 10, font, dark);

        y = firstLineY - descLines.length * 13 - 8;
        page.drawLine({
          start: { x: margin, y: y + 4 },
          end: { x: rightEdge, y: y + 4 },
          thickness: 0.5,
          color: rgb(0.9, 0.91, 0.93),
        });
      });

      // --- Totals ---
      ensureSpace(70);
      y -= 8;
      const labelR = colPriceR;
      const valR = colAmountR;

      textRight("Subtotal", labelR, y, 10, font, muted);
      textRight(money.format(totals.subtotal), valR, y, 10, font, dark);
      y -= 16;

      textRight("Tax (" + (Math.round(totals.rate * 100) / 100) + "%)", labelR, y, 10, font, muted);
      textRight(money.format(totals.tax), valR, y, 10, font, dark);
      y -= 12;

      page.drawLine({
        start: { x: rightColX, y },
        end: { x: rightEdge, y },
        thickness: 1,
        color: line,
      });
      y -= 18;

      textRight("Total", labelR, y, 13, bold, dark);
      textRight(money.format(totals.total), valR, y, 13, bold, accent);
      y -= 30;

      // --- Notes ---
      const noteLines = wrapLines(notes, font, 10, rightEdge - margin);
      if (noteLines.length && noteLines.some((l) => l.trim() !== "")) {
        ensureSpace(20 + noteLines.length * 13);
        text("NOTES", margin, y, 8, bold, muted);
        y -= 15;
        for (const ln of noteLines) {
          text(ln, margin, y, 10, font, muted);
          y -= 13;
        }
      }

      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeNo = sanitize(invoiceNo).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "invoice";
      a.href = url;
      a.download = "invoice-" + safeNo + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError("Sorry, the PDF could not be generated. Please check your entries and try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const fmtDate = (d) => {
    if (!d) return "-";
    const parsed = new Date(d + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return sanitize(d);
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // Theme-neutral "paper" styles for the preview: a self-contained white sheet
  // with its own explicit colors so it reads identically in light and dark UI.
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
  const mutedC = "#6b7280";
  const lineC = "1px solid #e5e7eb";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="inv-from-name">From (your business)</label>
            <input
              className="tool-input"
              id="inv-from-name"
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
            <label className="tool-label" htmlFor="inv-to-name">Bill to (client)</label>
            <input
              className="tool-input"
              id="inv-to-name"
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
            <label className="tool-label" htmlFor="inv-number">Invoice number</label>
            <input
              className="tool-input"
              id="inv-number"
              type="text"
              placeholder="INV-001"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="inv-date">Date</label>
            <input
              className="tool-input"
              id="inv-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="inv-due">Due date</label>
            <input
              className="tool-input"
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
          <label className="tool-label" htmlFor="inv-tax">Tax rate (%)</label>
          <input
            className="tool-input"
            id="inv-tax"
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
          <label className="tool-label" htmlFor="inv-notes">Notes</label>
          <textarea
            className="tool-textarea"
            id="inv-notes"
            rows={2}
            placeholder="Payment terms, thank-you note…"
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
          <div className="tool-stat-label">Tax ({Math.round(totals.rate * 100) / 100}%)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.total)}</div>
          <div className="tool-stat-label">Total</div>
        </div>
      </div>

      {error && <p className="tool-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}

      <div className="tool-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={downloadPdf} disabled={busy}>
          {busy ? "Building PDF…" : "↓ Download PDF"}
        </button>
      </div>

      {/* Live invoice preview */}
      <div className="tool-label" style={{ marginTop: 24, marginBottom: 8 }}>Preview</div>
      <div style={paper}>
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
            INVOICE
          </div>
          <div style={{ textAlign: "right", minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{invoiceNo ? "#" + invoiceNo : ""}</div>
            <div style={{ color: mutedC, marginTop: 4 }}>Date: {fmtDate(date)}</div>
            <div style={{ color: mutedC }}>Due: {fmtDate(dueDate)}</div>
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
            <div style={{ fontSize: 10, letterSpacing: 1, color: mutedC, fontWeight: 700 }}>BILL TO</div>
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
              <span>Tax ({Math.round(totals.rate * 100) / 100}%)</span>
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
            <div style={{ fontSize: 10, letterSpacing: 1, color: mutedC, fontWeight: 700 }}>NOTES</div>
            <div style={{ color: mutedC, whiteSpace: "pre-wrap", marginTop: 4 }}>{notes}</div>
          </div>
        )}
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Everything runs in your browser — your invoice data is never uploaded. The downloaded PDF
        matches the preview above.
      </p>
    </div>
  );
}
