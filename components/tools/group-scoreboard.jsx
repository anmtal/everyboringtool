"use client";

import { useCallback, useMemo, useState } from "react";

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty. Included per house
// convention; used to generate collision-resistant row ids.
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

// Fisher-Yates shuffle built on randInt. Returns a new array. Kept per house
// convention for fair tie handling if ever needed.
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function newId() {
  return `p_${Date.now().toString(36)}_${randInt(1000000).toString(36)}`;
}

export default function GroupScoreboard() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const addPlayer = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Enter a name to add a player or team.");
      return;
    }
    const clash = players.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (clash) {
      setError(`“${trimmed}” is already on the board.`);
      return;
    }
    setPlayers((prev) => [
      ...prev,
      { id: newId(), name: trimmed, score: 0 },
    ]);
    setName("");
    setError("");
  }, [name, players]);

  const adjust = useCallback((id, delta) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, score: p.score + delta } : p))
    );
  }, []);

  const remove = useCallback((id) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const resetScores = useCallback(() => {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
  }, []);

  const clearAll = useCallback(() => {
    setPlayers([]);
    setError("");
  }, []);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPlayer();
      }
    },
    [addPlayer]
  );

  // Sort highest first; keep insertion order stable for ties by using the
  // original index as a tiebreaker.
  const ranked = useMemo(() => {
    return players
      .map((p, i) => ({ ...p, order: i }))
      .sort((a, b) => b.score - a.score || a.order - b.order);
  }, [players]);

  const leaderScore = ranked.length > 0 ? ranked[0].score : 0;
  const totalPoints = useMemo(
    () => players.reduce((sum, p) => sum + p.score, 0),
    [players]
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="gs-name">
            Add a player or team
          </label>
          <div className="tool-row">
            <input
              id="gs-name"
              className="tool-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. Team Red, Priya, The Aces…"
              maxLength={40}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={addPlayer}
              style={{ flex: "0 0 auto" }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="tool-error" role="alert">
          {error}
        </p>
      ) : null}

      {players.length === 0 ? (
        <p className="tool-note">
          Add players or teams above to start keeping score. Use the −1, +1 and
          +5 buttons on each row — the board re-sorts automatically so the leader
          is always on top.
        </p>
      ) : (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">Leaderboard</p>
            <ol
              style={{
                listStyle: "none",
                margin: "0.5rem 0 0",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {ranked.map((p, i) => {
                const isLeader =
                  players.length > 1 && p.score === leaderScore && p.score !== 0;
                return (
                  <li
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.6rem 0.75rem",
                      border: "1px solid currentColor",
                      borderRadius: "10px",
                      flexWrap: "wrap",
                      background: isLeader
                        ? "rgba(127,127,127,0.14)"
                        : "transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        minWidth: "2ch",
                        textAlign: "center",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        flex: "1 1 8rem",
                        fontWeight: 600,
                        wordBreak: "break-word",
                      }}
                    >
                      {isLeader ? `★ ${p.name}` : p.name}
                    </span>
                    <span
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        minWidth: "3ch",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.score}
                    </span>
                    <span style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => adjust(p.id, -1)}
                        aria-label={`Subtract 1 from ${p.name}`}
                      >
                        −1
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => adjust(p.id, 1)}
                        aria-label={`Add 1 to ${p.name}`}
                      >
                        +1
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => adjust(p.id, 5)}
                        aria-label={`Add 5 to ${p.name}`}
                      >
                        +5
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => remove(p.id)}
                        aria-label={`Remove ${p.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{players.length}</div>
              <div className="tool-stat-label">
                {players.length === 1 ? "Player" : "Players"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{leaderScore}</div>
              <div className="tool-stat-label">Top score</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{totalPoints}</div>
              <div className="tool-stat-label">Total points</div>
            </div>
          </div>

          <div className="tool-actions">
            <button className="btn" type="button" onClick={resetScores}>
              Reset scores
            </button>
            <button className="btn" type="button" onClick={clearAll}>
              Remove all
            </button>
          </div>
        </>
      )}

      <p className="tool-note">
        Scores are kept in this browser tab only, for the current session —
        nothing is saved or uploaded. Refreshing the page starts a fresh board.
      </p>
    </div>
  );
}
