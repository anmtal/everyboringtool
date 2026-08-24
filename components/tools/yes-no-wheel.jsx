"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const N = 8;
const SEG = 360 / N;
const CX = 110, CY = 110, R = 100;
const YES = "#2e9e6a", NO = "#d14b4b";

function pt(r, aDeg) {
  const a = (aDeg - 90) * Math.PI / 180; // 0° = top, clockwise
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

// Static slice geometry — only the wheel's rotation changes at runtime.
const SLICES = Array.from({ length: N }, (_, i) => {
  const a0 = i * SEG, a1 = (i + 1) * SEG;
  const [x0, y0] = pt(R, a0);
  const [x1, y1] = pt(R, a1);
  const [lx, ly] = pt(R * 0.6, (a0 + a1) / 2);
  return {
    d: `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
    lx, ly,
    label: i % 2 === 0 ? "YES" : "NO",
    fill: i % 2 === 0 ? YES : NO,
  };
});

export default function YesNoWheel() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [question, setQuestion] = useState("");
  const pending = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const spin = useCallback(() => {
    if (spinning) return;
    setResult(null);
    setSpinning(true);
    const idx = Math.floor(Math.random() * N);
    pending.current = idx % 2 === 0 ? "YES" : "NO";
    // Land segment idx's centre under the top pointer.
    const targetMod = ((-(idx * SEG + SEG / 2)) % 360 + 360) % 360;
    const current = ((rotation % 360) + 360) % 360;
    let delta = targetMod - current;
    if (delta < 0) delta += 360;
    setRotation(rotation + 360 * 5 + delta);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSpinning(false); setResult(pending.current); }, 4100);
  }, [spinning, rotation]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ynw-q">Your question (optional)</label>
          <input id="ynw-q" className="tool-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Should I order pizza tonight?" maxLength={120} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <svg
          viewBox="0 0 220 220"
          width="270"
          height="270"
          style={{ maxWidth: "100%", height: "auto", cursor: spinning ? "default" : "pointer" }}
          onClick={spin}
          role="img"
          aria-label={result && !spinning ? `Wheel landed on ${result}` : "Yes or No spinning wheel — click to spin"}
        >
          <polygon points="110,22 97,1 123,1" fill="var(--text)" />
          <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "110px 110px", transition: spinning ? "transform 4s cubic-bezier(0.16,0.73,0.09,1)" : "none" }}>
            {SLICES.map((s, i) => (
              <g key={i}>
                <path d={s.d} fill={s.fill} stroke="#ffffff" strokeWidth="1.5" />
                <text x={s.lx} y={s.ly} fill="#ffffff" fontSize="15" fontWeight="800" textAnchor="middle" dominantBaseline="central">{s.label}</text>
              </g>
            ))}
            <circle cx="110" cy="110" r="17" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
          </g>
        </svg>
      </div>

      <div className="tool-actions" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-primary" onClick={spin} disabled={spinning}>
          {spinning ? "Spinning…" : result ? "Spin again" : "Spin the wheel"}
        </button>
      </div>

      {result && !spinning && (
        <div className="tool-result" role="status" aria-live="polite" style={{ textAlign: "center" }}>
          {question.trim() && <p className="tool-result-label">{question.trim()}</p>}
          <p className="tool-result-value" style={{ fontSize: 36, fontWeight: 800, color: result === "YES" ? YES : NO }}>{result}</p>
        </div>
      )}

      <p className="tool-note">
        Can&apos;t decide? Hand it to the wheel. Give it a yes/no question, spin, and let chance settle it — the classic
        coin-flip, but more fun. Free, with no sign-up, and it runs entirely in your browser.
      </p>
    </div>
  );
}
