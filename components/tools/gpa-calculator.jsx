"use client";

import { useMemo, useState } from "react";

const GRADE_OPTIONS = [
  { value: "4.0", label: "A+ (4.0)", points: 4.0 },
  { value: "4.0-a", label: "A (4.0)", points: 4.0 },
  { value: "3.7", label: "A- (3.7)", points: 3.7 },
  { value: "3.3", label: "B+ (3.3)", points: 3.3 },
  { value: "3.0", label: "B (3.0)", points: 3.0 },
  { value: "2.7", label: "B- (2.7)", points: 2.7 },
  { value: "2.3", label: "C+ (2.3)", points: 2.3 },
  { value: "2.0", label: "C (2.0)", points: 2.0 },
  { value: "1.7", label: "C- (1.7)", points: 1.7 },
  { value: "1.0", label: "D (1.0)", points: 1.0 },
  { value: "0.0", label: "F (0.0)", points: 0.0 },
];
const POINTS = GRADE_OPTIONS.reduce((a, o) => { a[o.value] = o.points; return a; }, {});
const TYPE_BONUS = { regular: 0, honors: 0.5, ap: 1.0 };
const TYPE_OPTIONS = [{ v: "regular", l: "Regular" }, { v: "honors", l: "Honors (+0.5)" }, { v: "ap", l: "AP / IB (+1.0)" }];

let nextId = 0;
const makeRow = (grade = "4.0-a", credits = "3", type = "regular") => ({ id: `row-${++nextId}`, name: "", grade, credits, type });
function toNum(v) { const t = String(v).trim(); if (t === "") return null; const n = Number(t); return Number.isFinite(n) && n >= 0 ? n : null; }

export default function GpaCalculator({ initialMode = "semester", initialWeighted = false } = {}) {
  const [mode, setMode] = useState(initialMode); // semester | target
  const [weighted, setWeighted] = useState(initialWeighted);
  const [rows, setRows] = useState(() => [makeRow("4.0-a", "3"), makeRow("3.3", "4"), makeRow("3.0", "3")]);
  // Optional prior cumulative (semester mode).
  const [priorGpa, setPriorGpa] = useState("");
  const [priorCredits, setPriorCredits] = useState("");
  // Target planner (target mode).
  const [curGpa, setCurGpa] = useState("3.2");
  const [curCredits, setCurCredits] = useState("60");
  const [goalGpa, setGoalGpa] = useState("3.5");
  const [remCredits, setRemCredits] = useState("30");

  const updateRow = (id, patch) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((p) => [...p, makeRow()]);
  const removeRow = (id) => setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const clearAll = () => setRows([makeRow("4.0-a", "")]);

  const sem = useMemo(() => {
    let pts = 0, cr = 0, n = 0;
    for (const row of rows) {
      const credits = toNum(row.credits);
      const base = POINTS[row.grade];
      if (credits === null || credits <= 0 || base === undefined) continue;
      const p = weighted && base > 0 ? base + (TYPE_BONUS[row.type] || 0) : base;
      pts += p * credits; cr += credits; n += 1;
    }
    if (cr <= 0) return null;
    return { gpa: pts / cr, points: pts, credits: cr, n };
  }, [rows, weighted]);

  const cumulative = useMemo(() => {
    if (!sem) return null;
    const pg = toNum(priorGpa), pc = toNum(priorCredits);
    if (pg === null || pc === null || pc <= 0) return null;
    const totalCr = pc + sem.credits;
    return { gpa: (pg * pc + sem.points) / totalCr, credits: totalCr };
  }, [sem, priorGpa, priorCredits]);

  const target = useMemo(() => {
    const cg = toNum(curGpa), cc = toNum(curCredits), gg = toNum(goalGpa), rc = toNum(remCredits);
    if (cg === null || cc === null || gg === null || rc === null || rc <= 0) return null;
    const needed = (gg * (cc + rc) - cg * cc) / rc;
    return { needed, cc, rc, gg };
  }, [curGpa, curCredits, goalGpa, remCredits]);

  const fmt = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }), []);

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Mode" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={mode === "semester"} className={`seg-btn ${mode === "semester" ? "is-active" : ""}`} onClick={() => setMode("semester")}>Calculate GPA</button>
        <button type="button" role="tab" aria-selected={mode === "target"} className={`seg-btn ${mode === "target" ? "is-active" : ""}`} onClick={() => setMode("target")}>What GPA do I need?</button>
      </div>

      {mode === "semester" ? (
        <>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} />
            Weighted (add AP / IB / Honors bonus)
          </label>

          <div className="tool-fields">
            {rows.map((row, index) => (
              <div className="tool-row" key={row.id}>
                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-name`}>Course {index + 1}</label>
                  <input className="tool-input" id={`${row.id}-name`} type="text" placeholder="Optional (e.g. Biology 101)" value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
                </div>
                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-grade`}>Grade</label>
                  <select className="tool-select" id={`${row.id}-grade`} value={row.grade} onChange={(e) => updateRow(row.id, { grade: e.target.value })}>
                    {GRADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {weighted && (
                  <div className="tool-field">
                    <label className="tool-label" htmlFor={`${row.id}-type`}>Type</label>
                    <select className="tool-select" id={`${row.id}-type`} value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value })}>
                      {TYPE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                )}
                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-credits`}>Credits</label>
                  <input className="tool-input" id={`${row.id}-credits`} type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 3" value={row.credits} onChange={(e) => updateRow(row.id, { credits: e.target.value })} />
                </div>
                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-remove`}>&nbsp;</label>
                  <button type="button" className="btn" id={`${row.id}-remove`} onClick={() => removeRow(row.id)} disabled={rows.length <= 1} aria-label={`Remove course ${index + 1}`}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={addRow}>+ Add course</button>
            <button type="button" className="btn" onClick={clearAll}>Clear all</button>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">{weighted ? "WEIGHTED GPA" : "GPA"} (this term)</p>
            <div className="tool-result-value">{sem ? sem.gpa.toFixed(2) : "—"}</div>
          </div>

          {sem && (
            <p className="tool-note">Based on {fmt.format(sem.credits)} credits across {sem.n} {sem.n === 1 ? "course" : "courses"}.</p>
          )}

          <div className="tool-row" style={{ marginTop: 12 }}>
            <div className="tool-field">
              <label className="tool-label" htmlFor="gpa-prior">Prior cumulative GPA (optional)</label>
              <input className="tool-input" id="gpa-prior" type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 3.4" value={priorGpa} onChange={(e) => setPriorGpa(e.target.value)} />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="gpa-priorcr">Credits completed so far</label>
              <input className="tool-input" id="gpa-priorcr" type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 45" value={priorCredits} onChange={(e) => setPriorCredits(e.target.value)} />
            </div>
          </div>
          {cumulative && (
            <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 12 }}>
              <div className="tool-stat"><div className="tool-stat-num">{cumulative.gpa.toFixed(2)}</div><div className="tool-stat-label">New cumulative GPA</div></div>
              <div className="tool-stat"><div className="tool-stat-num">{fmt.format(cumulative.credits)}</div><div className="tool-stat-label">Total credits</div></div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="tool-note" style={{ marginTop: 0 }}>Find the GPA you'd need in your remaining courses to reach a goal cumulative GPA.</p>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="t-cur">Current cumulative GPA</label>
              <input className="tool-input" id="t-cur" type="number" inputMode="decimal" min="0" step="any" value={curGpa} onChange={(e) => setCurGpa(e.target.value)} />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="t-cc">Credits completed</label>
              <input className="tool-input" id="t-cc" type="number" inputMode="decimal" min="0" step="any" value={curCredits} onChange={(e) => setCurCredits(e.target.value)} />
            </div>
          </div>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="t-goal">Goal cumulative GPA</label>
              <input className="tool-input" id="t-goal" type="number" inputMode="decimal" min="0" step="any" value={goalGpa} onChange={(e) => setGoalGpa(e.target.value)} />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="t-rem">Remaining credits</label>
              <input className="tool-input" id="t-rem" type="number" inputMode="decimal" min="0" step="any" value={remCredits} onChange={(e) => setRemCredits(e.target.value)} />
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">GPA NEEDED IN REMAINING {target ? fmt.format(target.rc) : ""} CREDITS</p>
            <div className="tool-result-value">{target ? target.needed.toFixed(2) : "—"}</div>
          </div>
          {target && (
            <p className="tool-note">
              {target.needed <= 0
                ? `You've already reached a ${target.gg.toFixed(2)} cumulative GPA — even a 0.0 in your remaining credits keeps you at or above the goal.`
                : target.needed > 5
                  ? `Reaching a ${target.gg.toFixed(2)} cumulative GPA from here isn't possible in ${fmt.format(target.rc)} credits — it would require a ${target.needed.toFixed(2)}, above any grade scale. Add more remaining credits or lower the goal.`
                  : target.needed > 4
                    ? `You'd need a ${target.needed.toFixed(2)} average — only reachable on a weighted (AP/IB) scale. On a standard 4.0 scale it isn't possible in ${fmt.format(target.rc)} credits.`
                    : `To reach a ${target.gg.toFixed(2)} cumulative GPA, average a ${target.needed.toFixed(2)} across your remaining ${fmt.format(target.rc)} credits.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
