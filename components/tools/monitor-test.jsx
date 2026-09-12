"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// A monitor / display test suite. Every test launches into a full-screen surface
// (native Fullscreen API where available, with a fixed viewport-covering fallback
// for iOS Safari and embedded views). Everything runs locally — nothing is uploaded.
//
//  • Dead pixel test — cycle solid full-screen colours to spot dead/stuck pixels.
//  • Refresh rate    — median requestAnimationFrame frame delta → measured Hz.
//  • Gradient panel  — smooth gradients to reveal banding, tint and backlight bleed.
//  • Display info    — screen resolution, viewport, devicePixelRatio and colour depth.

const LS_KEY = "ebt-monitor-test";

// Dead-pixel cycle: solid primaries make a stuck sub-pixel obvious, white/black
// reveal dead pixels and dust, grey shows uniformity issues.
const COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ff0000" },
  { name: "Green", value: "#00ff00" },
  { name: "Blue", value: "#0000ff" },
  { name: "Cyan", value: "#00ffff" },
  { name: "Magenta", value: "#ff00ff" },
  { name: "Gray", value: "#808080" },
];

const GRADIENTS = [
  { name: "Grayscale — horizontal", css: "linear-gradient(90deg, #000, #fff)" },
  { name: "Grayscale — vertical", css: "linear-gradient(180deg, #000, #fff)" },
  { name: "RGB spectrum", css: "linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" },
  { name: "Radial uniformity", css: "radial-gradient(circle at 50% 50%, #fff, #000 78%)" },
  { name: "Warm ↔ cool tint", css: "linear-gradient(90deg, #ff8a3d, #ffffff, #3da5ff)" },
];

// Common panel refresh rates we snap a raw reading to when it lands close.
const COMMON_RATES = [24, 25, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240, 300, 360];

function nearestRate(fps) {
  if (!fps || !isFinite(fps)) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const r of COMMON_RATES) {
    const d = Math.abs(r - fps);
    if (d < bestDiff) { bestDiff = d; best = r; }
  }
  // Accept as a "known" rate when within ~4% or 2.5 Hz, whichever is larger.
  const tol = Math.max(2.5, best * 0.04);
  return bestDiff <= tol ? best : null;
}

function readInfo() {
  if (typeof window === "undefined") return null;
  const s = window.screen || {};
  const dpr = window.devicePixelRatio || 1;
  let orientation = "";
  try {
    orientation = (s.orientation && s.orientation.type) ||
      (window.matchMedia("(orientation: portrait)").matches ? "portrait-primary" : "landscape-primary");
  } catch (e) { /* ignore */ }
  return {
    screenW: s.width || 0,
    screenH: s.height || 0,
    availW: s.availWidth || 0,
    availH: s.availHeight || 0,
    viewportW: window.innerWidth || 0,
    viewportH: window.innerHeight || 0,
    dpr,
    physW: Math.round((s.width || 0) * dpr),
    physH: Math.round((s.height || 0) * dpr),
    colorDepth: s.colorDepth || 0,
    pixelDepth: s.pixelDepth || 0,
    orientation,
  };
}

const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : n);

export default function MonitorTest() {
  const [mode, setMode] = useState(null); // null | 'dead-pixel' | 'refresh' | 'gradient' | 'display-info'
  const [faux, setFaux] = useState(false); // fallback overlay when Fullscreen API is unavailable/blocked
  const [hint, setHint] = useState(true);

  const [colorIdx, setColorIdx] = useState(0);
  const [gradientIdx, setGradientIdx] = useState(0);

  const [info, setInfo] = useState(null);
  const [fps, setFps] = useState(null); // { value, min, max, samples }
  const [loaded, setLoaded] = useState(false);

  const screenRef = useRef(null);
  const hintTimer = useRef(null);
  const deltasRef = useRef([]);

  const active = mode !== null;

  // ---- persistence (where you left off in the cycles) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Number.isInteger(s.colorIdx) && s.colorIdx >= 0 && s.colorIdx < COLORS.length) setColorIdx(s.colorIdx);
        if (Number.isInteger(s.gradientIdx) && s.gradientIdx >= 0 && s.gradientIdx < GRADIENTS.length) setGradientIdx(s.gradientIdx);
      }
    } catch (e) { /* private mode / blocked storage */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ colorIdx, gradientIdx }));
    } catch (e) { /* ignore */ }
  }, [colorIdx, gradientIdx, loaded]);

  // ---- live display info (updates on resize, fullscreen change, and while dragging across monitors) ----
  useEffect(() => {
    const update = () => setInfo(readInfo());
    update();
    window.addEventListener("resize", update);
    const iv = setInterval(update, 1000); // catch devicePixelRatio changes between displays
    return () => {
      window.removeEventListener("resize", update);
      clearInterval(iv);
    };
  }, []);

  // ---- fullscreen wiring ----
  useEffect(() => {
    const onChange = () => {
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!fs) setMode(null); // native FS ended (Esc / F11 / OS gesture) → back to the menu
    };
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

  const enter = useCallback((m) => {
    setMode(m);
    const el = screenRef.current;
    if (!el) { setFaux(true); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && p.catch) p.catch(() => setFaux(true));
      } catch (e) {
        setFaux(true); // some browsers throw synchronously when blocked
      }
    } else {
      setFaux(true); // iOS Safari and similar have no element Fullscreen API
    }
  }, []);

  const exit = useCallback(() => {
    setMode(null);
    setFaux(false);
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try { ex.call(document); } catch (e) { /* ignore */ }
    }
  }, []);

  const cycle = useCallback((dir) => {
    if (mode === "dead-pixel") { setColorIdx((i) => (i + dir + COLORS.length) % COLORS.length); showHint(); }
    else if (mode === "gradient") { setGradientIdx((i) => (i + dir + GRADIENTS.length) % GRADIENTS.length); showHint(); }
  }, [mode, showHint]);

  // ---- refresh-rate measurement: median frame delta, decoupled from rendering ----
  useEffect(() => {
    if (mode !== "refresh") return;
    let raf = 0;
    let last = 0;
    deltasRef.current = [];
    const onFrame = (ts) => {
      if (last) {
        const d = ts - last;
        // Drop absurd deltas (tab was backgrounded, GC pause) so they don't skew the median.
        if (d > 0 && d < 100) {
          const arr = deltasRef.current;
          arr.push(d);
          if (arr.length > 600) arr.shift();
        }
      }
      last = ts;
      raf = requestAnimationFrame(onFrame);
    };
    raf = requestAnimationFrame(onFrame);

    const iv = setInterval(() => {
      const arr = deltasRef.current;
      if (!arr || arr.length < 6) return;
      const recent = arr.slice(-Math.min(arr.length, 240));
      const sorted = [...recent].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (!median) return;
      setFps({
        value: 1000 / median,
        min: 1000 / sorted[sorted.length - 1], // slowest frame → lowest instantaneous fps
        max: 1000 / sorted[0],                 // fastest frame → highest instantaneous fps
        samples: arr.length,
      });
    }, 200);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
      setFps(null);
    };
  }, [mode]);

  // ---- keyboard while a test is on screen ----
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (faux) exit(); // native FS handles Esc itself; the faux overlay needs this
        return;
      }
      if (mode === "dead-pixel" || mode === "gradient") {
        if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); cycle(1); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); cycle(-1); }
      } else if (mode === "refresh") {
        if (e.key === " ") { e.preventDefault(); deltasRef.current = []; setFps(null); showHint(); } // restart measurement
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, faux, mode, cycle, exit, showHint]);

  // ---- final cleanup ----
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const onSurfaceClick = () => {
    if (mode === "dead-pixel" || mode === "gradient") cycle(1);
  };

  const surfaceBg =
    mode === "dead-pixel" ? COLORS[colorIdx].value
      : mode === "gradient" ? GRADIENTS[gradientIdx].css
        : "#0b0d12";

  const canAdvance = mode === "dead-pixel" || mode === "gradient";
  const measured = fps ? Math.round(fps.value) : null;
  const snapped = fps ? nearestRate(fps.value) : null;

  const TESTS = [
    { id: "dead-pixel", icon: "▦", title: "Dead Pixel Test", desc: "Cycle solid full-screen colours (white, black, red, green, blue, cyan, magenta, grey) to spot dead or stuck pixels.", cta: "Start dead pixel test" },
    { id: "refresh", icon: "⟳", title: "Refresh Rate Test", desc: "Measure your display's real refresh rate in Hz by averaging animation frame timings — 60, 120, 144 and beyond.", cta: "Measure refresh rate" },
    { id: "gradient", icon: "▧", title: "Gradient & Uniformity", desc: "Smooth gradients that reveal colour banding, tinting and backlight bleed across the panel.", cta: "Open gradient panel" },
    { id: "display-info", icon: "▣", title: "Display Info", desc: "Full-screen readout of screen resolution, viewport size, device pixel ratio and colour depth.", cta: "Show display info" },
  ];

  return (
    <div className="tool mt">
      <style>{`
        .mt .mt-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
        .mt .mt-card{display:flex;flex-direction:column;gap:8px;text-align:left;padding:16px;
          background:var(--surface);border:1px solid var(--border);border-radius:var(--r);cursor:pointer;
          transition:border-color 140ms ease-out, transform 120ms ease-out, box-shadow 140ms ease-out;}
        .mt .mt-card:hover{border-color:var(--text);box-shadow:var(--shadow-sm);}
        .mt .mt-card:active{transform:scale(.99);}
        .mt .mt-card:focus-within{border-color:var(--text);}
        .mt .mt-card-top{display:flex;align-items:center;gap:10px;}
        .mt .mt-card-icon{width:34px;height:34px;flex:none;display:inline-flex;align-items:center;justify-content:center;
          border-radius:9px;background:var(--surface-2);border:1px solid var(--border);font-size:18px;line-height:1;}
        .mt .mt-card-title{font-size:15px;font-weight:640;letter-spacing:-.01em;}
        .mt .mt-card-desc{font-size:13px;color:var(--muted);margin:0;line-height:1.45;flex:1;}
        .mt .mt-card .btn{width:100%;justify-content:center;}

        .mt .mt-surface{color:#fff;}
        .mt .mt-overlay{position:absolute;background:rgba(0,0,0,.6);color:#fff;border-radius:999px;
          font-weight:600;letter-spacing:.01em;white-space:nowrap;backdrop-filter:blur(2px);}
        .mt .mt-exit{top:16px;right:16px;padding:8px 15px;border:none;font-size:14px;cursor:pointer;z-index:3;}
        .mt .mt-hintbar{bottom:26px;left:50%;transform:translateX(-50%);padding:10px 16px;font-size:14px;
          font-weight:500;pointer-events:none;max-width:92vw;overflow:hidden;text-overflow:ellipsis;}
        .mt .mt-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:6px;text-align:center;padding:24px;pointer-events:none;}
        .mt .mt-big{font-size:clamp(56px,18vw,190px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums;
          letter-spacing:-.02em;}
        .mt .mt-unit{font-size:.34em;font-weight:600;opacity:.72;margin-left:.15em;vertical-align:baseline;}
        .mt .mt-sub{font-size:clamp(15px,3.6vw,22px);font-weight:600;opacity:.85;}
        .mt .mt-mini{font-size:14px;opacity:.6;font-variant-numeric:tabular-nums;}
        .mt .mt-info{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;
          width:min(720px,90vw);pointer-events:none;}
        .mt .mt-info-cell{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
          border-radius:12px;padding:14px 16px;text-align:left;}
        .mt .mt-info-num{font-size:clamp(20px,4.4vw,30px);font-weight:720;font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
        .mt .mt-info-lab{font-size:12px;text-transform:uppercase;letter-spacing:.05em;opacity:.6;margin-top:3px;}
        .mt .mt-sweep{position:absolute;top:0;bottom:0;left:0;width:14px;background:#fff;mix-blend-mode:difference;
          animation:mtSweep 2.1s linear infinite;will-change:transform;}
        @keyframes mtSweep{from{transform:translateX(0);}to{transform:translateX(calc(100vw - 14px));}}
        @media (prefers-reduced-motion: reduce){ .mt .mt-sweep{animation:none;display:none;} }
      `}</style>

      {/* Full-screen target — always mounted so requestFullscreen has an element to grab.
          Collapsed to nothing when inactive; fixed and viewport-filling when a test is on. */}
      <div
        ref={screenRef}
        className="mt-surface"
        onClick={active ? onSurfaceClick : undefined}
        onMouseMove={active ? showHint : undefined}
        aria-hidden={active ? undefined : true}
        style={
          active
            ? {
                position: "fixed", inset: 0, width: "100vw", height: "100dvh",
                background: surfaceBg, zIndex: 2147483000,
                cursor: canAdvance ? "pointer" : "default",
                overflow: "hidden",
              }
            : { height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }
        }
      >
        {active && (
          <>
            <button
              type="button"
              className="mt-overlay mt-exit"
              onClick={(e) => { e.stopPropagation(); exit(); }}
              style={{ opacity: hint ? 1 : 0.12, transition: "opacity 300ms ease-out" }}
              aria-label="Exit test"
            >
              &#10005; Exit
            </button>

            {mode === "refresh" && (
              <>
                <div className="mt-sweep" aria-hidden="true" />
                <div className="mt-center">
                  <div className="mt-big">
                    {measured != null ? fmt(measured) : "…"}<span className="mt-unit">Hz</span>
                  </div>
                  <div className="mt-sub">
                    {fps
                      ? snapped
                        ? `Looks like a ${snapped} Hz display`
                        : "Measuring refresh rate…"
                      : "Warming up…"}
                  </div>
                  {fps && (
                    <div className="mt-mini">
                      range {fmt(Math.round(fps.min))}–{fmt(Math.round(fps.max))} Hz &middot; {fmt(fps.samples)} frames
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === "display-info" && info && (
              <div className="mt-center">
                <div className="mt-info">
                  <div className="mt-info-cell">
                    <div className="mt-info-num">{fmt(info.screenW)} &times; {fmt(info.screenH)}</div>
                    <div className="mt-info-lab">Screen resolution (CSS px)</div>
                  </div>
                  <div className="mt-info-cell">
                    <div className="mt-info-num">{fmt(info.physW)} &times; {fmt(info.physH)}</div>
                    <div className="mt-info-lab">Native resolution (device px)</div>
                  </div>
                  <div className="mt-info-cell">
                    <div className="mt-info-num">{fmt(info.viewportW)} &times; {fmt(info.viewportH)}</div>
                    <div className="mt-info-lab">This viewport</div>
                  </div>
                  <div className="mt-info-cell">
                    <div className="mt-info-num">{info.dpr.toFixed(2)}&times;</div>
                    <div className="mt-info-lab">Device pixel ratio</div>
                  </div>
                  <div className="mt-info-cell">
                    <div className="mt-info-num">{fmt(info.colorDepth)}-bit</div>
                    <div className="mt-info-lab">Colour depth</div>
                  </div>
                  <div className="mt-info-cell">
                    <div className="mt-info-num" style={{ textTransform: "capitalize" }}>
                      {(info.orientation || "—").replace("-primary", "").replace("-secondary", "")}
                    </div>
                    <div className="mt-info-lab">Orientation</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-overlay mt-hintbar" style={{ opacity: hint ? 1 : 0, transition: "opacity 300ms ease-out" }}>
              {mode === "dead-pixel" && `${COLORS[colorIdx].name} · tap or arrows to change colour · Esc to exit`}
              {mode === "gradient" && `${GRADIENTS[gradientIdx].name} · tap or arrows to change · Esc to exit`}
              {mode === "refresh" && "Keep this tab focused for an accurate reading · Space restarts · Esc to exit"}
              {mode === "display-info" && "Values update live · Esc to exit"}
            </div>
          </>
        )}
      </div>

      {/* Menu (hidden while a test is full-screen) */}
      {!active && (
        <>
          <div className="mt-cards">
            {TESTS.map((t) => (
              <div
                key={t.id}
                className="mt-card"
                role="button"
                tabIndex={-1}
                onClick={() => enter(t.id)}
              >
                <div className="mt-card-top">
                  <span className="mt-card-icon" aria-hidden="true">{t.icon}</span>
                  <span className="mt-card-title">{t.title}</span>
                </div>
                <p className="mt-card-desc">{t.desc}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => { e.stopPropagation(); enter(t.id); }}
                >
                  {t.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 18 }}>
            <div className="tool-stat">
              <div className="tool-stat-num">{info ? `${fmt(info.screenW)}×${fmt(info.screenH)}` : "—"}</div>
              <div className="tool-stat-label">Screen resolution</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{info ? `${fmt(info.viewportW)}×${fmt(info.viewportH)}` : "—"}</div>
              <div className="tool-stat-label">Viewport size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{info ? `${info.dpr.toFixed(2)}×` : "—"}</div>
              <div className="tool-stat-label">Pixel ratio</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{info ? `${fmt(info.colorDepth)}-bit` : "—"}</div>
              <div className="tool-stat-label">Colour depth</div>
            </div>
          </div>

          <p className="tool-note" style={{ marginTop: 14 }}>
            Pick a test and it opens full screen. In the dead pixel and gradient tests, tap the screen (or press the
            arrow keys) to change what is shown; press <strong>Esc</strong> to come back. For the most accurate refresh
            rate, run the test on the monitor you want to check and keep this browser tab in focus. Everything runs in
            your browser — nothing is recorded or uploaded.
          </p>
        </>
      )}
    </div>
  );
}
