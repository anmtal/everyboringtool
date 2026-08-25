"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const CX = 110, CY = 110, R = 100;
// Fills dark enough for white labels to read (~4.5:1+).
const PALETTE = ["#c0392b", "#2e7d55", "#2471a3", "#b9770e", "#7d3c98", "#16879e", "#a93226", "#1e8449", "#2e5fa3", "#ba4a00"];

function pt(r, aDeg) {
  const a = (aDeg - 90) * Math.PI / 180; // 0° = top, clockwise
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export default function WheelOfNames() {
  const [text, setText] = useState("");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [reduce, setReduce] = useState(false);
  const timer = useRef(null);
  const pending = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);

  const names = useMemo(() => text.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 60), [text]);
  const N = names.length;
  const SEG = N > 0 ? 360 / N : 360;

  const slices = useMemo(() => names.map((name, i) => {
    const a0 = i * SEG, a1 = (i + 1) * SEG, mid = a0 + SEG / 2;
    const [x0, y0] = pt(R, a0);
    const [x1, y1] = pt(R, a1);
    const large = SEG > 180 ? 1 : 0;
    const d = `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    const [lx, ly] = pt(R * 0.58, mid);
    const rot = mid > 180 ? mid + 90 : mid - 90; // keep labels upright & radial
    const label = name.length > 14 ? name.slice(0, 13) + "…" : name;
    return { d, lx, ly, rot, label, fill: PALETTE[i % PALETTE.length] };
  }), [names, SEG]);

  const fontSize = N > 20 ? 8 : N > 12 ? 10 : N > 7 ? 12 : 13;

  const spin = useCallback(() => {
    if (spinning || N < 2) return;
    setSpinning(true);
    setWinner(null);
    const idx = Math.floor(Math.random() * N);
    pending.current = names[idx];
    const targetMod = ((-(idx * SEG + SEG / 2)) % 360 + 360) % 360;
    const cur = ((rotation % 360) + 360) % 360;
    let delta = targetMod - cur;
    if (delta < 0) delta += 360;
    const spins = reduce ? 0 : 5;
    setRotation(rotation + spins * 360 + delta);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSpinning(false); setWinner(pending.current); }, reduce ? 30 : 4200);
  }, [spinning, N, names, SEG, rotation, reduce]);

  const removeWinner = () => {
    if (!winner) return;
    const i = names.indexOf(winner);
    if (i < 0) return;
    const next = names.slice();
    next.splice(i, 1);
    setText(next.join("\n"));
    setWinner(null);
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="won-names">Names or options (one per line)</label>
          <textarea id="won-names" className="tool-input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter one name per line" style={{ resize: "vertical" }} disabled={spinning} />
          <p className="tool-note" style={{ margin: "4px 0 0" }}>{N} entr{N === 1 ? "y" : "ies"}{N < 2 ? " — add at least 2 to spin" : ""}</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <svg viewBox="0 0 220 220" width="300" height="300" style={{ maxWidth: "100%", height: "auto", cursor: spinning || N < 2 ? "default" : "pointer" }} onClick={spin} role="img" aria-label={winner && !spinning ? `Winner: ${winner}` : "Wheel of names — click to spin"}>
          {N >= 2 ? (
            <>
              <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "110px 110px", transition: spinning && !reduce ? "transform 4s cubic-bezier(0.16,0.73,0.09,1)" : "none" }}>
                {slices.map((s, i) => (
                  <g key={i}>
                    <path d={s.d} fill={s.fill} stroke="#ffffff" strokeWidth="1" />
                    <text x={s.lx} y={s.ly} fill="#ffffff" fontSize={fontSize} fontWeight="700" textAnchor="middle" dominantBaseline="central" transform={`rotate(${s.rot} ${s.lx} ${s.ly})`}>{s.label}</text>
                  </g>
                ))}
                <circle cx="110" cy="110" r="16" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
              </g>
              <polygon points="110,28 94,2 126,2" fill="var(--text)" stroke="var(--surface)" strokeWidth="2" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <circle cx="110" cy="110" r="100" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2" />
              <text x="110" y="112" textAnchor="middle" dominantBaseline="central" fill="var(--muted)" fontSize="12">Add 2+ names</text>
            </>
          )}
        </svg>
      </div>

      <div className="sr-only" role="status" aria-live="polite">{spinning ? "Spinning the wheel" : winner ? `Winner: ${winner}` : ""}</div>

      {winner && !spinning && (
        <div className="tool-result" style={{ textAlign: "center" }}>
          <p className="tool-result-label">Winner</p>
          <p className="tool-result-value" style={{ fontSize: 32, fontWeight: 800 }}>{winner}</p>
        </div>
      )}

      <div className="tool-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={spin} disabled={spinning || N < 2}>
          {spinning ? "Spinning…" : winner ? "Spin again" : "Spin the wheel"}
        </button>
        {winner && !spinning && (
          <button type="button" className="btn" onClick={removeWinner}>Remove “{winner.length > 18 ? winner.slice(0, 17) + "…" : winner}”</button>
        )}
      </div>

      <p className="tool-note">
        Enter any list of names or options, spin, and let the wheel pick a fair random winner — great for raffles,
        deciding who goes first, or choosing where to eat. Remove the winner to draw again without them. Free, and it
        runs entirely in your browser.
      </p>
    </div>
  );
}
