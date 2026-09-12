"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// 100% client-side gamepad / controller tester. The Gamepad API hands back a fresh
// read-only snapshot on every navigator.getGamepads() call, so we poll it inside a
// requestAnimationFrame loop and copy the primitive button/axis values into React
// state each frame. We also listen for gamepadconnected / gamepaddisconnected to
// surface controllers the moment the browser reports them. Nothing is uploaded —
// only the button-label style is remembered in this browser.

const LS_KEY = "ebt-gamepad-tester";

// Standard-mapping labels (https://w3c.github.io/gamepad/#remapping). Index order is
// identical across Xbox / PlayStation / generic controllers when mapping === "standard".
const STD_LABELS = {
  xbox: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "View", "Menu", "LS", "RS", "Up", "Down", "Left", "Right", "Xbox"],
  ps: ["Cross", "Circle", "Square", "Triangle", "L1", "R1", "L2", "R2", "Share", "Options", "L3", "R3", "Up", "Down", "Left", "Right", "PS"],
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fmt = (n) => (n < 0 ? "" : " ") + Number(n || 0).toFixed(2);

const stdLabel = (i, style) => {
  const arr = STD_LABELS[style];
  return arr && arr[i] != null ? arr[i] : "B" + i;
};

const noBtn = { pressed: false, touched: false, value: 0 };

function readPads() {
  const raw =
    typeof navigator !== "undefined" && navigator.getGamepads
      ? navigator.getGamepads()
      : [];
  const list = [];
  for (const gp of raw) {
    if (!gp || !gp.connected) continue;
    const act = gp.vibrationActuator;
    list.push({
      index: gp.index,
      id: gp.id || "Unknown controller",
      mapping: gp.mapping || "",
      axes: Array.from(gp.axes || []),
      buttons: Array.from(gp.buttons || []).map((b) => ({
        pressed: !!b.pressed,
        touched: !!b.touched,
        value: typeof b.value === "number" ? b.value : b.pressed ? 1 : 0,
      })),
      hasRumble: !!(act && (act.playEffect || act.pulse)),
    });
  }
  list.sort((a, b) => a.index - b.index);
  return list;
}

// ---- small presentational pieces (memo-free; parent re-renders each frame) ----
function Stick({ label, x, y, pressed }) {
  const cx = 50 + clamp(x, -1, 1) * 42;
  const cy = 50 + clamp(y, -1, 1) * 42;
  return (
    <div className="gpt-stick">
      <div className={"gpt-well" + (pressed ? " is-press" : "")} aria-hidden="true">
        <span className="gpt-cross gpt-cross-h" />
        <span className="gpt-cross gpt-cross-v" />
        <span className="gpt-deadzone" />
        <span className="gpt-dot" style={{ left: cx + "%", top: cy + "%" }} />
      </div>
      <div className="gpt-stick-meta">
        <b>{label}{pressed ? " • press" : ""}</b>
        <span>X {fmt(x)}</span>
        <span>Y {fmt(y)}</span>
      </div>
    </div>
  );
}

function Trigger({ label, btn }) {
  const value = btn.value || (btn.pressed ? 1 : 0);
  const pct = Math.round(clamp(value, 0, 1) * 100);
  const lit = btn.pressed || value > 0.06;
  return (
    <div className={"gpt-trig" + (lit ? " is-lit" : "")}>
      <div className="gpt-trig-track" aria-hidden="true"><i style={{ height: pct + "%" }} /></div>
      <div className="gpt-trig-meta"><b>{label}</b><span>{fmt(value)}</span></div>
    </div>
  );
}

function Pad({ pad, style, onRumble }) {
  const isStd = pad.mapping === "standard";
  const b = (i) => pad.buttons[i] || noBtn;
  const lit = (btn) => btn.pressed || btn.value > 0.12;
  const face = (i, forceLabel) => {
    const btn = b(i);
    const label = forceLabel != null ? forceLabel : isStd ? stdLabel(i, style) : "B" + i;
    return (
      <div className={"gpt-face" + (lit(btn) ? " is-lit" : "")} title={"Button " + i} key={"f" + i}>
        <span>{label}</span>
      </div>
    );
  };

  const pressedNow = pad.buttons.reduce((n, x) => n + (x.pressed ? 1 : 0), 0);
  const ax = pad.axes;

  return (
    <div className="gpt-panel">
      <div className="gpt-head">
        <div className="gpt-title">
          <span className="gpt-glyph" aria-hidden="true">🎮</span>
          <span className="gpt-name" title={pad.id}>{pad.id}</span>
        </div>
        <div className="gpt-badges">
          <span className="gpt-badge">#{pad.index}</span>
          <span className={"gpt-badge " + (isStd ? "ok" : "warn")}>
            {isStd ? "standard mapping" : "non-standard"}
          </span>
          <button
            type="button"
            className="btn gpt-rumble"
            onClick={() => onRumble(pad.index)}
            disabled={!pad.hasRumble}
            title={pad.hasRumble ? "Vibrate this controller" : "No vibration on this controller / browser"}
          >
            Rumble
          </button>
        </div>
      </div>

      {isStd ? (
        <div className="gpt-diagram">
          <div className="gpt-col">
            <div className="gpt-shoulders">{face(4)}{face(5)}</div>
            <div className="gpt-dpad">
              <div className="gpt-dpad-grid">
                <span style={{ gridArea: "u" }}>{face(12, "▲")}</span>
                <span style={{ gridArea: "l" }}>{face(14, "◀")}</span>
                <span style={{ gridArea: "r" }}>{face(15, "▶")}</span>
                <span style={{ gridArea: "d" }}>{face(13, "▼")}</span>
              </div>
              <div className="gpt-cap">D-pad</div>
            </div>
          </div>

          <div className="gpt-col gpt-col-center">
            <div className="gpt-triggers">
              <Trigger label={isStd ? stdLabel(6, style === "ps" ? "ps" : "xbox") : "LT"} btn={b(6)} />
              <Trigger label={isStd ? stdLabel(7, style === "ps" ? "ps" : "xbox") : "RT"} btn={b(7)} />
            </div>
            <div className="gpt-center-btns">
              {face(8)}
              {pad.buttons.length > 16 ? face(16) : null}
              {face(9)}
            </div>
          </div>

          <div className="gpt-col">
            <div className="gpt-shoulders gpt-shoulders-right"><span className="gpt-cap-inline">face</span></div>
            <div className="gpt-diamond" aria-hidden={false}>
              <span className="gpt-d-top">{face(3)}</span>
              <span className="gpt-d-left">{face(2)}</span>
              <span className="gpt-d-right">{face(1)}</span>
              <span className="gpt-d-bottom">{face(0)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="gpt-nonstd">
          This controller reports a non-standard mapping, so button positions aren&apos;t
          guaranteed. Every button and axis still lights up live in the raw readout below.
        </p>
      )}

      <div className="gpt-sticks">
        <Stick label="Left stick" x={ax[0] || 0} y={ax[1] || 0} pressed={b(10).pressed} />
        <Stick label="Right stick" x={ax[2] || 0} y={ax[3] || 0} pressed={b(11).pressed} />
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{pad.buttons.length}</div>
          <div className="tool-stat-label">Buttons</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{pad.axes.length}</div>
          <div className="tool-stat-label">Axes</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{pressedNow}</div>
          <div className="tool-stat-label">Pressed now</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{pad.hasRumble ? "Yes" : "No"}</div>
          <div className="tool-stat-label">Rumble</div>
        </div>
      </div>

      <div className="gpt-raw">
        <div className="gpt-raw-title">Buttons</div>
        <div className="gpt-raw-btns">
          {pad.buttons.map((btn, i) => {
            const label = isStd ? stdLabel(i, style === "ps" ? "ps" : "xbox") : "B" + i;
            const isLit = btn.pressed || btn.value > 0.06;
            return (
              <div className={"gpt-chip" + (isLit ? " is-lit" : "")} key={i} title={"Button " + i}>
                <span className="gpt-chip-i">{i}</span>
                <span className="gpt-chip-l">{style === "num" ? "B" + i : label}</span>
                <span className="gpt-chip-bar" aria-hidden="true">
                  <i style={{ width: Math.round(clamp(btn.value, 0, 1) * 100) + "%" }} />
                </span>
                <span className="gpt-chip-v">{btn.value.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        <div className="gpt-raw-title">Axes</div>
        <div className="gpt-raw-axes">
          {pad.axes.map((v, i) => (
            <div className="gpt-axis" key={i}>
              <span className="gpt-axis-i">Axis {i}</span>
              <span className="gpt-axis-bar" aria-hidden="true">
                <i style={{ left: 50 + clamp(v, -1, 1) * 50 + "%" }} />
              </span>
              <span className="gpt-axis-v">{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GamepadTester() {
  const [supported] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.getGamepads === "function"
  );
  const [pads, setPads] = useState([]);
  const [style, setStyle] = useState("xbox"); // xbox | ps | num
  const [loaded, setLoaded] = useState(false);
  const [everConnected, setEverConnected] = useState(false);

  const rafRef = useRef(0);
  const hadPadsRef = useRef(false);

  // ---- persist the label style only ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && (s.style === "xbox" || s.style === "ps" || s.style === "num")) setStyle(s.style);
      }
    } catch (e) { /* private mode — default is fine */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ style })); } catch (e) { /* ignore */ }
  }, [style, loaded]);

  // ---- push current gamepad state into React ----
  const pump = useCallback(() => {
    const list = readPads();
    if (list.length === 0) {
      if (hadPadsRef.current) { hadPadsRef.current = false; setPads([]); }
    } else {
      hadPadsRef.current = true;
      if (!everConnected) setEverConnected(true);
      setPads(list);
    }
  }, [everConnected]);

  // ---- rAF polling loop + connect/disconnect events ----
  useEffect(() => {
    if (!supported) return;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      pump();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onConnect = () => pump();
    const onDisconnect = () => pump();
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, [supported, pump]);

  const rumble = useCallback((index) => {
    try {
      const gp = (navigator.getGamepads && navigator.getGamepads()[index]) || null;
      const act = gp && gp.vibrationActuator;
      if (!act) return;
      if (act.playEffect) {
        act.playEffect("dual-rumble", { startDelay: 0, duration: 350, strongMagnitude: 1, weakMagnitude: 0.85 });
      } else if (act.pulse) {
        act.pulse(1, 350);
      }
    } catch (e) { /* vibration blocked / unsupported */ }
  }, []);

  const rescan = useCallback(() => { hadPadsRef.current = false; pump(); }, [pump]);

  const anyRumble = pads.some((p) => p.hasRumble);

  return (
    <div className="tool gpt">
      <style>{`
        .gpt .gpt-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px;}
        .gpt .gpt-seg{display:inline-flex;background:#0b0d12;border:1px solid #232838;border-radius:9px;padding:3px;}
        .gpt .gpt-seg button{border:0;background:transparent;color:#aab3c5;font:600 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          padding:7px 12px;border-radius:7px;cursor:pointer;}
        .gpt .gpt-seg button.on{background:#2f6bff;color:#fff;}
        .gpt .gpt-seg-label{font-size:13px;font-weight:600;opacity:.8;margin-right:2px;align-self:center;}

        .gpt .gpt-empty,.gpt .gpt-unsupported{background:#0b0d12;border:1px solid #232838;border-radius:12px;
          padding:34px 22px;text-align:center;color:#c9d1e0;}
        .gpt .gpt-empty .gpt-big{font-size:54px;line-height:1;filter:grayscale(.1);animation:gptPulse 1.8s ease-in-out infinite;}
        .gpt .gpt-empty h3{margin:14px 0 6px;font-size:19px;color:#fff;}
        .gpt .gpt-empty p{margin:0 auto;max-width:44ch;font-size:14px;opacity:.8;line-height:1.5;}
        @keyframes gptPulse{0%,100%{transform:translateY(0);opacity:.85;}50%{transform:translateY(-6px);opacity:1;}}
        @media (prefers-reduced-motion:reduce){.gpt .gpt-empty .gpt-big{animation:none;}}

        .gpt .gpt-status{font-size:13.5px;font-weight:600;color:#8ea2c8;margin:0 0 10px;}

        .gpt .gpt-panel{background:#0b0d12;border:1px solid #232838;border-radius:14px;padding:16px;margin-bottom:16px;}
        .gpt .gpt-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
        .gpt .gpt-title{display:flex;align-items:center;gap:9px;min-width:0;}
        .gpt .gpt-glyph{font-size:20px;}
        .gpt .gpt-name{color:#fff;font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;}
        .gpt .gpt-badges{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
        .gpt .gpt-badge{font-size:11.5px;font-weight:600;letter-spacing:.2px;color:#aab3c5;background:#151a26;border:1px solid #2b3242;
          border-radius:999px;padding:4px 10px;}
        .gpt .gpt-badge.ok{color:#79e2ad;border-color:#2f7d5b;background:#102a20;}
        .gpt .gpt-badge.warn{color:#ffcf8f;border-color:#7d5b2f;background:#2a2110;}
        .gpt .gpt-rumble{padding:6px 12px;font-size:12.5px;}

        .gpt .gpt-diagram{display:flex;gap:18px;justify-content:space-between;flex-wrap:wrap;}
        .gpt .gpt-col{display:flex;flex-direction:column;gap:14px;align-items:center;flex:1;min-width:150px;}
        .gpt .gpt-col-center{justify-content:flex-start;}

        .gpt .gpt-face{--sz:clamp(40px,11vw,52px);width:var(--sz);height:var(--sz);border-radius:12px;display:flex;align-items:center;
          justify-content:center;box-sizing:border-box;background:#171b27;color:#c3cad9;border:1px solid #2b3242;border-bottom:3px solid #202634;
          font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:0 3px;overflow:hidden;
          transition:background .05s linear,transform .05s linear,box-shadow .05s linear;user-select:none;}
        .gpt .gpt-face span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
        .gpt .gpt-face.is-lit{background:#2f6bff;border-color:#6f97ff;border-bottom-color:#2450c8;color:#fff;transform:translateY(2px);
          box-shadow:0 0 0 2px rgba(47,107,255,.35),0 0 18px rgba(47,107,255,.55);}

        .gpt .gpt-shoulders{display:flex;gap:10px;}
        .gpt .gpt-shoulders-right{visibility:hidden;height:0;margin:0;}
        .gpt .gpt-cap-inline{font-size:0;}

        .gpt .gpt-dpad{display:flex;flex-direction:column;align-items:center;gap:5px;}
        .gpt .gpt-dpad-grid{display:grid;grid-template-columns:repeat(3,auto);grid-template-rows:repeat(3,auto);gap:5px;
          grid-template-areas:". u ." "l . r" ". d .";}
        .gpt .gpt-dpad-grid .gpt-face{--sz:clamp(34px,9vw,42px);border-radius:9px;}
        .gpt .gpt-cap{font-size:11px;text-transform:uppercase;letter-spacing:.5px;opacity:.55;color:#8b93a5;}

        .gpt .gpt-diamond{position:relative;width:clamp(150px,42vw,190px);height:clamp(150px,42vw,190px);}
        .gpt .gpt-diamond>span{position:absolute;}
        .gpt .gpt-d-top{top:0;left:50%;transform:translateX(-50%);}
        .gpt .gpt-d-bottom{bottom:0;left:50%;transform:translateX(-50%);}
        .gpt .gpt-d-left{left:0;top:50%;transform:translateY(-50%);}
        .gpt .gpt-d-right{right:0;top:50%;transform:translateY(-50%);}

        .gpt .gpt-triggers{display:flex;gap:14px;justify-content:center;}
        .gpt .gpt-trig{display:flex;flex-direction:column;align-items:center;gap:6px;}
        .gpt .gpt-trig-track{position:relative;width:26px;height:clamp(66px,15vw,86px);background:#151a26;border:1px solid #2b3242;
          border-radius:8px;overflow:hidden;display:flex;align-items:flex-end;}
        .gpt .gpt-trig-track i{display:block;width:100%;background:linear-gradient(#6f97ff,#2f6bff);transition:height .04s linear;}
        .gpt .gpt-trig.is-lit .gpt-trig-track{border-color:#6f97ff;box-shadow:0 0 12px rgba(47,107,255,.4);}
        .gpt .gpt-trig-meta{display:flex;flex-direction:column;align-items:center;gap:1px;font-size:12px;color:#c3cad9;}
        .gpt .gpt-trig-meta b{font-weight:700;}
        .gpt .gpt-trig-meta span{font-variant-numeric:tabular-nums;opacity:.75;font-size:11.5px;}

        .gpt .gpt-center-btns{display:flex;gap:10px;margin-top:12px;justify-content:center;flex-wrap:wrap;}
        .gpt .gpt-center-btns .gpt-face{--sz:auto;width:auto;min-width:56px;height:38px;border-radius:9px;padding:0 12px;font-size:12px;}

        .gpt .gpt-nonstd{background:#1b1206;border:1px solid #4a3413;color:#e7c79a;border-radius:10px;padding:12px 14px;
          font-size:13.5px;line-height:1.5;margin:0 0 6px;}

        .gpt .gpt-sticks{display:flex;gap:18px;flex-wrap:wrap;margin-top:16px;}
        .gpt .gpt-stick{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;min-width:150px;}
        .gpt .gpt-well{position:relative;width:clamp(120px,32vw,150px);aspect-ratio:1;border-radius:50%;
          background:radial-gradient(circle at 50% 45%,#131826,#0a0d14 72%);border:1px solid #2b3242;box-shadow:inset 0 0 24px rgba(0,0,0,.6);}
        .gpt .gpt-well.is-press{border-color:#6f97ff;box-shadow:inset 0 0 24px rgba(0,0,0,.6),0 0 16px rgba(47,107,255,.45);}
        .gpt .gpt-cross{position:absolute;background:#2b3242;}
        .gpt .gpt-cross-h{left:8%;right:8%;top:50%;height:1px;transform:translateY(-.5px);}
        .gpt .gpt-cross-v{top:8%;bottom:8%;left:50%;width:1px;transform:translateX(-.5px);}
        .gpt .gpt-deadzone{position:absolute;left:50%;top:50%;width:22%;height:22%;transform:translate(-50%,-50%);
          border:1px dashed #384258;border-radius:50%;}
        .gpt .gpt-dot{position:absolute;width:20px;height:20px;border-radius:50%;background:#2f6bff;transform:translate(-50%,-50%);
          box-shadow:0 0 0 3px rgba(47,107,255,.25),0 0 14px rgba(47,107,255,.6);transition:left .03s linear,top .03s linear;}
        .gpt .gpt-well.is-press .gpt-dot{background:#79e2ad;box-shadow:0 0 0 3px rgba(121,226,173,.25),0 0 14px rgba(121,226,173,.6);}
        .gpt .gpt-stick-meta{display:flex;gap:10px;align-items:center;font-size:12.5px;color:#c3cad9;flex-wrap:wrap;justify-content:center;}
        .gpt .gpt-stick-meta b{color:#fff;font-weight:700;}
        .gpt .gpt-stick-meta span{font-variant-numeric:tabular-nums;opacity:.8;white-space:pre;}

        .gpt .gpt-raw{margin-top:18px;}
        .gpt .gpt-raw-title{font-size:11.5px;text-transform:uppercase;letter-spacing:.6px;color:#7c869c;font-weight:700;margin:14px 0 8px;}
        .gpt .gpt-raw-btns{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:7px;}
        .gpt .gpt-chip{display:flex;align-items:center;gap:7px;background:#10141d;border:1px solid #232838;border-radius:8px;
          padding:6px 8px;font-size:12px;color:#aeb7c8;transition:background .05s linear,border-color .05s linear;}
        .gpt .gpt-chip.is-lit{background:#12213f;border-color:#3a63b8;color:#dbe6ff;}
        .gpt .gpt-chip-i{font-variant-numeric:tabular-nums;font-weight:700;color:#6f7c94;min-width:15px;}
        .gpt .gpt-chip.is-lit .gpt-chip-i{color:#8fb0ff;}
        .gpt .gpt-chip-l{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;}
        .gpt .gpt-chip-bar{position:relative;width:34px;height:5px;border-radius:3px;background:#232838;overflow:hidden;flex:0 0 auto;}
        .gpt .gpt-chip-bar i{position:absolute;left:0;top:0;bottom:0;background:#2f6bff;}
        .gpt .gpt-chip-v{font-variant-numeric:tabular-nums;opacity:.7;min-width:30px;text-align:right;}

        .gpt .gpt-raw-axes{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;}
        .gpt .gpt-axis{display:flex;align-items:center;gap:9px;font-size:12px;color:#aeb7c8;}
        .gpt .gpt-axis-i{min-width:44px;font-weight:600;}
        .gpt .gpt-axis-bar{position:relative;flex:1;height:6px;border-radius:4px;background:#232838;}
        .gpt .gpt-axis-bar::before{content:"";position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:#414b60;}
        .gpt .gpt-axis-bar i{position:absolute;top:50%;width:10px;height:10px;border-radius:50%;background:#2f6bff;transform:translate(-50%,-50%);
          box-shadow:0 0 8px rgba(47,107,255,.55);transition:left .03s linear;}
        .gpt .gpt-axis-v{font-variant-numeric:tabular-nums;min-width:44px;text-align:right;opacity:.85;white-space:pre;}
      `}</style>

      {!supported ? (
        <div className="gpt-unsupported" role="alert">
          <div style={{ fontSize: 40, lineHeight: 1 }}>🚫</div>
          <h3 style={{ margin: "12px 0 6px", color: "#fff" }}>Gamepad API not available</h3>
          <p style={{ margin: "0 auto", maxWidth: "46ch", fontSize: 14, opacity: 0.8, lineHeight: 1.5 }}>
            This browser doesn&apos;t expose the Gamepad API, so controllers can&apos;t be read. Try the latest
            Chrome, Edge, Firefox, or Opera on desktop. Some in-app / embedded browsers block it entirely.
          </p>
        </div>
      ) : (
        <>
          <div className="gpt-controls">
            <span className="gpt-seg-label">Button labels</span>
            <div className="gpt-seg" role="group" aria-label="Button label style">
              <button type="button" className={style === "xbox" ? "on" : ""} onClick={() => setStyle("xbox")} aria-pressed={style === "xbox"}>Xbox</button>
              <button type="button" className={style === "ps" ? "on" : ""} onClick={() => setStyle("ps")} aria-pressed={style === "ps"}>PlayStation</button>
              <button type="button" className={style === "num" ? "on" : ""} onClick={() => setStyle("num")} aria-pressed={style === "num"}>Numbered</button>
            </div>
            <button type="button" className="btn btn-primary" onClick={rescan}>Rescan controllers</button>
          </div>

          <p className="gpt-status" role="status" aria-live="polite">
            {pads.length === 0
              ? "No controller detected yet."
              : `${pads.length} controller${pads.length > 1 ? "s" : ""} connected${anyRumble ? " · rumble ready" : ""}.`}
          </p>

          {pads.length === 0 ? (
            <div className="gpt-empty">
              <div className="gpt-big" aria-hidden="true">🎮</div>
              <h3>Press any button on your controller to connect it</h3>
              <p>
                Plug in a USB controller or pair it over Bluetooth, then press a button, pull a
                trigger, or nudge a stick. Browsers hide gamepads until you give them input, so a
                single button press wakes it up. Xbox, PlayStation (DualShock / DualSense), Switch
                Pro, and generic USB pads all work.
              </p>
            </div>
          ) : (
            pads.map((pad) => (
              <Pad key={pad.index} pad={pad} style={style} onRumble={rumble} />
            ))
          )}

          <p className="tool-note" style={{ marginTop: 12 }}>
            Every button lights up the instant it&apos;s pressed, analog triggers show their live
            0.00–1.00 value, and each stick plots its exact X/Y position. Hold buttons together to
            check that they all register at once. Everything runs in your browser over the Gamepad
            API — nothing about your controller is recorded or uploaded.
          </p>
        </>
      )}
    </div>
  );
}
