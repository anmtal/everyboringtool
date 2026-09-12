"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// Everything runs in this browser with the Web Audio API — nothing is streamed
// or uploaded. Graph: OscillatorNode -> GainNode (volume + click-free attack)
// -> StereoPannerNode (channel select) -> destination. The oscillator is also
// tapped into an AnalyserNode (never connected onward) so the oscilloscope shows
// a full-amplitude preview regardless of volume. The AudioContext is created on
// the first Play so autoplay policies are satisfied, and every node + the rAF
// draw loop is torn down on Stop and on unmount. A sweep pre-schedules an
// exponential ramp on the frequency AudioParam and mirrors it in JS for the
// readout, so the audio and the number never drift apart.

const LS_KEY = "ebt-tone-generator";

const F_MIN = 20;
const F_MAX = 20000;
const S_MAX = 1000; // logarithmic slider resolution

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const WAVES = [
  { id: "sine", name: "Sine", d: "M1 8 Q 4 1 7 8 T 13 8 T 19 8 T 25 8" },
  { id: "square", name: "Square", d: "M1 13 V3 H7 V13 H13 V3 H19 V13 H25 V3" },
  { id: "sawtooth", name: "Sawtooth", d: "M1 13 L7 3 L7 13 L13 3 L13 13 L19 3 L19 13 L25 3" },
  { id: "triangle", name: "Triangle", d: "M1 13 L4 3 L10 13 L16 3 L22 13 L25 8" },
];

const PRESETS = [
  { hz: 20, label: "20 Hz" },
  { hz: 60, label: "60 Hz" },
  { hz: 100, label: "100 Hz" },
  { hz: 440, label: "440 Hz" },
  { hz: 1000, label: "1 kHz" },
  { hz: 3000, label: "3 kHz" },
  { hz: 8000, label: "8 kHz" },
  { hz: 15000, label: "15 kHz" },
];

const SCOPE_COLOR = "#63d3ff";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const freqToSlider = (f) => Math.round((S_MAX * Math.log(clamp(f, F_MIN, F_MAX) / F_MIN)) / Math.log(F_MAX / F_MIN));
const sliderToFreq = (s) => F_MIN * Math.pow(F_MAX / F_MIN, clamp(s, 0, S_MAX) / S_MAX);
const fmtHz = (f) => Math.round(f).toLocaleString("en-US");

function noteFromFreq(freq) {
  if (!freq || freq <= 0) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  const name = NOTE_NAMES[((nearest % 12) + 12) % 12];
  const octave = Math.floor(nearest / 12) - 1;
  return { name: `${name}${octave}`, cents };
}

export default function ToneGenerator() {
  const [freq, setFreq] = useState(440);
  const [wave, setWave] = useState("sine");
  const [volume, setVolume] = useState(0.2);
  const [channel, setChannel] = useState("both");
  const [playing, setPlaying] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sweepFrom, setSweepFrom] = useState(200);
  const [sweepTo, setSweepTo] = useState(2000);
  const [sweepSec, setSweepSec] = useState(5);
  const [sweepLoop, setSweepLoop] = useState(false);
  const [noPan, setNoPan] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // audio nodes
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const pannerRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  // canvas + loop
  const canvasRef = useRef(null);
  const dprRef = useRef(1);
  const rafRef = useRef(0);
  const stepRef = useRef(() => {});
  const lastPushRef = useRef(0);

  // sweep state (imperative, read inside rAF)
  const sweepStateRef = useRef(null);

  // latest-value mirrors for async/rAF closures
  const freqRef = useRef(freq);
  const waveRef = useRef(wave);
  const volumeRef = useRef(volume);
  const channelRef = useRef(channel);
  const playingRef = useRef(false);
  const sweepingRef = useRef(false);
  const sweepFromRef = useRef(sweepFrom);
  const sweepToRef = useRef(sweepTo);
  const sweepSecRef = useRef(sweepSec);
  const sweepLoopRef = useRef(sweepLoop);

  useEffect(() => { freqRef.current = freq; }, [freq]);
  useEffect(() => { waveRef.current = wave; }, [wave]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { channelRef.current = channel; }, [channel]);
  useEffect(() => { sweepFromRef.current = sweepFrom; }, [sweepFrom]);
  useEffect(() => { sweepToRef.current = sweepTo; }, [sweepTo]);
  useEffect(() => { sweepSecRef.current = sweepSec; }, [sweepSec]);
  useEffect(() => { sweepLoopRef.current = sweepLoop; }, [sweepLoop]);

  const note = useMemo(() => noteFromFreq(freq), [freq]);

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Number.isFinite(s.freq)) { const v = clamp(s.freq, F_MIN, F_MAX); setFreq(v); freqRef.current = v; }
        if (WAVES.some((w) => w.id === s.wave)) { setWave(s.wave); waveRef.current = s.wave; }
        if (Number.isFinite(s.volume)) { const v = clamp(s.volume, 0, 1); setVolume(v); volumeRef.current = v; }
        if (s.channel === "both" || s.channel === "left" || s.channel === "right") { setChannel(s.channel); channelRef.current = s.channel; }
        if (Number.isFinite(s.sweepFrom)) { const v = clamp(s.sweepFrom, F_MIN, F_MAX); setSweepFrom(v); sweepFromRef.current = v; }
        if (Number.isFinite(s.sweepTo)) { const v = clamp(s.sweepTo, F_MIN, F_MAX); setSweepTo(v); sweepToRef.current = v; }
        if (Number.isFinite(s.sweepSec)) { const v = clamp(s.sweepSec, 0.2, 60); setSweepSec(v); sweepSecRef.current = v; }
        if (typeof s.sweepLoop === "boolean") { setSweepLoop(s.sweepLoop); sweepLoopRef.current = s.sweepLoop; }
      }
    } catch (e) { /* private mode / blocked storage — use defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ freq, wave, volume, channel, sweepFrom, sweepTo, sweepSec, sweepLoop }));
    } catch (e) { /* ignore */ }
  }, [freq, wave, volume, channel, sweepFrom, sweepTo, sweepSec, sweepLoop, loaded]);

  // ---- oscilloscope drawing ----
  const drawScope = useCallback((analyser, canvas, live) => {
    const g = canvas.getContext("2d");
    if (!g) return;
    const w = canvas.width, h = canvas.height, dpr = dprRef.current || 1;
    g.clearRect(0, 0, w, h);
    // centre line
    g.lineWidth = 1 * dpr;
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    if (!live || !analyser || !dataArrayRef.current) return;
    const data = dataArrayRef.current;
    analyser.getByteTimeDomainData(data);
    const n = data.length;
    g.lineWidth = 2 * dpr;
    g.strokeStyle = SCOPE_COLOR;
    g.shadowBlur = 7 * dpr;
    g.shadowColor = SCOPE_COLOR;
    g.beginPath();
    const slice = w / (n - 1);
    for (let i = 0; i < n; i++) {
      const v = data[i] / 128 - 1; // -1..1
      const y = h / 2 + v * (h / 2) * 0.86;
      const x = i * slice;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.shadowBlur = 0;
  }, []);

  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) drawScope(null, canvas, false);
  }, [drawScope]);

  // size the canvas backing store to its box (crisp on HiDPI)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      const rect = canvas.getBoundingClientRect();
      const cw = Math.max(1, Math.round(rect.width * dpr));
      const ch = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      if (!playingRef.current) drawStatic();
    };
    resize();
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
  }, [drawStatic]);

  // ---- audio helpers ----
  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) throw new Error("no-webaudio");
    ctxRef.current = new AC();
    return ctxRef.current;
  }, []);

  const teardownNodes = useCallback(() => {
    const osc = oscRef.current;
    if (osc) { try { osc.onended = null; osc.stop(); } catch (e) {} try { osc.disconnect(); } catch (e) {} }
    try { gainRef.current && gainRef.current.disconnect(); } catch (e) {}
    try { pannerRef.current && pannerRef.current.disconnect(); } catch (e) {}
    try { analyserRef.current && analyserRef.current.disconnect(); } catch (e) {}
    oscRef.current = null; gainRef.current = null; pannerRef.current = null; analyserRef.current = null;
  }, []);

  const startLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const step = () => {
      if (!playingRef.current) return;
      stepRef.current();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const panFor = (c) => (c === "left" ? -1 : c === "right" ? 1 : 0);

  const start = useCallback(async () => {
    let ctx;
    try { ctx = ensureCtx(); }
    catch (e) { setError("Your browser doesn't support the Web Audio API, so tones can't be generated here."); return; }
    setError(null);
    try { if (ctx.state === "suspended") await ctx.resume(); } catch (e) {}

    teardownNodes();

    const osc = ctx.createOscillator();
    osc.type = waveRef.current;
    osc.frequency.setValueAtTime(clamp(freqRef.current, F_MIN, F_MAX), ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volumeRef.current, ctx.currentTime + 0.02); // click-free attack

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    dataArrayRef.current = new Uint8Array(analyser.fftSize);

    osc.connect(analyser); // visualization tap (constant amplitude)
    osc.connect(gain);

    let panner = null;
    if (typeof ctx.createStereoPanner === "function") {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panFor(channelRef.current), ctx.currentTime);
      gain.connect(panner);
      panner.connect(ctx.destination);
      setNoPan(false);
    } else {
      gain.connect(ctx.destination); // no channel isolation on very old browsers
      setNoPan(true);
    }

    try { osc.start(); } catch (e) {}

    oscRef.current = osc;
    gainRef.current = gain;
    pannerRef.current = panner;
    analyserRef.current = analyser;
    playingRef.current = true;
    setPlaying(true);
    startLoop();
  }, [ensureCtx, teardownNodes, startLoop]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sweepStateRef.current = null;
    sweepingRef.current = false; setSweeping(false);
    playingRef.current = false; setPlaying(false);

    const ctx = ctxRef.current, gain = gainRef.current, osc = oscRef.current;
    const panner = pannerRef.current, analyser = analyserRef.current;
    oscRef.current = null; gainRef.current = null; pannerRef.current = null; analyserRef.current = null;

    if (ctx && gain && osc) {
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.03); // click-free release
        osc.stop(now + 0.06);
        osc.onended = () => {
          try { osc.disconnect(); } catch (e) {}
          try { gain.disconnect(); } catch (e) {}
          try { panner && panner.disconnect(); } catch (e) {}
          try { analyser && analyser.disconnect(); } catch (e) {}
        };
      } catch (e) {
        try { osc.stop(); } catch (e2) {}
        try { osc.disconnect(); gain.disconnect(); } catch (e2) {}
      }
    }
    drawStatic();
  }, [drawStatic]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) stop();
    else start();
  }, [start, stop]);

  // ---- live parameter changes ----
  const setFrequency = useCallback((f) => {
    const v = clamp(f, F_MIN, F_MAX);
    setFreq(v); freqRef.current = v;
    const osc = oscRef.current, ctx = ctxRef.current;
    if (osc && ctx) {
      try {
        osc.frequency.cancelScheduledValues(ctx.currentTime);
        osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.01); // tiny glide, no zipper
      } catch (e) { try { osc.frequency.value = v; } catch (e2) {} }
    }
  }, []);

  const changeWave = useCallback((w) => {
    setWave(w); waveRef.current = w;
    const osc = oscRef.current;
    if (osc) { try { osc.type = w; } catch (e) {} }
  }, []);

  const changeVolume = useCallback((v) => {
    const val = clamp(v, 0, 1);
    setVolume(val); volumeRef.current = val;
    const gain = gainRef.current, ctx = ctxRef.current;
    if (gain && ctx && playingRef.current) {
      try { gain.gain.setTargetAtTime(val, ctx.currentTime, 0.02); } catch (e) { try { gain.gain.value = val; } catch (e2) {} }
    }
  }, []);

  const changeChannel = useCallback((c) => {
    setChannel(c); channelRef.current = c;
    const panner = pannerRef.current, ctx = ctxRef.current;
    if (panner && ctx) {
      try { panner.pan.setTargetAtTime(panFor(c), ctx.currentTime, 0.02); } catch (e) { try { panner.pan.value = panFor(c); } catch (e2) {} }
    }
  }, []);

  // ---- sweep ----
  const scheduleSweep = useCallback((from, to, dur) => {
    const ctx = ctxRef.current, osc = oscRef.current;
    if (!ctx || !osc) return;
    const a = clamp(from, F_MIN, F_MAX), b = clamp(to, F_MIN, F_MAX);
    const now = ctx.currentTime;
    try {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(a, now);
      osc.frequency.exponentialRampToValueAtTime(b, now + dur);
    } catch (e) {}
    sweepStateRef.current = { from: a, to: b, dur, start: now, loop: sweepLoopRef.current };
  }, []);

  const startSweep = useCallback(async () => {
    if (!playingRef.current) await start();
    if (!oscRef.current) return;
    sweepingRef.current = true; setSweeping(true);
    const dur = clamp(sweepSecRef.current, 0.2, 60);
    scheduleSweep(sweepFromRef.current, sweepToRef.current, dur);
  }, [start, scheduleSweep]);

  const stopSweep = useCallback(() => {
    sweepStateRef.current = null;
    sweepingRef.current = false; setSweeping(false);
    const v = clamp(freqRef.current, F_MIN, F_MAX);
    setFreq(v); freqRef.current = v;
    const ctx = ctxRef.current, osc = oscRef.current;
    if (ctx && osc) {
      try { osc.frequency.cancelScheduledValues(ctx.currentTime); osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.01); } catch (e) {}
    }
  }, []);

  const toggleSweep = useCallback(() => {
    if (sweepingRef.current) stopSweep();
    else startSweep();
  }, [startSweep, stopSweep]);

  // Per-frame work (sweep advance + scope draw). Kept in a ref so the rAF loop
  // always sees the latest closure without being restarted.
  stepRef.current = () => {
    const ctx = ctxRef.current;
    const ss = sweepStateRef.current;
    if (ss && ctx) {
      const t = (ctx.currentTime - ss.start) / ss.dur;
      if (t >= 1) {
        if (sweepLoopRef.current) {
          scheduleSweep(ss.to, ss.from, ss.dur); // ping-pong
          freqRef.current = ss.to; setFreq(ss.to);
        } else {
          sweepStateRef.current = null;
          sweepingRef.current = false; setSweeping(false);
          const v = clamp(ss.to, F_MIN, F_MAX);
          freqRef.current = v; setFreq(v);
        }
      } else {
        const tc = t < 0 ? 0 : t;
        const f = ss.from * Math.pow(ss.to / ss.from, tc);
        freqRef.current = f;
        const now = performance.now();
        if (now - lastPushRef.current > 55) { lastPushRef.current = now; setFreq(f); } // throttle readout re-renders
      }
    }
    const canvas = canvasRef.current;
    if (canvas) drawScope(analyserRef.current, canvas, true);
  };

  // Space toggles play/stop unless the user is typing in a field.
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // ---- teardown ----
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    teardownNodes();
    try { if (ctxRef.current) ctxRef.current.close(); } catch (e) {}
    ctxRef.current = null;
  }, [teardownNodes]);

  const centsLabel = note ? `${note.cents > 0 ? "+" : ""}${note.cents}¢` : "";
  const inTune = note && Math.abs(note.cents) <= 3;
  const activeWave = WAVES.find((w) => w.id === wave) || WAVES[0];
  const roundedFreq = Math.round(freq);

  return (
    <div className={playing ? "tool tg is-playing" : "tool tg"}>
      <style>{`
        .tg .tg-error{background:#fdecec;border:1px solid #f3b4b4;color:#8a1f1f;border-radius:10px;padding:11px 13px;
          font-size:13.5px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;}
        .tg .tg-scope{position:relative;background:#0b0d12;border:1px solid #232838;border-radius:14px;padding:16px 16px 12px;
          --tg:${SCOPE_COLOR};}
        .tg .tg-readout{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:10px;}
        .tg .tg-hz{color:#fff;font-variant-numeric:tabular-nums;line-height:1;display:flex;align-items:baseline;gap:8px;}
        .tg .tg-hz-num{font-size:clamp(38px,9vw,58px);font-weight:800;letter-spacing:-.02em;}
        .tg .tg-hz-unit{font-size:18px;font-weight:600;color:#aeb6c6;}
        .tg .tg-note{text-align:right;color:#e7ecf5;}
        .tg .tg-note-name{font-size:24px;font-weight:800;letter-spacing:.3px;}
        .tg .tg-cents{display:block;font-size:12.5px;font-weight:600;color:#9aa6bd;margin-top:2px;}
        .tg .tg-cents.in-tune{color:${SCOPE_COLOR};}
        .tg .tg-canvas{display:block;width:100%;height:120px;border-radius:9px;background:#070910;
          border:1px solid #1b2130;}
        .tg .tg-scope-foot{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:10px;color:#8b94a8;font-size:12.5px;font-weight:600;}
        .tg .tg-scope-foot span{display:inline-flex;align-items:center;gap:6px;}
        .tg .tg-live-dot{width:8px;height:8px;border-radius:50%;background:${SCOPE_COLOR};box-shadow:0 0 8px 1px ${SCOPE_COLOR};}
        .tg.is-playing .tg-live-dot{animation:tg-pulse 1.4s ease-in-out infinite;}
        @keyframes tg-pulse{0%,100%{opacity:1;}50%{opacity:.35;}}

        .tg .tg-block{margin-top:16px;}
        .tg .tg-block-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}
        .tg .tg-block-head label,.tg .tg-block-head>span:first-child{font-size:13px;font-weight:640;color:var(--muted,#6a6862);}
        .tg .tg-hint{font-size:12px;color:var(--faint,#6f6c64);font-variant-numeric:tabular-nums;}
        .tg .tg-hint2{font-size:12.5px;color:var(--faint,#6f6c64);margin:10px 0 0;line-height:1.45;}

        .tg .tg-freqrow{display:flex;align-items:center;gap:12px;}
        .tg .tg-freqrow input[type=range]{flex:1;min-width:0;accent-color:${SCOPE_COLOR};}
        .tg .tg-numwrap{display:inline-flex;align-items:center;gap:5px;flex:none;}
        .tg .tg-numwrap input{width:82px;padding:8px 9px;border-radius:9px;border:1.5px solid var(--border-strong,#d6d2c8);
          background:var(--surface,#fff);color:inherit;font:inherit;font-size:14px;font-variant-numeric:tabular-nums;text-align:right;}
        .tg .tg-numwrap input:focus{outline:none;border-color:var(--text,#14130f);}
        .tg .tg-numwrap span{font-size:12.5px;color:var(--muted,#6a6862);font-weight:600;}
        .tg input[type=range]:disabled{opacity:.5;cursor:not-allowed;}
        .tg input:disabled{opacity:.5;cursor:not-allowed;}

        .tg .tg-presets{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;}
        .tg .tg-chip{padding:6px 11px;border-radius:999px;border:1.5px solid var(--border,#e6e3dc);background:var(--surface,#fff);
          cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:inherit;transition:border-color .14s,background .14s;
          font-variant-numeric:tabular-nums;}
        .tg .tg-chip:hover:not(:disabled){border-color:#9aa3b2;}
        .tg .tg-chip[aria-pressed="true"]{border-color:${SCOPE_COLOR};background:color-mix(in srgb,${SCOPE_COLOR} 15%,transparent);}
        .tg .tg-chip:disabled{opacity:.5;cursor:not-allowed;}

        .tg .tg-waves{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .tg .tg-wave{display:flex;flex-direction:column;align-items:center;gap:6px;padding:11px 6px;border-radius:11px;
          border:1.5px solid var(--border,#e6e3dc);background:var(--surface,#fff);cursor:pointer;color:inherit;font:inherit;
          transition:border-color .14s,box-shadow .14s;}
        .tg .tg-wave:hover{border-color:#9aa3b2;}
        .tg .tg-wave svg{width:34px;height:20px;color:var(--muted,#6a6862);}
        .tg .tg-wave span{font-size:12px;font-weight:600;}
        .tg .tg-wave[aria-pressed="true"]{border-color:${SCOPE_COLOR};box-shadow:0 0 0 3px color-mix(in srgb,${SCOPE_COLOR} 26%,transparent);}
        .tg .tg-wave[aria-pressed="true"] svg{color:${SCOPE_COLOR};}

        .tg .tg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;align-items:start;}
        .tg .tg-range{width:100%;accent-color:${SCOPE_COLOR};}
        .tg .tg-caution{margin:9px 0 0;font-size:12px;font-weight:600;color:#a4560b;line-height:1.4;}

        .tg .tg-seg{display:flex;border:1.5px solid var(--border-strong,#d6d2c8);border-radius:9px;overflow:hidden;}
        .tg .tg-seg button{flex:1;padding:9px 6px;background:var(--surface,#fff);border:none;border-right:1px solid var(--border,#e6e3dc);
          color:inherit;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .12s;}
        .tg .tg-seg button:last-child{border-right:none;}
        .tg .tg-seg button:hover:not(:disabled):not([aria-pressed="true"]){background:var(--surface-2,#fbfaf8);}
        .tg .tg-seg button[aria-pressed="true"]{background:${SCOPE_COLOR};color:#04222e;}
        .tg .tg-seg button:disabled{opacity:.45;cursor:not-allowed;}

        .tg .tg-sweep{border:1.5px solid var(--border,#e6e3dc);border-radius:13px;padding:14px 15px;background:var(--surface-2,#fbfaf8);}
        .tg .tg-check{display:inline-flex;gap:7px;align-items:center;font-size:13px;font-weight:600;cursor:pointer;color:var(--muted,#6a6862);}
        .tg .tg-check input{accent-color:${SCOPE_COLOR};}
        .tg .tg-sweeprow{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;}
        .tg .tg-field{display:flex;flex-direction:column;gap:5px;}
        .tg .tg-field label{font-size:12px;font-weight:600;color:var(--faint,#6f6c64);}
        .tg .tg-sweeprow .btn{margin-left:auto;}

        @media (prefers-color-scheme:dark){
          .tg .tg-error{background:#3a1414;border-color:#7a2b2b;color:#f4c9c9;}
          .tg .tg-caution{color:#f0b366;}
          .tg .tg-seg button[aria-pressed="true"]{color:#04222e;}
        }
        @media (prefers-reduced-motion:reduce){
          .tg.is-playing .tg-live-dot{animation:none;}
        }
        @media (max-width:560px){
          .tg .tg-grid2{grid-template-columns:1fr;}
          .tg .tg-waves{grid-template-columns:repeat(2,1fr);}
          .tg .tg-sweeprow .btn{margin-left:0;width:100%;}
        }
      `}</style>

      {error && (
        <div className="tg-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn" onClick={() => { setError(null); start(); }}>Try again</button>
        </div>
      )}

      <div className="tg-scope">
        <div className="tg-readout" role="status" aria-live="polite">
          <div className="tg-hz">
            <span className="tg-hz-num">{fmtHz(freq)}</span>
            <span className="tg-hz-unit">Hz</span>
          </div>
          <div className="tg-note">
            <span className="tg-note-name">{note ? note.name : "—"}</span>
            {note && <span className={inTune ? "tg-cents in-tune" : "tg-cents"}>{inTune ? "in tune" : `${centsLabel} · nearest note`}</span>}
          </div>
        </div>
        <canvas ref={canvasRef} className="tg-canvas" aria-hidden="true" />
        <div className="tg-scope-foot">
          <span>{playing && <span className="tg-live-dot" aria-hidden="true" />}{playing ? (sweeping ? "Sweeping" : "Playing") : "Stopped"}</span>
          <span>{activeWave.name} wave</span>
          <span>{channel === "both" ? "Both channels" : channel === "left" ? "Left channel only" : "Right channel only"}</span>
        </div>
      </div>

      <div className="tool-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-primary" onClick={togglePlay} aria-pressed={playing}>
          {playing ? "Stop" : "Play tone"}
        </button>
        <button type="button" className="btn" onClick={toggleSweep} aria-pressed={sweeping}>
          {sweeping ? "Stop sweep" : "Start sweep"}
        </button>
      </div>

      <div className="tg-block">
        <div className="tg-block-head">
          <label htmlFor="tg-freq">Frequency</label>
          <span className="tg-hint">20 Hz – 20 kHz</span>
        </div>
        <div className="tg-freqrow">
          <input
            id="tg-freq"
            type="range"
            min={0}
            max={S_MAX}
            step={1}
            value={freqToSlider(freq)}
            onChange={(e) => setFrequency(Math.round(sliderToFreq(Number(e.target.value))))}
            disabled={sweeping}
            aria-label="Frequency (logarithmic slider)"
          />
          <span className="tg-numwrap">
            <input
              type="number"
              min={F_MIN}
              max={F_MAX}
              step={1}
              inputMode="numeric"
              value={roundedFreq}
              onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) setFrequency(n); }}
              disabled={sweeping}
              aria-label="Frequency in hertz"
            />
            <span>Hz</span>
          </span>
        </div>
        <div className="tg-presets" role="group" aria-label="Frequency presets">
          {PRESETS.map((p) => (
            <button
              key={p.hz}
              type="button"
              className="tg-chip"
              aria-pressed={roundedFreq === p.hz}
              onClick={() => setFrequency(p.hz)}
              disabled={sweeping}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tg-block">
        <div className="tg-block-head"><span>Waveform</span></div>
        <div className="tg-waves" role="group" aria-label="Waveform">
          {WAVES.map((w) => (
            <button
              key={w.id}
              type="button"
              className="tg-wave"
              aria-pressed={wave === w.id}
              onClick={() => changeWave(w.id)}
            >
              <svg viewBox="0 0 26 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                <path d={w.d} />
              </svg>
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tg-grid2">
        <div className="tg-block" style={{ marginTop: 0 }}>
          <div className="tg-block-head">
            <label htmlFor="tg-vol">Volume</label>
            <span className="tg-hint">{Math.round(volume * 100)}%</span>
          </div>
          <input
            id="tg-vol"
            type="range"
            className="tg-range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume"
          />
          {volume >= 0.6 && <p className="tg-caution">High volume — turn it down to protect your hearing and speakers, especially at high frequencies.</p>}
        </div>

        <div className="tg-block" style={{ marginTop: 0 }}>
          <div className="tg-block-head">
            <span>Channel</span>
            {noPan && <span className="tg-hint">L/R not supported</span>}
          </div>
          <div className="tg-seg" role="group" aria-label="Output channel">
            <button type="button" aria-pressed={channel === "both"} onClick={() => changeChannel("both")}>Both</button>
            <button type="button" aria-pressed={channel === "left"} onClick={() => changeChannel("left")} disabled={noPan}>Left</button>
            <button type="button" aria-pressed={channel === "right"} onClick={() => changeChannel("right")} disabled={noPan}>Right</button>
          </div>
        </div>
      </div>

      <div className="tg-block tg-sweep">
        <div className="tg-block-head">
          <span>Frequency sweep</span>
          <label className="tg-check">
            <input type="checkbox" checked={sweepLoop} onChange={(e) => setSweepLoop(e.target.checked)} /> Loop (ping-pong)
          </label>
        </div>
        <div className="tg-sweeprow">
          <div className="tg-field">
            <label htmlFor="tg-from">From</label>
            <span className="tg-numwrap">
              <input id="tg-from" type="number" min={F_MIN} max={F_MAX} step={1} inputMode="numeric"
                value={sweepFrom}
                onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) setSweepFrom(clamp(n, F_MIN, F_MAX)); }}
                aria-label="Sweep start frequency in hertz" />
              <span>Hz</span>
            </span>
          </div>
          <div className="tg-field">
            <label htmlFor="tg-to">To</label>
            <span className="tg-numwrap">
              <input id="tg-to" type="number" min={F_MIN} max={F_MAX} step={1} inputMode="numeric"
                value={sweepTo}
                onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) setSweepTo(clamp(n, F_MIN, F_MAX)); }}
                aria-label="Sweep end frequency in hertz" />
              <span>Hz</span>
            </span>
          </div>
          <div className="tg-field">
            <label htmlFor="tg-sec">Time</label>
            <span className="tg-numwrap">
              <input id="tg-sec" type="number" min={0.2} max={60} step={0.1} inputMode="decimal"
                value={sweepSec}
                onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) setSweepSec(clamp(n, 0.2, 60)); }}
                aria-label="Sweep duration in seconds" />
              <span>s</span>
            </span>
          </div>
          <button type="button" className="btn" onClick={toggleSweep} aria-pressed={sweeping}>
            {sweeping ? "Stop sweep" : "Sweep"}
          </button>
        </div>
        <p className="tg-hint2">
          Glide smoothly from one frequency to another — handy for finding speaker rattles, room resonances, or the
          upper edge of your hearing. Turn on Loop to sweep back and forth continuously.
        </p>
      </div>

      <p className="tool-note" style={{ marginTop: 16 }}>
        <strong>Keep the volume low</strong> and ease it up only if you need to — sustained or high-frequency test tones
        can damage hearing and speakers. Press <strong>Play</strong> (or the space bar) to start. Everything is
        synthesised in your browser with the Web Audio API — nothing is recorded or uploaded, and your settings are
        remembered on this device.
      </p>
    </div>
  );
}
