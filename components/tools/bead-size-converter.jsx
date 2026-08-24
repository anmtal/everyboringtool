"use client";

import { useState } from "react";

// Seed beads. The aught system is INVERSE (bigger number = smaller bead) and mm
// varies by brand, so values are approximate ranges, not exact single numbers.
const ROWS = [
  { aught: "6/0", round: "3.7–4.1", delica: "—", perInch: "10" },
  { aught: "8/0", round: "2.9–3.3", delica: "3.0 (DBL)", perInch: "12" },
  { aught: "10/0", round: "2.2–2.4", delica: "2.2 (DBM)", perInch: "16" },
  { aught: "11/0", round: "1.8–2.2", delica: "1.6 (DB)", perInch: "18" },
  { aught: "12/0", round: "1.8–1.9", delica: "—", perInch: "20" },
  { aught: "13/0", round: "1.5–1.7", delica: "—", perInch: "22" },
  { aught: "15/0", round: "1.3–1.5", delica: "1.3 (DBS)", perInch: "24" },
];

export default function BeadSizeConverter() {
  const [aught, setAught] = useState("11/0");
  const row = ROWS.find((r) => r.aught === aught) || ROWS[0];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bd-a">Seed bead size (aught)</label>
          <select id="bd-a" className="tool-input" value={aught} onChange={(e) => setAught(e.target.value)}>
            {ROWS.map((r) => <option key={r.aught} value={r.aught}>{r.aught}</option>)}
          </select>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">Size {row.aught} seed bead (read "{aught.replace("/0", "")}-aught")</p>
        <div className="csc-cards">
          <div className="csc-card is-input"><div className="csc-card-country">Round (mm)</div><div className="csc-card-size">{row.round}</div></div>
          <div className="csc-card"><div className="csc-card-country">Delica (mm)</div><div className="csc-card-size">{row.delica}</div></div>
          <div className="csc-card"><div className="csc-card-country">Beads / inch</div><div className="csc-card-size">≈ {row.perInch}</div></div>
        </div>
      </div>

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>Aught</th><th>Round mm</th><th>Delica mm</th><th>Beads / in</th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.aught} className={r.aught === aught ? "is-match" : ""}>
                <td>{r.aught}</td><td>{r.round}</td><td>{r.delica}</td><td>≈ {r.perInch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        Seed bead sizing is backwards — a bigger aught number means a smaller bead (an 11/0 is smaller than an 8/0). The
        millimetre size also varies by maker: Japanese beads (Miyuki, Toho) run smaller and more uniform than Czech beads
        of the same aught, so these are approximate ranges. Cylinder beads (Miyuki Delica) at the same aught are a
        different size from round seed beads. Free, runs in your browser.
      </p>
    </div>
  );
}
