"use client";

import { useMemo, useState } from "react";

// Default hours assumed for a topic when the user leaves "hours" blank.
const DEFAULT_TOPIC_HOURS = 1;
const EPS = 1e-9;

let nextId = 0;
function makeTopic(name = "", hours = "") {
  nextId += 1;
  return { id: `topic-${nextId}`, name, hours };
}

// Parse a "YYYY-MM-DD" value as a local date (avoids timezone drift).
function parseDate(value) {
  if (!value) return null;
  const parts = String(value).split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function todayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Non-negative finite number, or null when blank/invalid.
function toHours(value) {
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

const hoursFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function formatHours(n) {
  return hoursFmt.format(Math.round(n * 100) / 100);
}

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function StudyPlanner() {
  const [deadline, setDeadline] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [hoursPerDay, setHoursPerDay] = useState("3");
  const [topics, setTopics] = useState(() => [
    makeTopic("", ""),
    makeTopic("", ""),
    makeTopic("", ""),
  ]);
  const [copied, setCopied] = useState(false);

  const updateTopic = (id, patch) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };
  const addTopic = () => setTopics((prev) => [...prev, makeTopic()]);
  const removeTopic = (id) =>
    setTopics((prev) =>
      prev.length > 1 ? prev.filter((t) => t.id !== id) : prev
    );
  const clearAll = () => {
    setTopics([makeTopic("", "")]);
    setDeadline("");
    setStartDate(todayISO());
    setHoursPerDay("3");
    setCopied(false);
  };

  const plan = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(deadline);
    const perDay = toHours(hoursPerDay);

    // Normalise topics: keep only rows with a name; default blank hours.
    const cleanTopics = topics
      .map((t) => {
        const name = t.name.trim();
        const parsed = toHours(t.hours);
        return {
          name,
          hours: parsed === null ? DEFAULT_TOPIC_HOURS : parsed,
          hoursProvided: parsed !== null,
        };
      })
      .filter((t) => t.name !== "" && t.hours > 0);

    // Validation gates -> friendly messages, no crashes.
    if (cleanTopics.length === 0) {
      return { status: "empty", message: "add-topics" };
    }
    if (!end) {
      return { status: "empty", message: "no-deadline" };
    }
    if (!start) {
      return { status: "empty", message: "no-start" };
    }
    if (end.getTime() < start.getTime()) {
      return { status: "empty", message: "deadline-before-start" };
    }
    if (perDay === null || perDay <= 0) {
      return { status: "empty", message: "no-hours" };
    }

    // Build the inclusive list of study days from start .. deadline.
    const days = [];
    const cursor = new Date(start.getTime());
    // Guard against pathological ranges.
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 3660) {
      days.push(new Date(cursor.getTime()));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    const totalDays = days.length;
    const totalNeeded = cleanTopics.reduce((sum, t) => sum + t.hours, 0);
    const totalCapacity = totalDays * perDay;
    const anyDefaulted = cleanTopics.some((t) => !t.hoursProvided);

    // Greedy fill: walk topics in order, packing each day up to perDay hours.
    const queue = cleanTopics.map((t) => ({ name: t.name, remaining: t.hours }));
    let qi = 0;
    const schedule = days.map((date) => {
      let capacity = perDay;
      const items = [];
      while (capacity > EPS && qi < queue.length) {
        const topic = queue[qi];
        const take = Math.min(topic.remaining, capacity);
        const rounded = Math.round(take * 100) / 100;
        const existing = items.find((it) => it.name === topic.name);
        if (existing) {
          existing.hours += rounded;
        } else {
          items.push({ name: topic.name, hours: rounded });
        }
        topic.remaining -= take;
        capacity -= take;
        if (topic.remaining <= EPS) qi += 1;
      }
      const used = items.reduce((s, it) => s + it.hours, 0);
      return { date, items, used: Math.round(used * 100) / 100 };
    });

    // Leftover = topics/hours that did not fit before the deadline.
    const leftover = [];
    for (let i = qi; i < queue.length; i += 1) {
      if (queue[i].remaining > EPS) {
        leftover.push({
          name: queue[i].name,
          hours: Math.round(queue[i].remaining * 100) / 100,
        });
      }
    }
    const leftoverHours = leftover.reduce((s, l) => s + l.hours, 0);

    return {
      status: "ok",
      schedule,
      totalDays,
      totalNeeded,
      totalCapacity,
      topicCount: cleanTopics.length,
      perDay,
      anyDefaulted,
      leftover,
      leftoverHours,
      fits: leftoverHours <= EPS,
    };
  }, [topics, deadline, startDate, hoursPerDay]);

  const scheduleText = useMemo(() => {
    if (!plan || plan.status !== "ok") return "";
    const lines = ["Study Plan", ""];
    for (const day of plan.schedule) {
      const header = `${weekdayFmt.format(day.date)}  (${formatHours(day.used)}h)`;
      lines.push(header);
      if (day.items.length === 0) {
        lines.push("  - (free / buffer)");
      } else {
        for (const it of day.items) {
          lines.push(`  - ${it.name}: ${formatHours(it.hours)}h`);
        }
      }
      lines.push("");
    }
    if (!plan.fits) {
      lines.push(`Does not fit before the deadline: ${formatHours(plan.leftoverHours)}h remaining.`);
      for (const l of plan.leftover) {
        lines.push(`  - ${l.name}: ${formatHours(l.hours)}h left over`);
      }
    }
    return lines.join("\n");
  }, [plan]);

  const copySchedule = async () => {
    if (!scheduleText) return;
    try {
      await navigator.clipboard.writeText(scheduleText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopied(false);
    }
  };

  const downloadCSV = () => {
    if (!plan || plan.status !== "ok") return;
    const rows = [["Date", "Topic", "Hours"]];
    for (const day of plan.schedule) {
      const label = toISO(day.date);
      if (day.items.length === 0) {
        rows.push([label, "(free / buffer)", "0"]);
      } else {
        for (const it of day.items) {
          rows.push([label, it.name, formatHours(it.hours)]);
        }
      }
    }
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-plan.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const noteFor = (message) => {
    switch (message) {
      case "add-topics":
        return "Add at least one subject or topic to build a schedule.";
      case "no-deadline":
        return "Pick your deadline or exam date to spread the work across the days ahead.";
      case "no-start":
        return "Choose a valid start date.";
      case "deadline-before-start":
        return "Your deadline is before the start date — pick a deadline that comes after it.";
      case "no-hours":
        return "Enter how many hours per day you can study (a number greater than 0).";
      default:
        return "Fill in your subjects, deadline, and daily hours to see a plan.";
    }
  };

  const cellBorder = "1px solid rgba(128,128,128,0.28)";
  const softBg = "rgba(128,128,128,0.08)";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-start">
              Start date
            </label>
            <input
              className="tool-input"
              id="sp-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-deadline">
              Deadline / exam date
            </label>
            <input
              className="tool-input"
              id="sp-deadline"
              type="date"
              value={deadline}
              min={startDate || undefined}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-perday">
              Study hours per day
            </label>
            <input
              className="tool-input"
              id="sp-perday"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 3"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tool-label" style={{ marginTop: 18, marginBottom: 8 }}>
        Subjects / topics
      </div>
      <div className="tool-fields">
        {topics.map((t, index) => (
          <div className="tool-row" key={t.id}>
            <div className="tool-field" style={{ flex: "2 1 200px" }}>
              <label className="tool-label" htmlFor={`${t.id}-name`}>
                Topic {index + 1}
              </label>
              <input
                className="tool-input"
                id={`${t.id}-name`}
                type="text"
                placeholder="e.g. Chapter 4: Thermodynamics"
                value={t.name}
                onChange={(e) => updateTopic(t.id, { name: e.target.value })}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${t.id}-hours`}>
                Hours needed (optional)
              </label>
              <input
                className="tool-input"
                id={`${t.id}-hours`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="default 1"
                value={t.hours}
                onChange={(e) => updateTopic(t.id, { hours: e.target.value })}
              />
            </div>
            <div className="tool-field" style={{ flex: "0 0 auto" }}>
              <label className="tool-label" htmlFor={`${t.id}-remove`}>
                &nbsp;
              </label>
              <button
                type="button"
                className="btn"
                id={`${t.id}-remove`}
                onClick={() => removeTopic(t.id)}
                disabled={topics.length <= 1}
                aria-label={`Remove topic ${index + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={addTopic}>
          + Add topic
        </button>
        <button type="button" className="btn" onClick={clearAll}>
          Clear all
        </button>
      </div>

      {plan && plan.status === "ok" ? (
        <>
          <div className="tool-stat-grid" style={{ marginTop: 18 }}>
            <div className="tool-stat">
              <div className="tool-stat-num">{plan.totalDays}</div>
              <div className="tool-stat-label">
                {plan.totalDays === 1 ? "Study day" : "Study days"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatHours(plan.totalNeeded)}h</div>
              <div className="tool-stat-label">Hours to study</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatHours(plan.totalCapacity)}h</div>
              <div className="tool-stat-label">Time available</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{plan.topicCount}</div>
              <div className="tool-stat-label">
                {plan.topicCount === 1 ? "Topic" : "Topics"}
              </div>
            </div>
          </div>

          {!plan.fits ? (
            <div className="tool-error" style={{ marginTop: 16 }}>
              {`Not enough time: ${formatHours(plan.leftoverHours)}h won't fit before your deadline. `}
              {`Increase your daily hours, start earlier, or trim topics. `}
              {plan.leftover.length > 0
                ? `Left over — ${plan.leftover
                    .map((l) => `${l.name} (${formatHours(l.hours)}h)`)
                    .join(", ")}.`
                : ""}
            </div>
          ) : (
            <p className="tool-note" style={{ marginTop: 16 }}>
              Everything fits with{" "}
              {formatHours(plan.totalCapacity - plan.totalNeeded)}h of buffer to
              spare.
            </p>
          )}

          <div
            style={{
              marginTop: 16,
              overflowX: "auto",
              border: cellBorder,
              borderRadius: 8,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                minWidth: 340,
              }}
            >
              <thead>
                <tr style={{ background: softBg }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: cellBorder,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Day
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: cellBorder,
                    }}
                  >
                    Plan
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                      borderBottom: cellBorder,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.schedule.map((day, i) => (
                  <tr
                    key={toISO(day.date)}
                    style={{ background: i % 2 === 1 ? softBg : "transparent" }}
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: cellBorder,
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                        fontWeight: 600,
                      }}
                    >
                      {weekdayFmt.format(day.date)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: cellBorder,
                        verticalAlign: "top",
                      }}
                    >
                      {day.items.length === 0 ? (
                        <span style={{ opacity: 0.6 }}>Free / buffer</span>
                      ) : (
                        day.items.map((it, j) => (
                          <div key={j}>
                            {it.name}
                            <span style={{ opacity: 0.6 }}>
                              {" "}
                              — {formatHours(it.hours)}h
                            </span>
                          </div>
                        ))
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: cellBorder,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                      }}
                    >
                      {formatHours(day.used)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tool-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn"}
              onClick={copySchedule}
            >
              {copied ? "Copied!" : "Copy schedule"}
            </button>
            <button type="button" className="btn" onClick={downloadCSV}>
              Download CSV
            </button>
          </div>

          {plan.anyDefaulted ? (
            <p className="tool-note" style={{ marginTop: 10 }}>
              Topics left blank were assumed to need {DEFAULT_TOPIC_HOURS} hour
              each. Add specific hours for a more accurate plan.
            </p>
          ) : null}
        </>
      ) : (
        <p className="tool-note" style={{ marginTop: 18 }}>
          {noteFor(plan ? plan.message : "")}
        </p>
      )}
    </div>
  );
}
