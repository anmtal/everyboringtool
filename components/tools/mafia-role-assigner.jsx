"use client";

import { useCallback, useMemo, useState } from "react";

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 30;

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(0x100000000 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// Standard Fisher-Yates shuffle built on randInt. Returns a new array.
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

// Suggested balance: roughly one Mafia per three players, plus one Detective
// and one Doctor once the table is big enough. Everyone else is a Villager.
function suggestCounts(n) {
  if (n < MIN_PLAYERS) {
    return { mafia: 0, detective: 0, doctor: 0 };
  }
  const mafia = Math.max(1, Math.round(n / 3.5));
  const detective = 1;
  const doctor = n >= 5 ? 1 : 0;
  return { mafia, detective, doctor };
}

function parseIntOrNull(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

const ROLE_META = {
  Mafia: { emoji: "🕵️‍♂️", blurb: "Wake at night and secretly choose someone to eliminate." },
  Detective: { emoji: "🔎", blurb: "Each night, investigate one player to learn if they are Mafia." },
  Doctor: { emoji: "🩺", blurb: "Each night, choose one player to protect from elimination." },
  Villager: { emoji: "🧑‍🌾", blurb: "Sleep at night. By day, discuss and vote to find the Mafia." },
};

export default function MafiaRoleAssigner() {
  const [useNames, setUseNames] = useState(false);
  const [countText, setCountText] = useState("8");
  const [namesText, setNamesText] = useState("");

  const [mafiaText, setMafiaText] = useState("2");
  const [detectiveText, setDetectiveText] = useState("1");
  const [doctorText, setDoctorText] = useState("1");

  const [assignments, setAssignments] = useState([]); // {name, role}
  const [revealed, setRevealed] = useState({}); // index -> bool
  const [touched, setTouched] = useState(false); // has the user edited role counts

  // Names entered (trimmed, non-blank).
  const names = useMemo(() => {
    return namesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [namesText]);

  const numFromCount = useMemo(() => parseIntOrNull(countText), [countText]);

  // Effective player count from whichever input mode is active.
  const playerCount = useMemo(() => {
    if (useNames) return names.length;
    return numFromCount === null ? 0 : numFromCount;
  }, [useNames, names.length, numFromCount]);

  const mafia = useMemo(() => parseIntOrNull(mafiaText) ?? 0, [mafiaText]);
  const detective = useMemo(() => parseIntOrNull(detectiveText) ?? 0, [detectiveText]);
  const doctor = useMemo(() => parseIntOrNull(doctorText) ?? 0, [doctorText]);

  const special = mafia + detective + doctor;
  const villagers = playerCount - special;

  // Fill the suggested counts for the current player count.
  const applySuggestion = useCallback(() => {
    const s = suggestCounts(playerCount);
    setMafiaText(String(s.mafia));
    setDetectiveText(String(s.detective));
    setDoctorText(String(s.doctor));
    setTouched(true);
  }, [playerCount]);

  const error = useMemo(() => {
    if (playerCount === 0) return null;
    if (playerCount < MIN_PLAYERS)
      return `Mafia works best with at least ${MIN_PLAYERS} players — you have ${playerCount}.`;
    if (playerCount > MAX_PLAYERS)
      return `Keep it to ${MAX_PLAYERS} players or fewer.`;
    if (mafia < 1) return "You need at least 1 Mafia.";
    if (special > playerCount)
      return `Your special roles add up to ${special}, but there are only ${playerCount} players. Lower a count.`;
    if (villagers < 0) return "Too many special roles for this many players.";
    if (mafia * 2 >= playerCount)
      return "That is a lot of Mafia — with half the table or more as Mafia, the town cannot win. Lower the Mafia count.";
    return null;
  }, [playerCount, mafia, special, villagers]);

  const canAssign = playerCount >= MIN_PLAYERS && !error;

  const assign = useCallback(() => {
    if (!canAssign) {
      setAssignments([]);
      setRevealed({});
      return;
    }
    // Build the role pool.
    const roles = [];
    for (let i = 0; i < mafia; i++) roles.push("Mafia");
    for (let i = 0; i < detective; i++) roles.push("Detective");
    for (let i = 0; i < doctor; i++) roles.push("Doctor");
    while (roles.length < playerCount) roles.push("Villager");

    const shuffledRoles = shuffle(roles);

    // Player labels: real names if provided, otherwise Player 1..N.
    const labels = useNames
      ? names.slice()
      : Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

    const result = labels.map((name, i) => ({ name, role: shuffledRoles[i] }));
    setAssignments(result);
    setRevealed({});
  }, [canAssign, mafia, detective, doctor, playerCount, useNames, names]);

  const toggleReveal = useCallback((i) => {
    setRevealed((prev) => ({ ...prev, [i]: !prev[i] }));
  }, []);

  const hideAll = useCallback(() => setRevealed({}), []);

  const clearAll = useCallback(() => {
    setAssignments([]);
    setRevealed({});
    setNamesText("");
    setTouched(false);
  }, []);

  const suggestion = useMemo(() => suggestCounts(playerCount), [playerCount]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ma-mode" style={{ fontWeight: "normal" }}>
            <input
              id="ma-mode"
              type="checkbox"
              checked={useNames}
              onChange={(e) => setUseNames(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Enter player names instead of a number
          </label>
        </div>

        {useNames ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="ma-names">
              Players (one name per line)
            </label>
            <textarea
              id="ma-names"
              className="tool-textarea"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder={"Alice\nBob\nCharlie\nDana\nEli\nFrankie\nGita\nHugo"}
              rows={8}
            />
          </div>
        ) : (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ma-count">
                Number of players
              </label>
              <input
                id="ma-count"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                step={1}
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
                placeholder="8"
              />
            </div>
          </div>
        )}

        <div className="tool-field">
          <label className="tool-label">Role counts</label>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ma-mafia" style={{ fontWeight: "normal" }}>
                Mafia
              </label>
              <input
                id="ma-mafia"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={mafiaText}
                onChange={(e) => {
                  setMafiaText(e.target.value);
                  setTouched(true);
                }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ma-det" style={{ fontWeight: "normal" }}>
                Detective
              </label>
              <input
                id="ma-det"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={detectiveText}
                onChange={(e) => {
                  setDetectiveText(e.target.value);
                  setTouched(true);
                }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ma-doc" style={{ fontWeight: "normal" }}>
                Doctor
              </label>
              <input
                id="ma-doc"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={doctorText}
                onChange={(e) => {
                  setDoctorText(e.target.value);
                  setTouched(true);
                }}
              />
            </div>
          </div>
          {playerCount >= MIN_PLAYERS ? (
            <p className="tool-note">
              Everyone else is a Villager
              {villagers >= 0 ? ` (${villagers} ${villagers === 1 ? "Villager" : "Villagers"})` : ""}.{" "}
              Suggested for {playerCount} players: {suggestion.mafia} Mafia,{" "}
              {suggestion.detective} Detective, {suggestion.doctor} Doctor.{" "}
              <button
                type="button"
                onClick={applySuggestion}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                Use suggested
              </button>
            </p>
          ) : null}
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={assign}
          disabled={!canAssign}
        >
          {assignments.length > 0 ? "Re-assign roles" : "Assign roles"}
        </button>
        {assignments.length > 0 ? (
          <button className="btn" type="button" onClick={hideAll}>
            Hide all roles
          </button>
        ) : null}
        <button
          className="btn"
          type="button"
          onClick={clearAll}
          disabled={assignments.length === 0 && namesText === "" && !touched}
        >
          Clear
        </button>
      </div>

      {error ? (
        <p className="tool-error" role="alert">
          {error}
        </p>
      ) : playerCount === 0 ? (
        <p className="tool-note">
          {useNames
            ? "Add your players above — one name per line."
            : "Choose how many people are playing."}{" "}
          Then set the role counts and press &ldquo;Assign roles&rdquo;.
        </p>
      ) : assignments.length === 0 ? (
        <p className="tool-note">
          {playerCount} {playerCount === 1 ? "player" : "players"} ready. Press
          &ldquo;Assign roles&rdquo; to deal out secret roles.
        </p>
      ) : null}

      {assignments.length > 0 ? (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">
              Pass the device around — each player taps their name to reveal, then
              taps again to hide before passing on
            </p>
            <div
              className="tool-result-value"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "0.6rem",
                marginTop: "0.5rem",
              }}
            >
              {assignments.map((a, i) => {
                const open = !!revealed[i];
                const meta = ROLE_META[a.role] || ROLE_META.Villager;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleReveal(i)}
                    aria-pressed={open}
                    style={{
                      textAlign: "center",
                      padding: "0.9rem 0.6rem",
                      borderRadius: "0.6rem",
                      border: "1px solid rgba(128,128,128,0.35)",
                      background: open ? "rgba(99,102,241,0.12)" : "transparent",
                      cursor: "pointer",
                      font: "inherit",
                      minHeight: "5.5rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, wordBreak: "break-word" }}>
                      {a.name}
                    </span>
                    {open ? (
                      <>
                        <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>
                          {meta.emoji}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                          {a.role}
                        </span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.75, lineHeight: 1.3 }}>
                          {meta.blurb}
                        </span>
                        <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                          Tap to hide
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                        Tap to reveal
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{mafia}</div>
              <div className="tool-stat-label">Mafia</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{detective}</div>
              <div className="tool-stat-label">Detective</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{doctor}</div>
              <div className="tool-stat-label">Doctor</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{Math.max(0, villagers)}</div>
              <div className="tool-stat-label">Villagers</div>
            </div>
          </div>
        </>
      ) : null}

      <p className="tool-note">
        Roles are shuffled with your browser&apos;s cryptographic random
        generator and shown only when a card is tapped — nothing is uploaded or
        saved. Have a narrator who is not playing? They can peek at each card
        before dealing, then run the night phases.
      </p>
    </div>
  );
}
