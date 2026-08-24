"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Pip positions on a 3x3 grid (col, row), 0-indexed.
const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

function Die({ value }) {
  const cells = [0, 1, 2];
  const on = new Set((PIPS[value] || []).map(([c, r]) => `${c},${r}`));
  return (
    <svg viewBox="0 0 60 60" width="74" height="74" className="die" role="img" aria-label={`Die showing ${value}`}>
      <rect x="2" y="2" width="56" height="56" rx="12" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
      {cells.map((r) => cells.map((c) => (on.has(`${c},${r}`) ? (
        <circle key={`${c},${r}`} cx={14 + c * 16} cy={14 + r * 16} r="5.5" fill="var(--text)" />
      ) : null)))}
    </svg>
  );
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);

export default function DiceRoll() {
  const [count, setCount] = useState(2);
  const [values, setValues] = useState([1, 1]);
  const [rolled, setRolled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [reduce, setReduce] = useState(false);
  const anim = useRef(null);
  const stop = useRef(null);

  useEffect(() => () => { if (anim.current) clearInterval(anim.current); if (stop.current) clearTimeout(stop.current); }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);

  // Keep the dice array length in sync with the chosen count.
  useEffect(() => { setValues((v) => Array.from({ length: count }, (_, i) => v[i] || 1)); }, [count]);

  const roll = useCallback(() => {
    if (rolling) return;
    const finalVals = Array.from({ length: count }, rollDie);
    setRolled(true);
    if (reduce) { setValues(finalVals); return; }
    setRolling(true);
    if (anim.current) clearInterval(anim.current);
    anim.current = setInterval(() => setValues(Array.from({ length: count }, rollDie)), 80);
    if (stop.current) clearTimeout(stop.current);
    stop.current = setTimeout(() => {
      if (anim.current) clearInterval(anim.current);
      setValues(finalVals);
      setRolling(false);
    }, 650);
  }, [rolling, count, reduce]);

  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <span className="tool-label">Number of dice</span>
          <div className="seg-toggle" role="group" aria-label="Number of dice">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" className={`seg-btn ${count === n ? "is-active" : ""}`} aria-pressed={count === n} onClick={() => setCount(n)} disabled={rolling}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={`dice-stage ${rolling ? "is-rolling" : ""}`}>
        {values.map((v, i) => <Die key={i} value={v} />)}
      </div>

      <div className="sr-only" role="status" aria-live="polite">{rolling ? "Rolling" : rolled ? `Rolled ${values.join(", ")}${count > 1 ? `, total ${total}` : ""}` : ""}</div>

      <div className="tool-actions" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-primary" onClick={roll} disabled={rolling}>{rolling ? "Rolling…" : rolled ? "Roll again" : "Roll dice"}</button>
      </div>

      {rolled && count > 1 && !rolling && (
        <p className="tool-result-value" style={{ textAlign: "center", fontSize: 26, fontWeight: 800 }}>Total: {total}</p>
      )}

      <p className="tool-note">
        Roll one, two or three fair six-sided dice — perfect for board games when the dice have gone missing. Free, no
        sign-up, and it runs entirely in your browser.
      </p>
    </div>
  );
}
