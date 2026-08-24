"use client";

import { useState } from "react";

// Base code -> type, size, common name, typical region/voltage, interchange note.
const ROWS = [
  { code: "E26", type: "Screw (Edison)", dia: "26 mm", name: "Medium / standard", region: "US / Canada, 120 V", note: "Looks identical to E27 and usually fits the socket — but match the bulb's voltage to your region." },
  { code: "E27", type: "Screw (Edison)", dia: "27 mm", name: "ES / standard", region: "Europe / UK / AU, 230 V", note: "Physically interchangeable with E26 sockets; the difference is the rated voltage." },
  { code: "E12", type: "Screw (Edison)", dia: "12 mm", name: "Candelabra", region: "US, 120 V", note: "Small screw base for chandeliers and night lights." },
  { code: "E14", type: "Screw (Edison)", dia: "14 mm", name: "SES (small Edison)", region: "Europe / UK, 230 V", note: "The European candelabra base — not interchangeable with US E12." },
  { code: "E17", type: "Screw (Edison)", dia: "17 mm", name: "Intermediate", region: "US, 120 V", note: "Between candelabra and medium — appliance and sign bulbs." },
  { code: "E39 / E40", type: "Screw (Edison)", dia: "39–40 mm", name: "Mogul / Goliath", region: "High-wattage", note: "Large base for high-bay and street lighting." },
  { code: "B22", type: "Bayonet", dia: "22 mm", name: "BC (bayonet cap)", region: "UK / AU / India, 230 V", note: "Push-and-twist base; the UK/Commonwealth standard." },
  { code: "B15", type: "Bayonet", dia: "15 mm", name: "SBC (small bayonet)", region: "UK / Europe", note: "Smaller bayonet for candle and appliance bulbs." },
  { code: "BA15s / BA15d", type: "Bayonet", dia: "15 mm", name: "Single / double contact", region: "12 V automotive", note: "Car and marine bulbs; 's' = one contact, 'd' = two." },
  { code: "GU10", type: "Twist-lock", dia: "10 mm pins", name: "Mains spotlight", region: "230 V", note: "Twist-and-lock; mains voltage — NOT interchangeable with GU5.3." },
  { code: "GU5.3 / MR16", type: "Push pins", dia: "5.3 mm", name: "Low-voltage spot", region: "12 V", note: "Two push-in pins; needs a 12 V transformer/driver." },
  { code: "G4", type: "Push pins", dia: "4 mm", name: "Capsule", region: "12 V", note: "Tiny capsule bulb for cabinet and desk lights." },
  { code: "G9", type: "Loop pins", dia: "9 mm", name: "Mains capsule", region: "230 V", note: "Mains-voltage capsule; loop-shaped pins." },
  { code: "GU24", type: "Twist-lock", dia: "24 mm", name: "Pin base (CFL/LED)", region: "120 / 230 V", note: "Twist-lock pin base used on energy-efficient fittings." },
];

export default function BulbBaseConverter() {
  const [code, setCode] = useState("E26");
  const row = ROWS.find((r) => r.code === code) || ROWS[0];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bb-code">Bulb base code</label>
          <select id="bb-code" className="tool-input" value={code} onChange={(e) => setCode(e.target.value)}>
            {ROWS.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">{row.code} · {row.name}</p>
        <div className="csc-cards">
          <div className="csc-card is-input"><div className="csc-card-country">Type</div><div className="csc-card-size" style={{ fontSize: 15 }}>{row.type}</div></div>
          <div className="csc-card"><div className="csc-card-country">Size</div><div className="csc-card-size" style={{ fontSize: 15 }}>{row.dia}</div></div>
          <div className="csc-card"><div className="csc-card-country">Typical use</div><div className="csc-card-size" style={{ fontSize: 15 }}>{row.region}</div></div>
        </div>
        <p className="tool-note" style={{ margin: "10px 0 0" }}>{row.note}</p>
      </div>

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>Code</th><th>Type</th><th>Size</th><th>Name</th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.code} className={r.code === code ? "is-match" : ""}>
                <td>{r.code}</td><td>{r.type}</td><td>{r.dia}</td><td>{r.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        For screw (Edison) bases the number is the thread diameter in millimetres — E14 is 14 mm, E27 is 27 mm. E26 (US)
        and E27 (Europe) look identical and usually fit each other's sockets, but they're rated for different voltages, so
        match the bulb to your mains. GU10 (mains) and GU5.3 (12 V) look similar but are not interchangeable. Free, runs in your browser.
      </p>
    </div>
  );
}
