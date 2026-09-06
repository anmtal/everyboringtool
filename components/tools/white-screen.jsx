"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Full-screen solid-colour screen. Uses the Fullscreen API where available and
// falls back to a fixed, viewport-covering overlay (iOS Safari, embedded views)
// so it always fills the screen. Everything runs locally — nothing is uploaded.
const COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ff0000" },
  { name: "Green", value: "#00ff00" },
  { name: "Blue", value: "#0000ff" },
  { name: "Cyan", value: "#00ffff" },
  { name: "Magenta", value: "#ff00ff" },
  { name: "Yellow", value: "#ffff00" },
  { name: "Gray 50%", value: "#808080" },
];

export default function WhiteScreen() {
  const [color, setColor] = useState("#ffffff");
  const [nativeFs, setNativeFs] = useState(false);
  const [faux, setFaux] = useState(false); // fallback overlay when the Fullscreen API is unavailable
  const [hint, setHint] = useState(true);
  const screenRef = useRef(null);
  const hintTimer = useRef(null);

  const active = nativeFs || faux;

  useEffect(() => {
    const onChange = () =>
      setNativeFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const showHint = useCallback(() => {
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 2600);
  }, []);

  useEffect(() => {
    if (active) showHint();
    else clearTimeout(hintTimer.current);
  }, [active, showHint]);

  const enter = useCallback(() => {
    const el = screenRef.current;
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && p.catch) p.catch(() => setFaux(true));
      } catch (e) {
        setFaux(true);
      }
    } else {
      setFaux(true); // iOS Safari etc.
    }
  }, []);

  const exit = useCallback(() => {
    if (faux) setFaux(false);
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try {
        ex.call(document);
      } catch (e) {}
    }
  }, [faux]);

  const step = useCallback(
    (dir) => {
      setColor((c) => {
        const i = COLORS.findIndex((x) => x.value === c);
        if (i === -1) return COLORS[0].value; // was a custom colour
        return COLORS[(i + dir + COLORS.length) % COLORS.length].value;
      });
      showHint();
    },
    [showHint]
  );

  // Keyboard while active: Space / arrows cycle, Esc exits (Esc also exits native FS natively).
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (faux) setFaux(false);
      } else if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, faux, step]);

  const label = (COLORS.find((c) => c.value === color) || {}).name || color;

  return (
    <div className="tool">
      <div
        ref={screenRef}
        onClick={active ? () => step(1) : undefined}
        onMouseMove={active ? showHint : undefined}
        style={{
          background: color,
          width: active ? "100vw" : "100%",
          height: active ? "100dvh" : "min(52vw, 340px)",
          borderRadius: active ? 0 : "var(--r)",
          border: active ? "none" : "1px solid var(--border)",
          cursor: active ? "none" : "default",
          position: active ? "fixed" : "relative",
          inset: active ? 0 : "auto",
          zIndex: active ? 2147483000 : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 120ms ease-out",
        }}
      >
        {active && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                exit();
              }}
              aria-label="Exit full screen"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                opacity: hint ? 1 : 0,
                transition: "opacity 300ms ease-out",
                pointerEvents: hint ? "auto" : "none",
              }}
            >
              ✕ Exit
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 30,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 16px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                opacity: hint ? 1 : 0,
                transition: "opacity 300ms ease-out",
              }}
            >
              {label} · Tap or Space to change · Esc to exit
            </div>
          </>
        )}
        {!active && (
          <button className="btn btn-primary" type="button" onClick={enter}>
            ⛶ Go full screen
          </button>
        )}
      </div>

      {!active && (
        <>
          <div className="tool-field" style={{ marginTop: 14 }}>
            <label className="tool-label">Screen colour</label>
            <div className="chips">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="chip"
                  aria-pressed={color === c.value}
                  onClick={() => setColor(c.value)}
                  style={{
                    outline: color === c.value ? "2px solid var(--text)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: c.value,
                      border: "1px solid var(--border-strong)",
                      display: "inline-block",
                    }}
                  />
                  {c.name}
                </button>
              ))}
              <label className="chip" style={{ cursor: "pointer" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: color,
                    border: "1px solid var(--border-strong)",
                    display: "inline-block",
                  }}
                />
                Custom
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Pick a custom screen colour"
                  style={{ width: 0, height: 0, opacity: 0, position: "absolute", pointerEvents: "none" }}
                />
              </label>
            </div>
          </div>

          <p className="tool-note" style={{ marginTop: 12 }}>
            Pick a colour and press <strong>Go full screen</strong>. In full screen, tap (or press Space) to
            cycle colours and Esc to exit. Cycle white → black → red → green → blue to spot dead or stuck
            pixels, use a plain white screen to clean your monitor or as a soft fill light for video calls,
            and a black screen to check for backlight bleed.
          </p>
        </>
      )}
    </div>
  );
}
