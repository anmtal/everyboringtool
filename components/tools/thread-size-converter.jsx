"use client";

import { useState, useMemo } from "react";

// All conversions go through Tex (grams per 1000 m). Inverse systems (Nm, Ne,
// ticket, weight) get bigger as the thread gets FINER.
const SYSTEMS = [
  { key: "tex", label: "Tex", inverse: false },
  { key: "denier", label: "Denier", inverse: false },
  { key: "dtex", label: "Dtex", inverse: false },
  { key: "nm", label: "Metric count (Nm)", inverse: true },
  { key: "ne", label: "Cotton count (Ne)", inverse: true },
  { key: "tkt", label: "Ticket (metric Tkt)", inverse: true },
  { key: "wt", label: "Weight (wt, embroidery)", inverse: true },
];

const toTex = { tex: (v) => v, denier: (v) => v / 9, dtex: (v) => v / 10, nm: (v) => 1000 / v, ne: (v) => 590.5 / v, tkt: (v) => 3000 / v, wt: (v) => 1000 / v };
const fromTex = { tex: (t) => t, denier: (t) => t * 9, dtex: (t) => t * 10, nm: (t) => 1000 / t, ne: (t) => 590.5 / t, tkt: (t) => 3000 / t, wt: (t) => 1000 / t };
const fmt = (n) => (!isFinite(n) ? "—" : n >= 100 ? Math.round(n) : n >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100).toString();

export default function ThreadSizeConverter() {
  const [sys, setSys] = useState("tex");
  const [value, setValue] = useState("30");

  const out = useMemo(() => {
    const v = parseFloat(value);
    if (!isFinite(v) || v <= 0) return null;
    const tex = toTex[sys](v);
    if (!isFinite(tex) || tex <= 0) return null;
    return SYSTEMS.map((s) => ({ ...s, val: fromTex[s.key](tex) }));
  }, [sys, value]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="th-sys">System</label>
          <select id="th-sys" className="tool-input" value={sys} onChange={(e) => setSys(e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="th-val">Value</label>
          <input id="th-val" className="tool-input" type="number" step="1" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      </div>

      {out && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Equivalent thread sizes</p>
          <div className="csc-cards">
            {out.map((s) => (
              <div key={s.key} className={`csc-card ${s.key === sys ? "is-input" : ""}`}>
                <div className="csc-card-country">{s.label.replace(/ \(.*\)/, "")}</div>
                <div className="csc-card-size">{fmt(s.val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="tool-note">
        Tex, denier and dtex are fixed-length systems (higher = thicker); Nm, cotton count (Ne), ticket and embroidery
        "weight" are fixed-weight systems that run the other way (higher = finer). Core relations: Tex×9 = denier, Nm =
        1000/Tex. The embroidery weight (40wt, 50wt, 60wt) is a nominal, brand-ish figure, and metric ticket ≈ Nm×3;
        cotton ticket differs. Wraps-per-inch isn't standardised for thread, so it's omitted. Free, runs in your browser.
      </p>
    </div>
  );
}
