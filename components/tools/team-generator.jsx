"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const TWO_32 = 0x100000000; // 2^32
const MAX_GROUPS = 200;

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(TWO_32 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// In-place Fisher-Yates shuffle built on randInt, returning a new array.
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// Parse a text field into a whole number, or null if it isn't a valid integer.
function parseIntOrNull(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

// Split shuffled names into `groupCount` balanced teams, distributing any
// remainder one extra member per team from the top.
function splitIntoTeams(names, groupCount) {
  const teams = Array.from({ length: groupCount }, () => []);
  const base = Math.floor(names.length / groupCount);
  const extra = names.length % groupCount;
  let idx = 0;
  for (let t = 0; t < groupCount; t++) {
    const size = base + (t < extra ? 1 : 0);
    for (let k = 0; k < size; k++) {
      teams[t].push(names[idx]);
      idx += 1;
    }
  }
  return teams;
}

export default function TeamGenerator() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("teams"); // "teams" | "perTeam"
  const [countText, setCountText] = useState("2");
  const [teams, setTeams] = useState([]);
  const [copied, setCopied] = useState(false);
  // One persistent live region (below) does the announcing. The results
  // themselves mount already-populated, so a live region inside them never
  // changes while a screen reader is watching and nothing is ever announced.
  const [announcement, setAnnouncement] = useState("");

  const names = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [text]);

  const count = useMemo(() => parseIntOrNull(countText), [countText]);

  // Editing the list makes any previous announcement stale — clear it so the
  // next "Make teams" is heard as a fresh result.
  useEffect(() => {
    setAnnouncement("");
  }, [text]);

  const error = useMemo(() => {
    if (names.length < 2) return null; // handled by the empty-state note
    if (count === null) {
      return mode === "teams"
        ? "Enter how many teams to make."
        : "Enter how many players per team.";
    }
    if (count < 1) {
      return mode === "teams"
        ? "Make at least one team."
        : "Put at least one player per team.";
    }
    if (count > MAX_GROUPS) {
      return `Keep it to ${MAX_GROUPS.toLocaleString("en-US")} or fewer.`;
    }
    if (mode === "teams" && count > names.length) {
      return `You have ${names.length.toLocaleString(
        "en-US"
      )} names but asked for ${count.toLocaleString(
        "en-US"
      )} teams. Some teams would be empty — lower the number of teams.`;
    }
    return null;
  }, [names.length, count, mode]);

  const canMake = names.length >= 2 && count !== null && !error;

  // How many teams the current settings would produce, for the live hint.
  const projectedTeamCount = useMemo(() => {
    if (!canMake) return 0;
    if (mode === "teams") return count;
    return Math.max(1, Math.ceil(names.length / count));
  }, [canMake, mode, count, names.length]);

  const make = useCallback(() => {
    setCopied(false);
    if (!canMake) {
      setTeams([]);
      setAnnouncement("");
      return;
    }
    const groupCount =
      mode === "teams" ? count : Math.max(1, Math.ceil(names.length / count));
    const shuffled = shuffle(names);
    setTeams(splitIntoTeams(shuffled, groupCount));
    setAnnouncement(
      `Made ${groupCount.toLocaleString("en-US")} ${
        groupCount === 1 ? "team" : "teams"
      } from ${names.length.toLocaleString("en-US")} names.`
    );
  }, [canMake, mode, count, names]);

  const clearAll = useCallback(() => {
    setText("");
    setTeams([]);
    setCopied(false);
    setAnnouncement("");
  }, []);

  const joined = useMemo(() => {
    return teams
      .map((team, i) => `Team ${i + 1}\n${team.join("\n")}`)
      .join("\n\n");
  }, [teams]);

  async function handleCopy() {
    if (teams.length === 0) return;
    try {
      await copyText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const sizes = useMemo(() => teams.map((t) => t.length), [teams]);
  const minSize = sizes.length ? Math.min(...sizes) : 0;
  const maxSize = sizes.length ? Math.max(...sizes) : 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="tg-list">
            Names (one per line)
          </label>
          <textarea
            id="tg-list"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Alice\nBob\nCharlie\nDana\nEli\nFinn\n…"}
            rows={10}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tg-mode">
              Split by
            </label>
            <select
              id="tg-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="teams">Number of teams</option>
              <option value="perTeam">Players per team</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tg-count">
              {mode === "teams" ? "How many teams" : "Players per team"}
            </label>
            <input
              id="tg-count"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_GROUPS}
              step={1}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              placeholder="2"
            />
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={make}
          disabled={!canMake}
        >
          Make teams
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={teams.length === 0}
        >
          {copied ? "Copied!" : "Copy all"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={clearAll}
          disabled={text === "" && teams.length === 0}
        >
          Clear
        </button>
      </div>

      {/* Always mounted so screen readers are watching it before the teams
          appear. Visually hidden inline — globals.css is owned elsewhere. */}
      <p
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          margin: "-1px",
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {announcement}
      </p>

      {error ? (
        <p className="tool-error" role="alert">
          {error}
        </p>
      ) : names.length < 2 ? (
        <p className="tool-note">
          Add at least two names above — one per line. Then choose how to split
          and press &ldquo;Make teams&rdquo;.
        </p>
      ) : teams.length === 0 ? (
        <p className="tool-note">
          {names.length.toLocaleString("en-US")} names ready.{" "}
          {projectedTeamCount > 0
            ? `This will make ${projectedTeamCount.toLocaleString(
                "en-US"
              )} ${projectedTeamCount === 1 ? "team" : "teams"}. `
            : ""}
          Press &ldquo;Make teams&rdquo; to shuffle.
        </p>
      ) : (
        <>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {teams.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Teams</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {names.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Players</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {minSize === maxSize ? minSize : `${minSize}–${maxSize}`}
              </div>
              <div className="tool-stat-label">Per team</div>
            </div>
          </div>

          <div
            className="tool-result"
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {teams.map((team, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid var(--border, #d0d0d0)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 0.9rem",
                }}
              >
                <div
                  className="tool-result-label"
                  style={{ marginBottom: "0.4rem" }}
                >
                  Team {i + 1}{" "}
                  <span style={{ fontWeight: "normal", opacity: 0.7 }}>
                    ({team.length})
                  </span>
                </div>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "1.3rem",
                    lineHeight: 1.6,
                  }}
                >
                  {team.map((member, k) => (
                    <li key={k} style={{ wordBreak: "break-word" }}>
                      {member}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="tool-note">
        Teams are shuffled with your browser&apos;s built-in cryptographic
        random generator (crypto.getRandomValues) for fair, unbiased splits.
        Everything runs locally — your list of names never leaves your browser.
      </p>
    </div>
  );
}
