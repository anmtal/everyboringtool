"use client";

import { useState, useMemo } from "react";

// Grouped by physical cell size; each group lists interchangeable brand/standard
// codes. Chemistry note matters — same size can be different voltage.
const GROUPS = [
  { size: "11.6 × 5.4 mm", v: "1.5 V alkaline / 1.55 V silver", codes: ["LR44", "AG13", "A76", "L1154", "LR1154", "357", "SR44", "SR44W", "SR44SW", "303", "GPA76", "V13GA"], note: "Silver-oxide (357/SR44) holds a steadier 1.55 V — better for meters and calipers; alkaline (LR44) is fine for toys." },
  { size: "11.6 × 3.6 mm", v: "1.5 V alkaline / 1.55 V silver", codes: ["LR41", "AG3", "192", "384", "392", "SR41", "SR41W", "GP192"], note: "" },
  { size: "11.6 × 3.1 mm", v: "1.5 V alkaline / 1.55 V silver", codes: ["LR1130", "AG10", "189", "389", "390", "SR1130", "LR54"], note: "" },
  { size: "7.9 × 3.6 mm", v: "1.5 V alkaline / 1.55 V silver", codes: ["LR927", "AG7", "395", "399", "SR927", "SR927SW"], note: "" },
  { size: "6.8 × 2.6 mm", v: "1.5 V alkaline / 1.55 V silver", codes: ["LR626", "AG4", "377", "376", "SR626", "SR626SW", "V377"], note: "Common watch battery." },
  { size: "20 × 3.2 mm", v: "3 V lithium", codes: ["CR2032", "DL2032", "BR2032", "ECR2032", "5004LC", "KCR2032"], note: "Do NOT swap for LIR2032 — that's rechargeable at 3.6 V and the higher voltage can damage the device." },
  { size: "20 × 2.5 mm", v: "3 V lithium", codes: ["CR2025", "DL2025", "BR2025", "ECR2025"], note: "" },
  { size: "20 × 1.6 mm", v: "3 V lithium", codes: ["CR2016", "DL2016", "BR2016", "ECR2016"], note: "" },
  { size: "11.6 × 4.2 mm", v: "1.4 V zinc-air", codes: ["675", "PR44", "ZA675", "P675"], note: "Hearing-aid battery — activates when you peel the tab off." },
  { size: "7.9 × 5.4 mm", v: "1.4 V zinc-air", codes: ["312", "PR41", "ZA312"], note: "Hearing-aid battery." },
  { size: "28.5 × 10.3 mm", v: "12 V alkaline", codes: ["23A", "A23", "MN21", "V23GA", "8LR932", "GP23A"], note: "Remote / garage-door opener battery." },
  { size: "28 × 8 mm", v: "12 V alkaline", codes: ["27A", "A27", "MN27", "G27A", "L828"], note: "" },
  { size: "AAA · 10.5 × 44.5 mm", v: "1.5 V", codes: ["AAA", "LR03", "MN2400", "24A", "AM4", "HP16"], note: "" },
  { size: "AA · 14.5 × 50.5 mm", v: "1.5 V", codes: ["AA", "LR6", "MN1500", "15A", "AM3", "HP7"], note: "" },
  { size: "9 V (PP3)", v: "9 V", codes: ["9V", "6LR61", "PP3", "MN1604", "1604A", "6F22"], note: "" },
  { size: "CR123A · 17 × 34.5 mm", v: "3 V lithium", codes: ["CR123A", "CR17345", "DL123A", "EL123A", "123"], note: "Camera / flashlight cell." },
];
const ALL_CODES = [...new Set(GROUPS.flatMap((g) => g.codes))].sort();

export default function BatteryEquivalents() {
  const [q, setQ] = useState("LR44");

  const group = useMemo(() => {
    const query = q.trim().toUpperCase();
    if (!query) return null;
    return GROUPS.find((g) => g.codes.some((c) => c.toUpperCase() === query))
      || GROUPS.find((g) => g.codes.some((c) => c.toUpperCase().startsWith(query)))
      || null;
  }, [q]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="be-q">Battery code</label>
          <input id="be-q" className="tool-input" list="be-codes" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. LR44, 357, CR2032, AG13" autoComplete="off" />
          <datalist id="be-codes">{ALL_CODES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      {group ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{group.size} · {group.v}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {group.codes.map((c) => (
              <span key={c} className="badge" style={{ fontSize: 14, padding: "4px 10px", fontWeight: q.trim().toUpperCase() === c.toUpperCase() ? 800 : 500 }}>{c}</span>
            ))}
          </div>
          {group.note && <p className="tool-note" style={{ margin: "10px 0 0" }}>{group.note}</p>}
        </div>
      ) : (
        <p className="tool-note" style={{ marginTop: 14 }}>No match — try a code like LR44, 357, CR2032, AG13 or A23.</p>
      )}

      <p className="tool-note">
        Batteries with the same physical size and voltage are interchangeable, but <strong>physically fitting is not the
        same as electrically safe</strong>: alkaline (LR) and silver-oxide (SR) cells share a size but have slightly
        different voltage curves, and a rechargeable lithium cell (e.g. LIR2032 at 3.6 V) must never replace a primary one
        (CR2032 at 3.0 V). Check the voltage and chemistry, not just the size. Free, runs in your browser.
      </p>
    </div>
  );
}
