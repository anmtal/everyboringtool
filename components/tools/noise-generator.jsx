"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Everything runs in the browser: the noise is synthesised with the Web Audio API,
// never streamed or uploaded. Each colour is generated once into a looping
// AudioBuffer (white = uniform random, pink = Paul Kellet's filter, brown = an
// integrated random walk clamped to [-1,1]), then played through a GainNode for
// volume and the sleep-timer fade. The AudioContext is created on the first click
// so autoplay policies are satisfied, and the source + timers are torn down on stop
// and on unmount.

const LS_KEY = "ebt-noise-generator";

const COLORS = [
  { id: "white", name: "White noise", tint: "#e4ebf6", blurb: "Bright, even hiss across every frequency — masks voices, keyboards and traffic." },
  { id: "pink", name: "Pink noise", tint: "#ff9ec4", blurb: "Softer and balanced, with more low end — like steady rain on a window." },
  { id: "brown", name: "Brown noise", tint: "#c78a5a", blurb: "Deep, low rumble — like a waterfall, wind or a jet cabin. Popular for focus." },
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Build a seamless, loudness-matched looping noise buffer for one colour.
function generateNoise(ctx, color) {
  const seconds = 6;
  const len = Math.floor(ctx.sampleRate * seconds);
  const xf = Math.min(4096, Math.floor(len / 8)); // crossfade length for a seamless loop
  const N = len + xf;
  const raw = new Float32Array(N);

  if (color === "white") {
    // uniform random
    for (let i = 0; i < N; i++) raw[i] = Math.random() * 2 - 1;
  } else if (color === "pink") {
    // Paul Kellet's refined pink-noise filter
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < N; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
  } else {
    // brown noise: integrated random walk (leaky integrator keeps it bounded)
    let last = 0;
    for (let i = 0; i < N; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      raw[i] = last;
    }
  }

  // Normalise each colour to the same RMS so switching doesn't jump in loudness,
  // then hard-clamp every sample to [-1,1] so nothing ever distorts.
  let sum = 0;
  for (let i = 0; i < N; i++) sum += raw[i] * raw[i];
  const rms = Math.sqrt(sum / N) || 1;
  const g = 0.25 / rms;
  for (let i = 0; i < N; i++) {
    const v = raw[i] * g;
    raw[i] = v > 1 ? 1 : v < -1 ? -1 : v;
  }

  // Crossfade the tail back over the head so the loop point is continuous.
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = raw[i];
  for (let i = 0; i < xf; i++) {
    const t = i / xf;
    data[i] = raw[i] * t + raw[len + i] * (1 - t);
  }
  return buffer;
}

export default function NoiseGenerator() {
  const [color, setColor] = useState("brown");
  const [volume, setVolume] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const [sleepMin, setSleepMin] = useState(0); // 0 = off
  const [customMin, setCustomMin] = useState("");
  const [remaining, setRemaining] = useState(null); // seconds left, or null
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const buffersRef = useRef({}); // { white, pink, brown } cache
  const colorRef = useRef(color);
  const volumeRef = useRef(volume);
  const sleepRef = useRef(sleepMin);
  const playingRef = useRef(false);
  const fadingRef = useRef(false);
  const endAtRef = useRef(null);
  const stopTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { sleepRef.current = sleepMin; }, [sleepMin]);

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.color === "white" || s.color === "pink" || s.color === "brown") {
          setColor(s.color); colorRef.current = s.color;
        }
        if (Number.isFinite(s.volume)) {
          const v = clamp(s.volume, 0, 1); setVolume(v); volumeRef.current = v;
        }
        if (Number.isFinite(s.sleepMin)) {
          const m = clamp(Math.round(s.sleepMin), 0, 600);
          setSleepMin(m); sleepRef.current = m;
          if (m > 0 && ![15, 30, 60].includes(m)) setCustomMin(String(m));
        }
      }
    } catch (e) { /* private mode / blocked storage — use defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ color, volume, sleepMin }));
    } catch (e) { /* ignore */ }
  }, [color, volume, sleepMin, loaded]);

  // ---- audio helpers ----
  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) throw new Error("no-webaudio");
    ctxRef.current = new AC();
    return ctxRef.current;
  }, []);

  const stopSourceImmediate = useCallback(() => {
    const src = sourceRef.current, gain = gainRef.current;
    try { if (src) { src.onended = null; src.stop(); } } catch (e) { /* already stopped */ }
    try { if (src) src.disconnect(); } catch (e) {}
    try { if (gain) gain.disconnect(); } catch (e) {}
    sourceRef.current = null;
    gainRef.current = null;
  }, []);

  const clearSleepTimers = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const stop = useCallback(() => {
    clearSleepTimers();
    setRemaining(null);
    const ctx = ctxRef.current, gain = gainRef.current, src = sourceRef.current;
    sourceRef.current = null;
    gainRef.current = null;
    fadingRef.current = false;
    playingRef.current = false;
    setPlaying(false);
    if (ctx && gain && src) {
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.08); // tiny fade to avoid a click
        src.stop(now + 0.1);
        src.onended = () => { try { src.disconnect(); gain.disconnect(); } catch (e) {} };
      } catch (e) {
        try { src.stop(); } catch (e2) {}
        try { src.disconnect(); gain.disconnect(); } catch (e2) {}
      }
    }
  }, [clearSleepTimers]);

  // (Re)arm the sleep-timer fade + hard stop based on endAtRef. Also resets the
  // gain to full volume, so it is safe to call after a colour swap or a retimed sleep.
  const scheduleSleepTimers = useCallback(() => {
    clearSleepTimers();
    const ctx = ctxRef.current, gain = gainRef.current;
    if (ctx && gain) {
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(volumeRef.current, now);
      } catch (e) {}
    }
    fadingRef.current = false;

    const endAt = endAtRef.current;
    if (!endAt) { setRemaining(null); return; }
    const totalMs = endAt - Date.now();
    if (totalMs <= 0) { stop(); return; }

    setRemaining(Math.ceil(totalMs / 1000));
    tickRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
    }, 500);

    const fadeSec = clamp(Math.floor(totalMs / 1000 / 4), 4, 15);
    const fadeStartMs = Math.max(0, totalMs - fadeSec * 1000);
    fadeTimerRef.current = setTimeout(() => {
      const c = ctxRef.current, gn = gainRef.current;
      if (c && gn) {
        try {
          fadingRef.current = true;
          const now = c.currentTime;
          const secs = Math.max(0.2, (endAtRef.current - Date.now()) / 1000);
          gn.gain.cancelScheduledValues(now);
          gn.gain.setValueAtTime(gn.gain.value, now);
          gn.gain.linearRampToValueAtTime(0.0001, now + secs); // gentle fade-out
        } catch (e) {}
      }
    }, fadeStartMs);

    stopTimerRef.current = setTimeout(() => { stop(); }, totalMs + 200);
  }, [clearSleepTimers, stop]);

  const start = useCallback(async () => {
    let ctx;
    try { ctx = ensureCtx(); }
    catch (e) { setError("Your browser doesn't support the Web Audio API, so noise can't be generated here."); return; }
    setError(null);
    try { if (ctx.state === "suspended") await ctx.resume(); } catch (e) {}

    stopSourceImmediate();
    const c = colorRef.current;
    if (!buffersRef.current[c]) {
      try { buffersRef.current[c] = generateNoise(ctx, c); }
      catch (e) { setError("Couldn't build the noise buffer — try again."); return; }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffersRef.current[c];
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volumeRef.current;
    src.connect(gain);
    gain.connect(ctx.destination);
    try { src.start(0); } catch (e) {}
    sourceRef.current = src;
    gainRef.current = gain;
    fadingRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    endAtRef.current = sleepRef.current > 0 ? Date.now() + sleepRef.current * 60000 : null;
    scheduleSleepTimers();
  }, [ensureCtx, stopSourceImmediate, scheduleSleepTimers]);

  const toggle = useCallback(() => {
    if (playingRef.current) stop();
    else start();
  }, [start, stop]);

  const selectColor = useCallback((c) => {
    colorRef.current = c;
    setColor(c);
    if (!playingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    // swap the source live, keep the sleep timer running
    stopSourceImmediate();
    if (!buffersRef.current[c]) {
      try { buffersRef.current[c] = generateNoise(ctx, c); } catch (e) { return; }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffersRef.current[c];
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volumeRef.current;
    src.connect(gain);
    gain.connect(ctx.destination);
    try { src.start(0); } catch (e) {}
    sourceRef.current = src;
    gainRef.current = gain;
    scheduleSleepTimers(); // re-arm the fade on the new gain node
  }, [stopSourceImmediate, scheduleSleepTimers]);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    volumeRef.current = v;
    const ctx = ctxRef.current, gain = gainRef.current;
    if (ctx && gain && !fadingRef.current) {
      try { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.015); } catch (e) { try { gain.gain.value = v; } catch (e2) {} }
    }
  }, []);

  const applySleep = useCallback((mins) => {
    setSleepMin(mins);
    sleepRef.current = mins;
    if (!playingRef.current) return;
    endAtRef.current = mins > 0 ? Date.now() + mins * 60000 : null;
    fadingRef.current = false;
    scheduleSleepTimers();
  }, [scheduleSleepTimers]);

  const onCustomMin = useCallback((val) => {
    setCustomMin(val);
    const n = parseInt(val, 10);
    if (Number.isFinite(n) && n >= 1) applySleep(clamp(n, 1, 600));
  }, [applySleep]);

  // Space toggles play/stop, unless the user is typing in a field.
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // ---- teardown ----
  useEffect(() => () => {
    clearSleepTimers();
    stopSourceImmediate();
    try { if (ctxRef.current) ctxRef.current.close(); } catch (e) {}
    ctxRef.current = null;
  }, [clearSleepTimers, stopSourceImmediate]);

  const active = COLORS.find((c) => c.id === color) || COLORS[0];
  const fmtTime = (s) => {
    if (s == null) return "";
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
  };
  const isPreset = (m) => sleepMin === m;
  const customActive = sleepMin > 0 && ![15, 30, 60].includes(sleepMin);

  return (
    <div className={playing ? "tool ng is-playing" : "tool ng"}>
      <style>{`
        .ng .ng-colors{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;}
        .ng .ng-chip{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:left;
          padding:12px 13px;border-radius:12px;border:1.5px solid var(--line,#e6e6e6);background:var(--card,#fff);
          cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .05s;color:inherit;font:inherit;}
        .ng .ng-chip:hover{border-color:#9aa3b2;}
        .ng .ng-chip:active{transform:translateY(1px);}
        .ng .ng-chip[aria-pressed="true"]{border-color:var(--ng);box-shadow:0 0 0 3px color-mix(in srgb,var(--ng) 28%,transparent);}
        .ng .ng-chip-top{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;}
        .ng .ng-dot{width:16px;height:16px;border-radius:50%;flex:0 0 auto;
          box-shadow:0 0 8px 1px color-mix(in srgb,var(--dot) 70%,transparent);border:1px solid rgba(0,0,0,.15);}
        .ng .ng-chip-blurb{font-size:12px;line-height:1.35;opacity:.72;}
        .ng .ng-stage{position:relative;overflow:hidden;background:#0b0d12;border:1px solid #232838;border-radius:14px;
          padding:26px 18px 22px;display:flex;flex-direction:column;align-items:center;gap:14px;}
        .ng .ng-orb{position:relative;width:120px;height:120px;border-radius:50%;
          background:radial-gradient(circle at 38% 34%, color-mix(in srgb,var(--ng) 92%,#fff) 0%, var(--ng) 42%, #0b0d12 100%);
          box-shadow:0 0 48px 6px color-mix(in srgb,var(--ng) 55%,transparent);}
        .ng .ng-orb::after{content:"";position:absolute;inset:-14px;border-radius:50%;
          border:2px solid color-mix(in srgb,var(--ng) 45%,transparent);opacity:0;}
        .ng.is-playing .ng-orb{animation:ng-breathe 3.4s ease-in-out infinite;}
        .ng.is-playing .ng-orb::after{animation:ng-ripple 3.4s ease-out infinite;}
        @keyframes ng-breathe{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}
        @keyframes ng-ripple{0%{opacity:.55;transform:scale(1);}100%{opacity:0;transform:scale(1.5);}}
        .ng .ng-name{color:#fff;font-weight:800;font-size:20px;letter-spacing:.2px;}
        .ng .ng-status{color:#aeb6c6;font-size:13px;min-height:18px;}
        .ng .ng-bars{display:flex;align-items:flex-end;gap:5px;height:34px;}
        .ng .ng-bars span{width:5px;height:22%;border-radius:3px;background:var(--ng);opacity:.85;}
        .ng.is-playing .ng-bars span{animation:ng-eq 1s ease-in-out infinite;}
        .ng .ng-bars span:nth-child(1){animation-delay:-.9s;}
        .ng .ng-bars span:nth-child(2){animation-delay:-.2s;}
        .ng .ng-bars span:nth-child(3){animation-delay:-.6s;}
        .ng .ng-bars span:nth-child(4){animation-delay:-.35s;}
        .ng .ng-bars span:nth-child(5){animation-delay:-.75s;}
        .ng .ng-bars span:nth-child(6){animation-delay:-.15s;}
        .ng .ng-bars span:nth-child(7){animation-delay:-.5s;}
        @keyframes ng-eq{0%,100%{height:20%;}50%{height:100%;}}
        .ng .ng-countdown{color:#fff;font-weight:700;font-variant-numeric:tabular-nums;font-size:15px;}
        .ng .ng-countdown span{opacity:.6;font-weight:600;}
        .ng .ng-row{margin-top:16px;}
        .ng .ng-row label{display:block;font-size:13px;font-weight:600;opacity:.85;margin-bottom:5px;}
        .ng .ng-vol{display:flex;align-items:center;gap:12px;}
        .ng .ng-vol input[type=range]{flex:1;accent-color:var(--ng);}
        .ng .ng-vol-val{font-size:13px;font-weight:600;min-width:40px;text-align:right;font-variant-numeric:tabular-nums;}
        .ng .ng-sleep{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
        .ng .ng-pill{padding:7px 13px;border-radius:999px;border:1.5px solid var(--line,#e6e6e6);background:var(--card,#fff);
          cursor:pointer;font:inherit;font-size:13px;font-weight:600;color:inherit;transition:border-color .15s,background .15s;}
        .ng .ng-pill:hover{border-color:#9aa3b2;}
        .ng .ng-pill[aria-pressed="true"]{border-color:var(--ng);background:color-mix(in srgb,var(--ng) 16%,transparent);}
        .ng .ng-custom{display:flex;align-items:center;gap:6px;font-size:13px;}
        .ng .ng-custom input{width:64px;padding:6px 8px;border-radius:8px;border:1.5px solid var(--line,#e6e6e6);
          background:var(--card,#fff);color:inherit;font:inherit;}
        .ng .ng-error{background:#fdecec;border:1px solid #f3b4b4;color:#8a1f1f;border-radius:10px;padding:11px 13px;
          font-size:13.5px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
        @media (prefers-color-scheme:dark){
          .ng .ng-error{background:#3a1414;border-color:#7a2b2b;color:#f4c9c9;}
        }
        @media (prefers-reduced-motion:reduce){
          .ng.is-playing .ng-orb,.ng.is-playing .ng-orb::after,.ng.is-playing .ng-bars span{animation:none;}
          .ng.is-playing .ng-bars span{height:60%;}
        }
        @media (max-width:520px){
          .ng .ng-colors{grid-template-columns:1fr;}
        }
      `}</style>

      {error && (
        <div className="ng-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn" onClick={() => { setError(null); start(); }}>Try again</button>
        </div>
      )}

      <div className="ng-colors" role="group" aria-label="Noise colour">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="ng-chip"
            aria-pressed={color === c.id}
            style={{ "--ng": c.tint, "--dot": c.tint }}
            onClick={() => selectColor(c.id)}
          >
            <span className="ng-chip-top">
              <span className="ng-dot" style={{ background: c.tint, "--dot": c.tint }} aria-hidden="true" />
              {c.name}
            </span>
            <span className="ng-chip-blurb">{c.blurb}</span>
          </button>
        ))}
      </div>

      <div className="ng-stage" style={{ "--ng": active.tint }}>
        <div className="ng-orb" aria-hidden="true" />
        <div className="ng-name">{active.name}</div>
        <div className="ng-bars" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span />
        </div>
        <div className="ng-status" role="status" aria-live="polite">
          {playing
            ? (remaining != null
                ? <span className="ng-countdown">Stops in {fmtTime(remaining)} <span>· looping</span></span>
                : "Playing — looping seamlessly")
            : "Stopped"}
        </div>
      </div>

      <div className="tool-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-primary" onClick={toggle} aria-pressed={playing}>
          {playing ? "Stop" : "Play"}
        </button>
      </div>

      <div className="ng-row">
        <label htmlFor="ng-vol">Volume</label>
        <div className="ng-vol" style={{ "--ng": active.tint }}>
          <input
            id="ng-vol"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume"
          />
          <span className="ng-vol-val">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div className="ng-row">
        <label>Sleep timer</label>
        <div className="ng-sleep" role="group" aria-label="Sleep timer" style={{ "--ng": active.tint }}>
          <button type="button" className="ng-pill" aria-pressed={sleepMin === 0}
            onClick={() => { setCustomMin(""); applySleep(0); }}>Off</button>
          <button type="button" className="ng-pill" aria-pressed={isPreset(15)}
            onClick={() => { setCustomMin(""); applySleep(15); }}>15 min</button>
          <button type="button" className="ng-pill" aria-pressed={isPreset(30)}
            onClick={() => { setCustomMin(""); applySleep(30); }}>30 min</button>
          <button type="button" className="ng-pill" aria-pressed={isPreset(60)}
            onClick={() => { setCustomMin(""); applySleep(60); }}>60 min</button>
          <span className="ng-custom">
            <label htmlFor="ng-custom" style={{ margin: 0, opacity: .85, fontWeight: customActive ? 700 : 400 }}>Custom</label>
            <input
              id="ng-custom"
              type="number"
              min={1}
              max={600}
              inputMode="numeric"
              placeholder="min"
              value={customMin}
              onChange={(e) => onCustomMin(e.target.value)}
              aria-label="Custom sleep timer in minutes"
              style={customActive ? { borderColor: active.tint } : undefined}
            />
          </span>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: 14 }}>
        Press <strong>Play</strong> (or the space bar) to start. The sleep timer fades the sound out gently before it
        stops, so it won't jolt you awake. Everything is generated in your browser with the Web Audio API — nothing is
        streamed or uploaded, and your colour, volume and timer are remembered on this device.
      </p>
    </div>
  );
}
