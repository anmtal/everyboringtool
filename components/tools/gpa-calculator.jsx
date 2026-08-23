"use client";

import { useMemo, useState } from "react";

// Standard 4.0 letter-grade scale.
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

const POINTS_BY_VALUE = GRADE_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.points;
  return acc;
}, {});

let nextId = 0;
function makeRow(grade = "4.0-a", credits = "3") {
  nextId += 1;
  return { id: `row-${nextId}`, name: "", grade, credits };
}

function toCredits(value) {
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function GpaCalculator() {
  const [rows, setRows] = useState(() => [
    makeRow("4.0-a", "3"),
    makeRow("3.3", "4"),
    makeRow("3.0", "3"),
  ]);

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

  const clearAll = () => setRows([makeRow("4.0-a", "")]);

  const results = useMemo(() => {
    let weightedPoints = 0;
    let totalCredits = 0;
    let countedRows = 0;

    for (const row of rows) {
      const credits = toCredits(row.credits);
      const points = POINTS_BY_VALUE[row.grade];
      if (credits === null || credits <= 0 || points === undefined) continue;
      weightedPoints += points * credits;
      totalCredits += credits;
      countedRows += 1;
    }

    if (totalCredits <= 0) return null;

    return {
      gpa: weightedPoints / totalCredits,
      totalCredits,
      countedRows,
    };
  }, [rows]);

  const creditsFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }),
    []
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        {rows.map((row, index) => (
          <div className="tool-row" key={row.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${row.id}-name`}>
                Course {index + 1}
              </label>
              <input
                className="tool-input"
                id={`${row.id}-name`}
                type="text"
                placeholder="Optional (e.g. Biology 101)"
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
              />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={`${row.id}-grade`}>
                Grade
              </label>
              <select
                className="tool-select"
                id={`${row.id}-grade`}
                value={row.grade}
                onChange={(e) => updateRow(row.id, { grade: e.target.value })}
              >
                {GRADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={`${row.id}-credits`}>
                Credits
              </label>
              <input
                className="tool-input"
                id={`${row.id}-credits`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 3"
                value={row.credits}
                onChange={(e) => updateRow(row.id, { credits: e.target.value })}
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
                aria-label={`Remove course ${index + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={addRow}>
          + Add course
        </button>
        <button type="button" className="btn" onClick={clearAll}>
          Clear all
        </button>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">WEIGHTED GPA</p>
        <div className="tool-result-value">
          {results ? results.gpa.toFixed(2) : "—"}
        </div>
      </div>

      {results ? (
        <p className="tool-note">
          {`Total credits: ${creditsFormatter.format(results.totalCredits)} across ${results.countedRows} ${
            results.countedRows === 1 ? "course" : "courses"
          }.`}
        </p>
      ) : (
        <p className="tool-note">
          Pick a grade and enter the credit hours for each course to see your
          GPA.
        </p>
      )}
    </div>
  );
}
