"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// A precise, fully client-side metronome. Nothing is uploaded and no library is
// used: clicks are generated with the Web Audio API and scheduled with a
// lookahead scheduler ("A Tale of Two Clocks"). A ~25ms setInterval wakes up and
// schedules every click that falls inside the next ~100ms window against
// AudioContext.currentTime, so the timing is sample-accurate and never drifts the
// way a bare setInterval would. A separate requestAnimationFrame loop reads the
// same clock to move the visual beat indicator in sync with what you hear.

const LS_KEY = "ebt-metronome";
const LOOKAHEAD = 25;          // ms — how often the scheduler runs
const SCHEDULE_AHEAD = 0.1;    // s  — how far ahead we schedule audio

const MIN_BPM = 30;
const MAX_BPM = 300;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function tempoName(bpm) {
  if (bpm < 40) return "Grave";
  if (bpm < 60) return "Largo";
  if (bpm < 66) return "Larghetto";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 168) return "Allegro";
  if (bpm < 200) return "Vivace";
  return "Presto";
}

export default function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [beats, setBeats] = useState(4);           // beats per measure (1-12)
  const [volume, setVolume] = useState(0.8);        // 0..1
  const [subdivision, setSubdivision] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [beatState, setBeatState] = useState({ beat: -1, tick: 0 });
  const [tapPulse, setTapPulse] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // --- audio graph + scheduler state (refs so the interval reads live values) ---
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const timerRef = useRef(null);        // setInterval id (the scheduler)
  const rafRef = useRef(0);             // requestAnimationFrame id (the draw loop)
  const nextTickRef = useRef(0);        // AudioContext time of the next click
  const beatRef = useRef(0);            // beat index (0-based) of the next MAIN click
  const subRef = useRef(0);             // 0 = on the beat, 1 = the "and" (subdivision)
  const mainTickRef = useRef(0);        // monotonic counter of main beats scheduled
  const queueRef = useRef([]);          // [{ beat, time, tick }] for the visual loop
  const drawnTickRef = useRef(-1);

  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);
  const subdivisionRef = useRef(subdivision);
  const volumeRef = useRef(volume);
  const playingRef = useRef(false);
  const toggleRef = useRef(() => {});
  const tapTimesRef = useRef([]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { beatsRef.current = beats; }, [beats]);
  useEffect(() => { subdivisionRef.current = subdivision; subRef.current = 0; }, [subdivision]);

  // keep the live output gain in sync with the volume slider while playing
  useEffect(() => {
    volumeRef.current = volume;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      try { master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01); }
      catch (e) { master.gain.value = volume; }
    }
  }, [volume]);

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Number.isFinite(s.bpm)) setBpm(clamp(Math.round(s.bpm), MIN_BPM, MAX_BPM));
        if (Number.isFinite(s.beats)) setBeats(clamp(Math.round(s.beats), 1, 12));
        if (Number.isFinite(s.volume)) setVolume(clamp(s.volume, 0, 1));
        if (typeof s.subdivision === "boolean") setSubdivision(s.subdivision);
      }
    } catch (e) { /* private mode / blocked storage — use defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ bpm, beats, volume, subdivision }));
    } catch (e) { /* ignore */ }
  }, [bpm, beats, volume, subdivision, loaded]);

  // ---- one click = a short oscillator burst with a fast decay ----
  const playClick = useCallback((time, freq, amp) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(Math.max(amp, 0.0002), time + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    osc.connect(env);
    env.connect(master);
    osc.start(time);
    osc.stop(time + 0.03);
  }, []);

  // schedule a single tick and advance the beat/subdivision counters
  const scheduleTick = useCallback((time) => {
    const onBeat = subRef.current === 0;
    if (onBeat) {
      const isDownbeat = beatRef.current === 0;
      // accent the downbeat: higher pitch + louder
      playClick(time, isDownbeat ? 1600 : 1000, isDownbeat ? 1.0 : 0.55);
      queueRef.current.push({ beat: beatRef.current, time, tick: mainTickRef.current });
      mainTickRef.current += 1;
    } else {
      // subdivision ("and") — softer and lower so it sits under the beat
      playClick(time, 820, 0.28);
    }

    const secondsPerBeat = 60 / bpmRef.current;
    if (subdivisionRef.current) {
      nextTickRef.current += secondsPerBeat / 2;
      if (subRef.current === 0) {
        subRef.current = 1;
      } else {
        subRef.current = 0;
        beatRef.current = (beatRef.current + 1) % Math.max(1, beatsRef.current);
      }
    } else {
      nextTickRef.current += secondsPerBeat;
      subRef.current = 0;
      beatRef.current = (beatRef.current + 1) % Math.max(1, beatsRef.current);
    }
  }, [playClick]);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    while (nextTickRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleTick(nextTickRef.current);
    }
  }, [scheduleTick]);

  // draw loop — move the highlighted dot exactly when its click is heard
  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const q = queueRef.current;
    let cur = null;
    while (q.length && q[0].time <= now) {
      cur = q.shift();
    }
    if (cur && cur.tick !== drawnTickRef.current) {
      drawnTickRef.current = cur.tick;
      setBeatState({ beat: cur.beat, tick: cur.tick });
    }
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    cancelAnimationFrame(rafRef.current);
    queueRef.current = [];
    drawnTickRef.current = -1;
    setBeatState({ beat: -1, tick: 0 });
  }, []);

  const start = useCallback(async () => {
    // Create/resume the AudioContext on this user gesture (autoplay policy).
    if (!ctxRef.current) {
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AC) { setAudioError(true); return; }
      try {
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = volumeRef.current;
        master.connect(ctx.destination);
        ctxRef.current = ctx;
        masterRef.current = master;
      } catch (e) { setAudioError(true); return; }
    }
    try {
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    } catch (e) { /* some browsers reject resume without a gesture — start anyway */ }

    // reset the schedule
    beatRef.current = 0;
    subRef.current = 0;
    mainTickRef.current = 0;
    queueRef.current = [];
    drawnTickRef.current = -1;
    setBeatState({ beat: -1, tick: 0 });
    nextTickRef.current = ctxRef.current.currentTime + 0.06;

    playingRef.current = true;
    setPlaying(true);
    setAudioError(false);
    timerRef.current = setInterval(scheduler, LOOKAHEAD);
    rafRef.current = requestAnimationFrame(draw);
  }, [scheduler, draw]);

  const toggle = useCallback(() => {
    if (playingRef.current) stop(); else start();
  }, [start, stop]);
  useEffect(() => { toggleRef.current = toggle; }, [toggle]);

  const adjustBpm = useCallback((delta) => {
    setBpm((b) => clamp(b + delta, MIN_BPM, MAX_BPM));
  }, []);

  // ---- tap tempo ----
  const handleTap = useCallback(() => {
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    const arr = tapTimesRef.current;
    // reset the running average if it has been a while since the last tap
    if (arr.length && now - arr[arr.length - 1] > 2000) arr.length = 0;
    arr.push(now);
    if (arr.length > 6) arr.shift();
    if (arr.length >= 2) {
      let total = 0;
      for (let i = 1; i < arr.length; i++) total += arr[i] - arr[i - 1];
      const avg = total / (arr.length - 1);
      if (avg > 0) setBpm(clamp(Math.round(60000 / avg), MIN_BPM, MAX_BPM));
    }
    setTapPulse((p) => p + 1);
  }, []);

  // ---- keyboard: space toggles; arrows nudge tempo (never inside a control) ----
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      if (e.code === "Space") { e.preventDefault(); toggleRef.current(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); adjustBpm(1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); adjustBpm(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); adjustBpm(5); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); adjustBpm(-5); }
      else if (e.key === "t" || e.key === "T") { handleTap(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjustBpm, handleTap]);

  // ---- cleanup everything on unmount ----
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    try { if (ctxRef.current) ctxRef.current.close(); } catch (e) { /* ignore */ }
  }, []);

  const dots = Array.from({ length: clamp(beats, 1, 12) }, (_, i) => i);
  const activeBeat = playing ? beatState.beat : -1;

  return (
    <div className="tool met">
      <style>{`
        .met .met-stage{background:#0b0d12;border:1px solid #232838;border-radius:14px;
          padding:26px 20px 24px;text-align:center;position:relative;overflow:hidden;}
        .met .met-flash{position:absolute;inset:0;pointer-events:none;
          background:radial-gradient(circle at 50% 42%,rgba(93,150,255,.22),rgba(93,150,255,0) 60%);
          opacity:0;animation:met-pop .18s ease-out;}
        @keyframes met-pop{from{opacity:.9}to{opacity:0}}
        .met .met-bpm{position:relative;z-index:1;font-variant-numeric:tabular-nums;
          font-weight:800;color:#fff;font-size:clamp(64px,16vw,108px);line-height:1;
          letter-spacing:-1px;font-family:'Segoe UI',system-ui,sans-serif;}
        .met .met-bpm small{display:block;font-size:15px;font-weight:600;letter-spacing:.14em;
          text-transform:uppercase;color:#7f8aa3;margin-top:6px;}
        .met .met-tempo{position:relative;z-index:1;color:#9aa6c4;font-size:14px;
          font-weight:600;margin-top:2px;min-height:18px;}
        .met .met-dots{position:relative;z-index:1;display:flex;gap:10px;flex-wrap:wrap;
          justify-content:center;margin:20px auto 4px;max-width:420px;}
        .met .met-dot{width:22px;height:22px;border-radius:50%;background:#1c2231;
          border:2px solid #313a52;transition:transform .08s ease-out,background .08s ease-out,
          border-color .08s ease-out,box-shadow .08s ease-out;}
        .met .met-dot.downbeat{border-color:#5a4a2a;}
        .met .met-dot.on{background:#5d96ff;border-color:#5d96ff;transform:scale(1.32);
          box-shadow:0 0 16px rgba(93,150,255,.7);}
        .met .met-dot.downbeat.on{background:#f5a623;border-color:#f5a623;
          box-shadow:0 0 18px rgba(245,166,35,.75);}
        .met .met-controls{display:flex;flex-direction:column;gap:16px;margin-top:16px;}
        .met .met-tempo-row{display:flex;align-items:center;gap:10px;justify-content:center;
          flex-wrap:wrap;}
        .met .met-round{width:44px;height:44px;min-height:44px;border-radius:50%;padding:0;
          font-size:22px;font-weight:700;line-height:1;display:inline-flex;align-items:center;
          justify-content:center;}
        .met .met-slider{display:flex;flex-direction:column;gap:6px;}
        .met .met-slider label{font-size:13px;font-weight:600;opacity:.85;
          display:flex;justify-content:space-between;gap:12px;}
        .met .met-slider input[type=range]{width:100%;accent-color:#5d96ff;}
        .met .met-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
          gap:16px;}
        .met .met-field{display:flex;flex-direction:column;gap:6px;}
        .met .met-field label{font-size:13px;font-weight:600;opacity:.85;}
        .met .met-field select{padding:9px 10px;border-radius:10px;border:1px solid var(--border-strong);
          background:var(--surface);color:var(--text);font-size:14px;font-weight:600;}
        .met .met-check{display:flex;gap:8px;align-items:center;font-size:14px;cursor:pointer;
          user-select:none;}
        .met .met-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
        .met .met-actions .btn{min-width:118px;justify-content:center;}
        .met .met-err{margin-top:12px;padding:12px 14px;border-radius:10px;
          border:1px solid var(--border-strong);background:var(--surface-2);font-size:14px;}
        .met kbd{font:inherit;font-size:.85em;background:var(--surface-2);
          border:1px solid var(--border);border-radius:4px;padding:1px 5px;}
        @media (prefers-reduced-motion: reduce){
          .met .met-flash{animation:none;}
          .met .met-dot{transition:background .08s linear,border-color .08s linear;}
          .met .met-dot.on{transform:none;}
        }
      `}</style>

      <div className="met-stage" aria-hidden="false">
        <div className="met-flash" key={beatState.tick} aria-hidden="true" />
        <div className="met-bpm" role="status" aria-live="off">
          {bpm}
          <small>beats per minute</small>
        </div>
        <div className="met-tempo">{tempoName(bpm)} · {beats}/4{subdivision ? " · eighths" : ""}</div>
        <div className="met-dots" role="img" aria-label={`${beats} beat measure, beat ${activeBeat >= 0 ? activeBeat + 1 : "stopped"}`}>
          {dots.map((i) => (
            <span
              key={i}
              className={"met-dot" + (i === 0 ? " downbeat" : "") + (i === activeBeat ? " on" : "")}
            />
          ))}
        </div>
      </div>

      <div className="met-controls">
        <div className="met-actions" style={{ justifyContent: "center", marginTop: 4 }}>
          <button type="button" className="btn btn-primary" onClick={toggle} aria-pressed={playing}>
            {playing ? "Stop" : "Start"}
          </button>
          <button type="button" className="btn" onClick={handleTap}>
            Tap tempo{tapPulse > 0 ? " ·" : ""}
          </button>
        </div>

        <div className="met-tempo-row" aria-hidden="false">
          <button type="button" className="btn met-round" onClick={() => adjustBpm(-1)} aria-label="Decrease tempo by 1 BPM">−</button>
          <div className="met-slider" style={{ flex: 1, minWidth: 180, maxWidth: 420 }}>
            <label htmlFor="met-bpm">
              <span>Tempo</span><span>{bpm} BPM</span>
            </label>
            <input
              id="met-bpm"
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(clamp(Number(e.target.value), MIN_BPM, MAX_BPM))}
            />
          </div>
          <button type="button" className="btn met-round" onClick={() => adjustBpm(1)} aria-label="Increase tempo by 1 BPM">+</button>
        </div>

        <div className="met-grid">
          <div className="met-field">
            <label htmlFor="met-beats">Time signature (beats per measure)</label>
            <select
              id="met-beats"
              value={beats}
              onChange={(e) => setBeats(clamp(Number(e.target.value), 1, 12))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} / 4</option>
              ))}
            </select>
          </div>

          <div className="met-field met-slider">
            <label htmlFor="met-vol">
              <span>Volume</span><span>{Math.round(volume * 100)}%</span>
            </label>
            <input
              id="met-vol"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(clamp(Number(e.target.value) / 100, 0, 1))}
            />
          </div>

          <div className="met-field" style={{ justifyContent: "flex-end" }}>
            <label className="met-check" htmlFor="met-sub">
              <input
                id="met-sub"
                type="checkbox"
                checked={subdivision}
                onChange={(e) => setSubdivision(e.target.checked)}
              />
              Eighth-note subdivision
            </label>
            <span className="tool-note" style={{ margin: 0 }}>
              Adds a softer click on every off-beat “and”.
            </span>
          </div>
        </div>
      </div>

      {audioError && (
        <div className="met-err" role="alert">
          This browser blocked audio playback. Make sure your device is not muted, then
          press <strong>Start</strong> again to allow sound.
        </div>
      )}

      <p className="tool-note" style={{ marginTop: 14 }}>
        Shortcuts: <kbd>Space</kbd> start/stop · <kbd>↑</kbd>/<kbd>↓</kbd> nudge BPM ·
        {" "}<kbd>←</kbd>/<kbd>→</kbd> ±5 BPM · <kbd>T</kbd> tap tempo. The click is generated
        live in your browser with the Web Audio API — nothing is recorded or uploaded, and your
        tempo, time signature and volume are saved only on this device.
      </p>
    </div>
  );
}
