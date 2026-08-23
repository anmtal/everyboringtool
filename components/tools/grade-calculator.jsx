"use client";

import { useMemo, useState } from "react";

let nextId = 0;
function makeRow(name = "", score = "", weight = "") {
  nextId += 1;
  return { id: `row-${nextId}`, name, score, weight };
}

// Parse a numeric field; returns null for empty/invalid input.
function toNumber(value) {
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function GradeCalculator() {
  const [mode, setMode] = useState("weighted");

  // Mode 1: weighted average rows.
  const [rows, setRows] = useState(() => [
    makeRow("Homework", "88", "20"),
    makeRow("Midterm", "82", "30"),
    makeRow("Final exam", "", "50"),
  ]);

  // Mode 2: final grade needed.
  const [currentGrade, setCurrentGrade] = useState("85");
  const [finalWeight, setFinalWeight] = useState("40");
  const [desiredGrade, setDesiredGrade] = useState("90");

  const updateRow = (id, patch) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const addRow = () => setRows((prev) => [...prev, makeRow()]);

  const removeRow = (id) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((row) => row.id !== id) : prev
    );

  const clearRows = () => setRows([makeRow("", "", "")]);

  const num1 = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }),
    []
  );
  const num2 = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
    []
  );

  // ---- Mode 1: weighted average ----
  const weighted = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;
    let countedRows = 0;

    for (const row of rows) {
      const score = toNumber(row.score);
      const weight = toNumber(row.weight);
      if (score === null || weight === null || weight <= 0) continue;
      weightedSum += score * weight;
      totalWeight += weight;
      countedRows += 1;
    }

    if (totalWeight <= 0) return null;

    return {
      average: weightedSum / totalWeight,
      totalWeight,
      countedRows,
    };
  }, [rows]);

  // ---- Mode 2: final grade needed ----
  const finalNeeded = useMemo(() => {
    const current = toNumber(currentGrade);
    const weightPct = toNumber(finalWeight);
    const desired = toNumber(desiredGrade);

    if (current === null || weightPct === null || desired === null) return null;
    if (weightPct <= 0 || weightPct > 100) return { invalidWeight: true };

    const w = weightPct / 100;
    const needed = (desired - current * (1 - w)) / w;

    return {
      needed,
      unreachable: needed > 100,
      secured: needed < 0,
    };
  }, [currentGrade, finalWeight, desiredGrade]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="grade-mode">
            What do you want to calculate?
          </label>
          <select
            className="tool-select"
            id="grade-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="weighted">Weighted average grade</option>
            <option value="final">Grade needed on final</option>
          </select>
        </div>
      </div>

      {mode === "weighted" ? (
        <>
          <div className="tool-fields">
            {rows.map((row, index) => (
              <div className="tool-row" key={row.id}>
                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-name`}>
                    Assignment {index + 1}
                  </label>
                  <input
                    className="tool-input"
                    id={`${row.id}-name`}
                    type="text"
                    placeholder="Optional (e.g. Midterm)"
                    value={row.name}
                    onChange={(e) =>
                      updateRow(row.id, { name: e.target.value })
                    }
                  />
                </div>

                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-score`}>
                    Score (%)
                  </label>
                  <input
                    className="tool-input"
                    id={`${row.id}-score`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="e.g. 88"
                    value={row.score}
                    onChange={(e) =>
                      updateRow(row.id, { score: e.target.value })
                    }
                  />
                </div>

                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-weight`}>
                    Weight (%)
                  </label>
                  <input
                    className="tool-input"
                    id={`${row.id}-weight`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="e.g. 20"
                    value={row.weight}
                    onChange={(e) =>
                      updateRow(row.id, { weight: e.target.value })
                    }
                  />
                </div>

                <div className="tool-field">
                  <label className="tool-label" htmlFor={`${row.id}-remove`}>
                    &nbsp;
                  </label>
                  <button
                    type="button"
                    className="btn"
                    id={`${row.id}-remove`}
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    aria-label={`Remove assignment ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={addRow}>
              + Add assignment
            </button>
            <button type="button" className="btn" onClick={clearRows}>
              Clear all
            </button>
          </div>

          <div className="tool-result">
            <p className="tool-result-label">WEIGHTED AVERAGE</p>
            <div className="tool-result-value">
              {weighted ? `${num2.format(weighted.average)}%` : "—"}
            </div>
          </div>

          {weighted ? (
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{`${num1.format(
                  weighted.totalWeight
                )}%`}</div>
                <div className="tool-stat-label">Total weight</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{weighted.countedRows}</div>
                <div className="tool-stat-label">
                  {weighted.countedRows === 1 ? "Assignment" : "Assignments"}
                </div>
              </div>
            </div>
          ) : null}

          {weighted ? (
            Math.abs(weighted.totalWeight - 100) > 0.01 ? (
              <p className="tool-note">
                {`Heads up: your weights add up to ${num1.format(
                  weighted.totalWeight
                )}%, not 100%. The average shown is normalized by the total weight you entered.`}
              </p>
            ) : (
              <p className="tool-note">
                Weights add up to 100%. Enter each assignment&apos;s score and
                its share of the final grade.
              </p>
            )
          ) : (
            <p className="tool-note">
              Enter a score and a weight for at least one assignment to see your
              weighted average.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="current-grade">
                  Current grade (%)
                </label>
                <input
                  className="tool-input"
                  id="current-grade"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="e.g. 85"
                  value={currentGrade}
                  onChange={(e) => setCurrentGrade(e.target.value)}
                />
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="final-weight">
                  Final is worth (%)
                </label>
                <input
                  className="tool-input"
                  id="final-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="e.g. 40"
                  value={finalWeight}
                  onChange={(e) => setFinalWeight(e.target.value)}
                />
              </div>

              <div className="tool-field">
                <label className="tool-label" htmlFor="desired-grade">
                  Desired overall (%)
                </label>
                <input
                  className="tool-input"
                  id="desired-grade"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="e.g. 90"
                  value={desiredGrade}
                  onChange={(e) => setDesiredGrade(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="tool-result">
            <p className="tool-result-label">SCORE NEEDED ON FINAL</p>
            <div className="tool-result-value">
              {finalNeeded && !finalNeeded.invalidWeight
                ? `${num2.format(finalNeeded.needed)}%`
                : "—"}
            </div>
          </div>

          {finalNeeded && finalNeeded.invalidWeight ? (
            <p className="tool-error">
              The final&apos;s weight must be greater than 0% and no more than
              100%.
            </p>
          ) : null}

          {finalNeeded && !finalNeeded.invalidWeight ? (
            finalNeeded.secured ? (
              <p className="tool-note">
                {`You've already secured it. Even a 0% on the final leaves you at or above your ${num2.format(
                  toNumber(desiredGrade)
                )}% target.`}
              </p>
            ) : finalNeeded.unreachable ? (
              <p className="tool-note">
                {`This target isn't reachable with the final alone — you'd need ${num2.format(
                  finalNeeded.needed
                )}%, which is above 100%. You'd have to earn extra credit or adjust your goal.`}
              </p>
            ) : (
              <p className="tool-note">
                {`Score at least ${num2.format(
                  finalNeeded.needed
                )}% on the final to finish the course with a ${num2.format(
                  toNumber(desiredGrade)
                )}% overall.`}
              </p>
            )
          ) : (
            !finalNeeded ? (
              <p className="tool-note">
                Enter your current grade, how much the final is worth, and the
                overall grade you want.
              </p>
            ) : null
          )}
        </>
      )}
    </div>
  );
}
