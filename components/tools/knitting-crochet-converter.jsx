"use client";

import { useState, useMemo } from "react";

// mm is the single source of truth; "—" means no exact equivalent in that system
// (a real gap, not a bug). Aluminium/standard hooks only — steel/thread hooks use
// a reversed, manufacturer-inconsistent scale and are deliberately omitted.
const NEEDLES = [
  { mm: "2.0", US: "0", UK: "14" },
  { mm: "2.25", US: "1", UK: "13" },
  { mm: "2.75", US: "2", UK: "12" },
  { mm: "3.0", US: "—", UK: "11" },
  { mm: "3.25", US: "3", UK: "10" },
  { mm: "3.5", US: "4", UK: "—" },
  { mm: "3.75", US: "5", UK: "9" },
  { mm: "4.0", US: "6", UK: "8" },
  { mm: "4.5", US: "7", UK: "7" },
  { mm: "5.0", US: "8", UK: "6" },
  { mm: "5.5", US: "9", UK: "5" },
  { mm: "6.0", US: "10", UK: "4" },
  { mm: "6.5", US: "10½", UK: "3" },
  { mm: "7.0", US: "—", UK: "2" },
  { mm: "7.5", US: "—", UK: "1" },
  { mm: "8.0", US: "11", UK: "0" },
  { mm: "9.0", US: "13", UK: "00" },
  { mm: "10.0", US: "15", UK: "000" },
  { mm: "12.0", US: "17", UK: "—" },
  { mm: "15.0", US: "19", UK: "—" },
  { mm: "20.0", US: "36", UK: "—" },
  { mm: "25.0", US: "50", UK: "—" },
];
const HOOKS = [
  { mm: "2.25", US: "B/1", UK: "13" },
  { mm: "2.75", US: "C/2", UK: "12" },
  { mm: "3.0", US: "—", UK: "11" },
  { mm: "3.25", US: "D/3", UK: "10" },
  { mm: "3.5", US: "E/4", UK: "9" },
  { mm: "3.75", US: "F/5", UK: "—" },
  { mm: "4.0", US: "G/6", UK: "8" },
  { mm: "4.5", US: "7", UK: "7" },
  { mm: "5.0", US: "H/8", UK: "6" },
  { mm: "5.5", US: "I/9", UK: "5" },
  { mm: "6.0", US: "J/10", UK: "4" },
  { mm: "6.5", US: "K/10½", UK: "3" },
  { mm: "7.0", US: "—", UK: "2" },
  { mm: "8.0", US: "L/11", UK: "0" },
  { mm: "9.0", US: "M-N/13", UK: "00" },
  { mm: "10.0", US: "N-P/15", UK: "000" },
  { mm: "12.0", US: "O/16", UK: "—" },
  { mm: "15.0", US: "P-Q/19", UK: "—" },
  { mm: "16.0", US: "Q", UK: "—" },
];

const SYSTEMS = [
  { key: "mm", label: "Metric (mm)" },
  { key: "US", label: "US size" },
  { key: "UK", label: "UK / Canadian" },
];

// Craft Yarn Council 0–7 weight categories with the names used around the world.
const YARN = [
  ["0 — Lace", "Lace, cobweb, 2-ply", "1.5–2.25", "30–40"],
  ["1 — Super Fine", "Fingering, sock, 4-ply (UK)", "2.25–3.25", "14"],
  ["2 — Fine", "Sport, baby, 5-ply", "3.25–3.75", "12"],
  ["3 — Light", "DK, light worsted, 8-ply", "3.75–4.5", "11"],
  ["4 — Medium", "Worsted, aran, 10-ply", "4.5–5.5", "9"],
  ["5 — Bulky", "Chunky, craft, 12-ply", "5.5–8", "7"],
  ["6 — Super Bulky", "Super chunky, roving", "8–12.75", "5–6"],
  ["7 — Jumbo", "Jumbo, roving", "12.75+", "1–4"],
];

export default function KnittingCrochetConverter() {
  const [type, setType] = useState("needles");
  const [sys, setSys] = useState("mm");
  const [pick, setPick] = useState("4.0");

  const data = type === "needles" ? NEEDLES : HOOKS;
  const options = data.filter((r) => r[sys] !== "—").map((r) => r[sys]);
  const safePick = options.includes(pick) ? pick : options[Math.floor(options.length / 2)];
  const row = useMemo(() => data.find((r) => r[sys] === safePick) || null, [data, sys, safePick]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <span className="tool-label">Type</span>
          <div className="seg-toggle" role="group" aria-label="Type">
            <button type="button" className={`seg-btn ${type === "needles" ? "is-active" : ""}`} aria-pressed={type === "needles"} onClick={() => setType("needles")}>Knitting needles</button>
            <button type="button" className={`seg-btn ${type === "hooks" ? "is-active" : ""}`} aria-pressed={type === "hooks"} onClick={() => setType("hooks")}>Crochet hooks</button>
          </div>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="kc-sys">I have a</label>
          <select id="kc-sys" className="tool-input" value={sys} onChange={(e) => setSys(e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="kc-val">Size</label>
          <select id="kc-val" className="tool-input" value={safePick} onChange={(e) => setPick(e.target.value)}>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{type === "needles" ? "Knitting needle" : "Crochet hook"} equivalents</p>
          <div className="csc-cards">
            <div className={`csc-card ${sys === "mm" ? "is-input" : ""}`}><div className="csc-card-country">Metric</div><div className="csc-card-size">{row.mm} mm</div></div>
            <div className={`csc-card ${sys === "US" ? "is-input" : ""}`}><div className="csc-card-country">US</div><div className="csc-card-size">{row.US}</div></div>
            <div className={`csc-card ${sys === "UK" ? "is-input" : ""}`}><div className="csc-card-country">UK / Can</div><div className="csc-card-size">{row.UK}</div></div>
          </div>
          {(row.US === "—" || row.UK === "—") && (
            <p className="tool-note" style={{ margin: "8px 0 0" }}>A dash means there's no exact equivalent in that system — pick the nearest millimetre size instead.</p>
          )}
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>Metric (mm)</th><th>US</th><th>UK / Can</th></tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className={row === r ? "is-match" : ""}>
                <td>{r.mm}</td><td>{r.US}</td><td>{r.UK}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="tool-about" style={{ marginTop: 26 }}>
        <h2 className="tool-h2">Yarn weight guide</h2>
        <div className="csc-table-wrap">
          <table className="csc-table">
            <thead><tr><th>Weight</th><th>Also called</th><th>Needle mm</th><th>WPI</th></tr></thead>
            <tbody>{YARN.map((r, i) => (<tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>))}</tbody>
          </table>
        </div>
        <p className="tool-note" style={{ margin: "8px 0 0" }}>
          Yarn weight names differ by country — UK/Australian ply, US terms and the Craft Yarn Council 0–7 numbers all
          describe the same thicknesses. WPI (wraps per inch) is measured by wrapping the yarn snugly around a ruler.
        </p>
      </section>

      <p className="tool-note">
        Millimetres are the reliable reference — stamped US and UK sizes vary by manufacturer by about ±0.1–0.2 mm, and the
        UK/Canadian scale runs backwards (a higher number is a smaller needle). US crochet letters differ a little between
        brands. Steel/thread crochet hooks use a separate reversed scale and aren't shown. Free, runs in your browser.
      </p>
    </div>
  );
}
