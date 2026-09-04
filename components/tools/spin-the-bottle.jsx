"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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

// Fisher-Yates shuffle built on randInt (kept for completeness/consistency).
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// Compass-style direction from an angle in degrees (0 = up/pointing north).
const DIRECTIONS = [
  "North",
  "North-East",
  "East",
  "South-East",
  "South",
  "South-West",
  "West",
  "North-West",
];

function directionForAngle(deg) {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return DIRECTIONS[idx];
}

export default function SpinTheBottle() {
  const [text, setText] = useState("");
  const [angle, setAngle] = useState(0); // absolute rotation, keeps growing
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // { name, direction } | null
  const [spins, setSpins] = useState(0);
  const timerRef = useRef(null);

  // Non-blank, trimmed names arranged around the circle.
  const names = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [text]);

  const spin = useCallback(() => {
    if (spinning) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setSpinning(true);
    setResult(null);

    // 4–7 full turns plus a random final offset in [0, 360).
    const turns = 4 + randInt(4);
    const offset = randInt(360);
    const delta = turns * 360 + offset;
    const finalAngle = angle + delta;
    setAngle(finalAngle);
    setSpins((n) => n + 1);

    // The pointer aims "up" (north). The bottle image points up at 0deg, so the
    // tip lands at -finalAngle relative to the ring of names.
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      const pointing = ((-finalAngle % 360) + 360) % 360;
      const direction = directionForAngle(pointing);
      if (names.length > 0) {
        // Which name sits closest to the top after the spin.
        const slice = 360 / names.length;
        const idx = Math.round(pointing / slice) % names.length;
        setResult({ name: names[idx], direction });
      } else {
        setResult({ name: null, direction });
      }
    }, 4200);
  }, [spinning, angle, names]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSpinning(false);
    setResult(null);
    setAngle(0);
    setSpins(0);
  }, []);

  const size = 300;
  const radius = size / 2;
  const nameRadius = radius - 34;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="stb-names">
            Player names (optional — one per line)
          </label>
          <textarea
            id="stb-names"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Alex\nJordan\nSam\nTaylor\nJamie\n…"}
            rows={6}
          />
          <p className="tool-note">
            Add names and the bottle announces who it lands on. Leave it empty to
            just spin and point a direction.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          margin: "1rem 0 0.5rem",
        }}
      >
        <div
          style={{
            position: "relative",
            width: size,
            height: size,
            maxWidth: "100%",
          }}
        >
          {/* Outer ring + optional names */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "6px solid var(--tool-accent, #4f46e5)",
              background:
                "radial-gradient(circle at 50% 45%, rgba(79,70,229,0.10), rgba(79,70,229,0.02))",
              boxSizing: "border-box",
            }}
          />
          {names.map((name, i) => {
            const a = (360 / names.length) * i;
            const rad = (a - 90) * (Math.PI / 180);
            const x = radius + nameRadius * Math.cos(rad);
            const y = radius + nameRadius * Math.sin(rad);
            const isHit =
              result && result.name != null && result.name === name;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                  fontSize: "0.8rem",
                  fontWeight: isHit ? 700 : 500,
                  color: isHit
                    ? "var(--tool-accent, #4f46e5)"
                    : "var(--tool-text, #333)",
                  maxWidth: 76,
                  textAlign: "center",
                  wordBreak: "break-word",
                  lineHeight: 1.15,
                  padding: "1px 3px",
                  borderRadius: 6,
                  background: isHit
                    ? "rgba(79,70,229,0.14)"
                    : "transparent",
                }}
              >
                {name}
              </div>
            );
          })}

          {/* The bottle — points up at 0deg, rotates on spin */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${angle}deg)`,
              transition: spinning
                ? "transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : "none",
            }}
          >
            <svg
              width={size * 0.7}
              height={size * 0.7}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              {/* neck/tip points to top */}
              <g fill="var(--tool-accent, #4f46e5)">
                <rect x="45" y="8" width="10" height="20" rx="3" />
                <path d="M42 26 Q50 22 58 26 L60 44 Q50 40 40 44 Z" />
                <rect
                  x="36"
                  y="42"
                  width="28"
                  height="46"
                  rx="12"
                />
                <circle cx="50" cy="6" r="4" />
              </g>
              <rect
                x="40"
                y="52"
                width="20"
                height="10"
                rx="3"
                fill="rgba(255,255,255,0.55)"
              />
            </svg>
          </div>

          {/* Fixed pointer marker at the top */}
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "16px solid var(--tool-accent, #4f46e5)",
            }}
          />

          {/* Center hub */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--tool-accent, #4f46e5)",
              border: "3px solid #fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={spin}
          disabled={spinning}
        >
          {spinning ? "Spinning…" : "Spin the bottle"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={reset}
          disabled={spinning || (spins === 0 && result === null)}
        >
          Reset
        </button>
      </div>

      {result ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">
            {result.name != null ? "The bottle points to" : "The bottle points"}
          </p>
          <div
            className="tool-result-value"
            style={{ wordBreak: "break-word", lineHeight: 1.35 }}
          >
            {result.name != null ? result.name : result.direction}
          </div>
          {result.name != null ? (
            <p className="tool-note" style={{ marginBottom: 0 }}>
              Facing {result.direction}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="tool-note" aria-live="polite">
          {spinning
            ? "Round and round it goes…"
            : "Press “Spin the bottle” to give it a whirl."}
        </p>
      )}

      {spins > 0 ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{spins.toLocaleString("en-US")}</div>
            <div className="tool-stat-label">
              {spins === 1 ? "Spin" : "Spins"}
            </div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {names.length.toLocaleString("en-US")}
            </div>
            <div className="tool-stat-label">
              {names.length === 1 ? "Player" : "Players"}
            </div>
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        Every spin uses your browser’s built-in cryptographic random generator
        (crypto.getRandomValues) so the landing spot is genuinely unpredictable.
        Everything runs locally on your device — nothing is uploaded.
      </p>
    </div>
  );
}
