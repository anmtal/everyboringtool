"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = `Jan, 1200, 540, 384, 312, 264
Feb, 1450, 638, 464, 377
Mar, 1310, 590, 419
Apr, 1580, 695`;

const pct1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const int0 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function isNumeric(token) {
  if (token === "" || token === null || token === undefined) return false;
  const n = Number(token.replace(/,/g, ""));
  return Number.isFinite(n);
}

function parseCohorts(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { status: "empty" };

  const cohorts = [];
  let maxPeriods = 0;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i]
      .split(/[,\t;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 0) continue;

    let label;
    let numberTokens;

    if (!isNumeric(parts[0])) {
      label = parts[0];
      numberTokens = parts.slice(1);
    } else {
      label = "Cohort " + (cohorts.length + 1);
      numberTokens = parts;
    }

    if (numberTokens.length === 0) {
      return {
        status: "error",
        message: `Line ${i + 1} ("${lines[i]}") has no numbers. Each row needs a starting count followed by active counts per period.`,
      };
    }

    const counts = [];
    for (const t of numberTokens) {
      if (!isNumeric(t)) {
        return {
          status: "error",
          message: `Line ${i + 1} has a value that isn't a number: "${t}".`,
        };
      }
      const n = Number(t.replace(/,/g, ""));
      if (n < 0) {
        return {
          status: "error",
          message: `Line ${i + 1} has a negative value: "${t}". Counts can't be negative.`,
        };
      }
      counts.push(n);
    }

    if (counts[0] === 0) {
      return {
        status: "error",
        message: `${label} starts with 0 users, so retention can't be computed for that row.`,
      };
    }

    // Retention is measured against period 0 (the starting size).
    const start = counts[0];
    const retention = counts.map((c) => (c / start) * 100);

    maxPeriods = Math.max(maxPeriods, counts.length);
    cohorts.push({ label, counts, start, retention });
  }

  if (cohorts.length === 0) return { status: "empty" };

  // Per-period averages across the cohorts that have data for that period.
  const periodAvgSimple = [];
  const periodAvgWeighted = [];
  for (let p = 0; p < maxPeriods; p++) {
    let simpleSum = 0;
    let simpleCount = 0;
    let weightedActive = 0;
    let weightedStart = 0;
    for (const co of cohorts) {
      if (p < co.retention.length) {
        simpleSum += co.retention[p];
        simpleCount += 1;
        weightedActive += co.counts[p];
        weightedStart += co.start;
      }
    }
    periodAvgSimple.push(simpleCount > 0 ? simpleSum / simpleCount : null);
    periodAvgWeighted.push(
      weightedStart > 0 ? (weightedActive / weightedStart) * 100 : null
    );
  }

  return {
    status: "ok",
    cohorts,
    maxPeriods,
    periodAvgSimple,
    periodAvgWeighted,
  };
}

function buildTable(result) {
  const { cohorts, maxPeriods, periodAvgWeighted } = result;
  const headers = ["Cohort", "Users"];
  for (let p = 0; p < maxPeriods; p++) headers.push("P" + p);

  const rows = [];
  rows.push(headers);

  for (const co of cohorts) {
    const row = [co.label, int0.format(co.start)];
    for (let p = 0; p < maxPeriods; p++) {
      if (p < co.retention.length) {
        row.push(pct1.format(co.retention[p]) + "%");
      } else {
        row.push("");
      }
    }
    rows.push(row);
  }

  const avgRow = ["Weighted avg", ""];
  for (let p = 0; p < maxPeriods; p++) {
    avgRow.push(
      periodAvgWeighted[p] === null
        ? ""
        : pct1.format(periodAvgWeighted[p]) + "%"
    );
  }
  rows.push(avgRow);

  // Column widths
  const widths = [];
  for (let c = 0; c < headers.length; c++) {
    let w = 0;
    for (const r of rows) w = Math.max(w, (r[c] || "").length);
    widths.push(w);
  }

  const lines = rows.map((r) =>
    r
      .map((cell, c) =>
        c === 0
          ? (cell || "").padEnd(widths[c])
          : (cell || "").padStart(widths[c])
      )
      .join("  ")
  );

  // Divider after header row and before the average row.
  const total = lines[0].length;
  const divider = "-".repeat(total);
  lines.splice(1, 0, divider);
  lines.splice(lines.length - 1, 0, divider);

  return lines.join("\n");
}

export default function CohortRetentionCalculator() {
  const [raw, setRaw] = useState(EXAMPLE);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => parseCohorts(raw), [raw]);

  const table = useMemo(
    () => (result.status === "ok" ? buildTable(result) : ""),
    [result]
  );

  const onCopy = async () => {
    if (!table) return;
    try {
      await copyText(table);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const showOk = result.status === "ok";
  const showError = result.status === "error";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="crc-data">
            Cohort data (one row per cohort)
          </label>
          <textarea
            id="crc-data"
            className="tool-textarea"
            rows={6}
            spellCheck={false}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Jan, 1200, 540, 384, 312\nFeb, 1450, 638, 464"}
          />
          <p className="tool-note">
            Each row: an optional label, then the starting number of users
            (period 0), then how many were still active in each later period —
            separated by commas. Retention is measured against each
            cohort&apos;s own starting size.
          </p>
        </div>
      </div>

      {showError && <div className="tool-error">{result.message}</div>}

      {showOk && (
        <>
          <div className="tool-actions">
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn btn-primary"}
              onClick={onCopy}
            >
              {copied ? "Copied" : "Copy table"}
            </button>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Retention triangle</div>
            <pre className="tool-output">{table}</pre>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            {result.periodAvgWeighted.slice(1).map((v, i) => (
              <div className="tool-stat" key={i}>
                <div className="tool-stat-num">
                  {v === null ? "—" : pct1.format(v) + "%"}
                </div>
                <div className="tool-stat-label">
                  Period {i + 1} retention
                </div>
              </div>
            ))}
          </div>

          <p className="tool-note">
            Each &quot;Period N retention&quot; is the weighted average across
            all cohorts that reached that period (total still-active users ÷
            total starting users). Weighted averages count larger cohorts more
            than smaller ones; a simple per-cohort average can differ.
          </p>
        </>
      )}

      {result.status === "empty" && (
        <p className="tool-note">
          Paste your cohort data above to build a retention triangle. Start each
          row with a label (like a month), then the starting user count, then
          the number still active in each following period.
        </p>
      )}
    </div>
  );
}
