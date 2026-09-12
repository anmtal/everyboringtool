"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Everything runs in this browser: the mic stream is fed through a Web Audio
// AnalyserNode and the fundamental frequency is found with time-domain
// autocorrelation. Nothing is uploaded and no audio is recorded — the samples
// live only inside the AudioContext for as long as the tuner is running.

const LS_KEY = "ebt-guitar-tuner";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Standard tuning, low to high, stored as MIDI note numbers so the target
// frequency tracks whatever reference pitch (A4) the user picks.
const STRINGS = [
  { label: "E", name: "E2", midi: 40 },
  { label: "A", name: "A2", midi: 45 },
  { label: "D", name: "D3", midi: 50 },
  { label: "G", name: "G3", midi: 55 },
  { label: "B", name: "B3", midi: 59 },
  { label: "e", name: "E4", midi: 64 },
];

const RMS_THRESHOLD = 0.01; // ignore near-silent frames so the needle doesn't jitter

const midiToFreq = (m, a4) => a4 * Math.pow(2, (m - 69) / 12);

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Normalized autocorrelation (ACF). Returns the detected frequency in Hz, or -1
// when the frame is too quiet / no clear pitch is present. Based on the widely
// used time-domain approach: trim near-silence, correlate at every lag, take the
// first peak after the initial dip, then refine it with parabolic interpolation.
function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const v = buf[i];
    rms += v * v;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_THRESHOLD) return -1;

  // Trim quiet head/tail so the correlation locks onto the sustained tone.
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const trimmed = buf.subarray(r1, r2);
  const N = trimmed.length;
  if (N < 256) return -1;

  const c = new Float32Array(N);
  for (let lag = 0; lag < N; lag++) {
    let sum = 0;
    for (let i = 0; i < N - lag; i++) sum += trimmed[i] * trimmed[i + lag];
    c[lag] = sum;
  }

  // Walk past the first dip, then find the highest peak (the fundamental period).
  let d = 0;
  while (d < N - 1 && c[d] > c[d + 1]) d++;

  let maxval = -Infinity;
  let maxpos = -1;
  for (let i = d; i < N; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return -1;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  let T0 = maxpos;
  const x1 = maxpos > 0 ? c[maxpos - 1] : c[maxpos];
  const x2 = c[maxpos];
  const x3 = maxpos < N - 1 ? c[maxpos + 1] : c[maxpos];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = maxpos - b / (2 * a);

  const freq = sampleRate / T0;
  if (freq < 55 || freq > 1600) return -1; // outside a guitar's useful range
  return freq;
}

// Turn a measured frequency into a display reading for the active mode.
function computeReading(freq, mode, a4) {
  const noteNum = 12 * Math.log2(freq / a4) + 69;
  const midi = Math.round(noteNum);
  const chromName = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;

  if (mode === "guitar") {
    // Snap to the nearest of the six standard-tuning strings.
    let idx = 0;
    let bestAbs = Infinity;
    for (let i = 0; i < STRINGS.length; i++) {
      const cents = Math.abs(1200 * Math.log2(freq / midiToFreq(STRINGS[i].midi, a4)));
      if (cents < bestAbs) { bestAbs = cents; idx = i; }
    }
    const target = STRINGS[idx];
    const cents = 1200 * Math.log2(freq / midiToFreq(target.midi, a4));
    return {
      freq,
      cents: Math.round(cents),
      display: clamp(cents, -50, 50),
      label: target.label.toUpperCase(),
      sub: target.name,
      inTune: Math.abs(cents) <= 5,
      stringIndex: idx,
    };
  }

  // Chromatic: cents relative to the nearest equal-tempered semitone.
  const refFreq = midiToFreq(midi, a4);
  const cents = 1200 * Math.log2(freq / refFreq);
  return {
    freq,
    cents: Math.round(cents),
    display: clamp(cents, -50, 50),
    label: chromName,
    sub: `Octave ${octave}`,
    inTune: Math.abs(cents) <= 5,
    stringIndex: -1,
  };
}

export default function GuitarTuner() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const [reading, setReading] = useState(null);
  const [mode, setMode] = useState("guitar"); // "guitar" | "chromatic"
  const [a4, setA4] = useState(440);
  const [loaded, setLoaded] = useState(false);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const bufRef = useRef(null);
  const freqBufRef = useRef([]); // recent good detections, median-smoothed
  const silentRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const runningRef = useRef(false);
  const modeRef = useRef(mode);
  const a4Ref = useRef(a4);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { a4Ref.current = a4; }, [a4]);

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mode === "guitar" || s.mode === "chromatic") setMode(s.mode);
        if (Number.isFinite(s.a4)) setA4(clamp(Math.round(s.a4), 415, 466));
      }
    } catch (e) { /* private mode / blocked storage — use defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ mode, a4 }));
    } catch (e) { /* ignore */ }
  }, [mode, a4, loaded]);

  // ---- detection loop ----
  const tick = useCallback(() => {
    if (!runningRef.current) return;
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    const buf = bufRef.current;
    if (!analyser || !ctx || !buf) return;

    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, ctx.sampleRate);

    if (freq > 0) {
      const arr = freqBufRef.current;
      arr.push(freq);
      if (arr.length > 6) arr.shift();
      silentRef.current = 0;
    } else {
      silentRef.current += 1;
      if (silentRef.current > 12) freqBufRef.current = [];
    }

    const now = performance.now();
    if (now - lastUpdateRef.current > 55) {
      lastUpdateRef.current = now;
      const arr = freqBufRef.current;
      if (arr.length >= 3) {
        setReading(computeReading(median(arr), modeRef.current, a4Ref.current));
        setListening(false);
      } else if (silentRef.current > 12) {
        setListening(true);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) { /* noop */ }
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) { /* noop */ }
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      const c = audioCtxRef.current;
      audioCtxRef.current = null;
      if (c.state !== "closed") c.close().catch(() => {});
    }
    bufRef.current = null;
    freqBufRef.current = [];
    silentRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    teardown();
    setRunning(false);
    setListening(false);
    setReading(null);
  }, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("This browser can't reach a microphone. Try the latest Chrome, Edge, Firefox or Safari on a secure (https) page.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
        video: false,
      });
      streamRef.current = stream;

      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") { try { await ctx.resume(); } catch (e) { /* noop */ } }
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;
      bufRef.current = new Float32Array(analyser.fftSize);

      source.connect(analyser); // NB: not connected to destination — no feedback

      freqBufRef.current = [];
      silentRef.current = 0;
      lastUpdateRef.current = 0;
      runningRef.current = true;
      setRunning(true);
      setListening(true);
      setReading(null);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      runningRef.current = false;
      teardown();
      setRunning(false);
      const name = err && err.name;
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        setError("Microphone access was blocked. Click the mic icon in your browser's address bar, allow access for this page, then press Try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone was found. Plug in or connect a mic, then press Try again.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("Your microphone is already in use by another app or tab. Close it, then press Try again.");
      } else {
        setError("Couldn't start the microphone. Check your browser's mic permissions and try again.");
      }
    }
  }, [tick, teardown]);

  const toggle = useCallback(() => {
    if (runningRef.current) stop();
    else start();
  }, [start, stop]);

  // cleanup on unmount
  useEffect(() => () => {
    runningRef.current = false;
    teardown();
  }, [teardown]);

  const cents = reading ? reading.display : 0;
  const pos = 50 + (cents / 50) * 50; // -50 -> 0%, 0 -> 50%, +50 -> 100%
  const showReading = running && reading && !listening;
  const inTune = showReading && reading.inTune;
  const flat = showReading && reading.cents < -5;
  const sharp = showReading && reading.cents > 5;

  let statusText = "Press Start tuning and allow your microphone.";
  if (running && listening) statusText = "Listening — pluck a single string…";
  if (showReading) {
    const dir = inTune ? "in tune" : reading.cents < 0 ? "flat, tune up" : "sharp, tune down";
    statusText = `${reading.label}${reading.sub ? " " + reading.sub : ""} · ${reading.cents > 0 ? "+" : ""}${reading.cents} cents · ${dir}`;
  }

  const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  return (
    <div className="tool gt">
      <style>{`
        .gt .gt-face{position:relative;background:#0b0d12;border:1px solid #232838;border-radius:16px;
          padding:22px 18px 20px;color:#fff;overflow:hidden;}
        .gt .gt-modebar{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:6px;}
        .gt .gt-seg{display:inline-flex;background:#12151d;border:1px solid #232838;border-radius:999px;padding:3px;}
        .gt .gt-seg button{border:0;background:transparent;color:#aeb6c6;font:inherit;font-weight:600;font-size:13px;
          padding:6px 16px;border-radius:999px;cursor:pointer;line-height:1;}
        .gt .gt-seg button.on{background:#2b6cff;color:#fff;}
        .gt .gt-seg button:focus-visible{outline:2px solid #7aa2ff;outline-offset:2px;}
        .gt .gt-note{font-weight:800;text-align:center;line-height:1;letter-spacing:1px;
          font-size:clamp(64px,17vw,128px);color:#e7ecf5;transition:color .12s;
          font-family:'Helvetica Neue',Arial,sans-serif;min-height:1em;}
        .gt .gt-note .gt-oct{font-size:.34em;font-weight:700;opacity:.6;vertical-align:super;margin-left:2px;}
        .gt .gt-note.in{color:#39d98a;text-shadow:0 0 22px rgba(57,217,138,.45);}
        .gt .gt-note.off{color:#ffb454;}
        .gt .gt-sub{text-align:center;font-size:13px;font-weight:600;color:#8b93a5;margin:-2px 0 12px;min-height:16px;letter-spacing:.4px;}
        .gt .gt-meter{position:relative;height:74px;margin:2px 4px 6px;}
        .gt .gt-scale{position:absolute;inset:0;top:16px;height:34px;border-radius:8px;
          background:linear-gradient(90deg,#3a1d24,#2a2f3d 42%,#153026 50%,#2a2f3d 58%,#3a1d24);
          border:1px solid #232838;}
        .gt .gt-tick{position:absolute;top:16px;width:1px;height:34px;background:rgba(255,255,255,.14);}
        .gt .gt-tick.zero{width:2px;background:rgba(57,217,138,.9);height:40px;top:13px;}
        .gt .gt-ticklabel{position:absolute;top:52px;transform:translateX(-50%);font-size:10px;color:#6b7385;}
        .gt .gt-needle{position:absolute;top:6px;height:54px;width:3px;border-radius:3px;
          background:#ffb454;box-shadow:0 0 12px rgba(255,180,84,.7);transform:translateX(-50%);
          transition:left .09s linear,background .12s,box-shadow .12s;}
        .gt .gt-needle.in{background:#39d98a;box-shadow:0 0 14px rgba(57,217,138,.85);}
        .gt .gt-needle.idle{background:#4a5163;box-shadow:none;}
        .gt .gt-cents{display:flex;justify-content:space-between;align-items:center;margin:2px 4px 4px;
          font-size:12px;color:#8b93a5;font-weight:600;}
        .gt .gt-cents .gt-arrow{transition:color .12s,opacity .12s;opacity:.4;}
        .gt .gt-cents .gt-arrow.on-flat{color:#ffb454;opacity:1;}
        .gt .gt-cents .gt-arrow.on-sharp{color:#ffb454;opacity:1;}
        .gt .gt-readout{text-align:center;font-size:13px;color:#aeb6c6;font-weight:600;min-height:18px;margin-top:2px;}
        .gt .gt-readout .gt-in{color:#39d98a;}
        .gt .gt-hz{color:#6b7385;font-weight:500;}
        .gt .gt-strings{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:16px;}
        .gt .gt-string{flex:1;min-width:44px;max-width:78px;text-align:center;padding:9px 4px;border-radius:10px;
          background:#12151d;border:1px solid #232838;transition:all .12s;}
        .gt .gt-string .gt-s-letter{font-size:20px;font-weight:800;color:#c6cede;line-height:1;}
        .gt .gt-string .gt-s-name{font-size:10.5px;color:#6b7385;font-weight:600;margin-top:3px;}
        .gt .gt-string.active{border-color:#2b6cff;background:#182338;}
        .gt .gt-string.active .gt-s-letter{color:#fff;}
        .gt .gt-string.active.tuned{border-color:#39d98a;background:#12261d;}
        .gt .gt-string.active.tuned .gt-s-letter{color:#39d98a;}
        .gt .gt-err{background:#2a1114;border:1px solid #6b2027;color:#ffc9ce;border-radius:10px;
          padding:12px 14px;font-size:13.5px;line-height:1.5;margin-top:6px;}
        .gt .gt-adv{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:14px;
          font-size:13px;color:#8b93a5;}
        .gt .gt-adv label{font-weight:600;}
        .gt .gt-adv input{width:74px;padding:6px 8px;border-radius:8px;border:1px solid var(--line,#d9dce3);
          background:var(--bg,#fff);color:inherit;font:inherit;}
        .gt .gt-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
        @media (max-width:520px){
          .gt .gt-string .gt-s-name{display:none;}
        }
      `}</style>

      <div className="gt-face">
        <div className="gt-modebar">
          <div className="gt-seg" role="tablist" aria-label="Tuner mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "guitar"}
              className={mode === "guitar" ? "on" : ""}
              onClick={() => setMode("guitar")}
            >
              Guitar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "chromatic"}
              className={mode === "chromatic" ? "on" : ""}
              onClick={() => setMode("chromatic")}
            >
              Chromatic
            </button>
          </div>
        </div>

        <div className={"gt-note" + (inTune ? " in" : showReading ? " off" : "")} aria-hidden="true">
          {showReading ? reading.label : "—"}
          {showReading && mode === "chromatic" && reading.sub && (
            <span className="gt-oct">{reading.sub.replace("Octave ", "")}</span>
          )}
        </div>
        <div className="gt-sub" aria-hidden="true">
          {showReading ? (mode === "guitar" ? reading.sub + " string" : "") : running ? "listening…" : "not running"}
        </div>

        <div className="gt-meter" aria-hidden="true">
          <div className="gt-scale" />
          {TICKS.map((t) => (
            <div
              key={t}
              className={"gt-tick" + (t === 0 ? " zero" : "")}
              style={{ left: `${50 + (t / 50) * 50}%` }}
            />
          ))}
          <div className="gt-ticklabel" style={{ left: "0%" }}>-50</div>
          <div className="gt-ticklabel" style={{ left: "50%" }}>0</div>
          <div className="gt-ticklabel" style={{ left: "100%" }}>+50</div>
          <div
            className={"gt-needle" + (inTune ? " in" : showReading ? "" : " idle")}
            style={{ left: `${clamp(pos, 0, 100)}%` }}
          />
        </div>

        <div className="gt-cents" aria-hidden="true">
          <span className={"gt-arrow" + (flat ? " on-flat" : "")}>&#9664; tune up (flat)</span>
          <span className={"gt-arrow" + (sharp ? " on-sharp" : "")}>tune down (sharp) &#9654;</span>
        </div>

        <div className="gt-readout" aria-hidden="true">
          {showReading ? (
            <>
              {inTune ? (
                <span className="gt-in">In tune</span>
              ) : (
                <span>{reading.cents > 0 ? "+" : ""}{reading.cents} cents</span>
              )}{" "}
              <span className="gt-hz">· {reading.freq.toFixed(1)} Hz</span>
            </>
          ) : (
            <span>{running ? "Waiting for a note…" : "Microphone off"}</span>
          )}
        </div>

        {mode === "guitar" && (
          <div className="gt-strings" aria-hidden="true">
            {STRINGS.map((s, i) => {
              const active = showReading && reading.stringIndex === i;
              return (
                <div
                  key={s.name}
                  className={"gt-string" + (active ? " active" : "") + (active && inTune ? " tuned" : "")}
                >
                  <div className="gt-s-letter">{s.label.toUpperCase()}</div>
                  <div className="gt-s-name">{s.name}</div>
                </div>
              );
            })}
          </div>
        )}

        <p className="gt-live" role="status" aria-live="polite">{statusText}</p>
      </div>

      {error && <div className="gt-err" role="alert">{error}</div>}

      <div className="tool-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-primary" onClick={toggle}>
          {running ? "Stop" : error ? "Try again" : "Start tuning"}
        </button>
        <button type="button" className="btn" onClick={() => setMode(mode === "guitar" ? "chromatic" : "guitar")}>
          {mode === "guitar" ? "Switch to chromatic" : "Switch to guitar"}
        </button>
      </div>

      <div className="gt-adv">
        <label htmlFor="gt-a4">Reference pitch (A4)</label>
        <input
          id="gt-a4"
          type="number"
          min={415}
          max={466}
          step={1}
          value={a4}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) setA4(clamp(Math.round(v), 415, 466));
          }}
        />
        <span>Hz</span>
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Standard tuning is <strong>E A D G B E</strong> (low to high). Pluck one string at a time and let it ring —
        turn the needle green and centered on 0 cents. Guitar mode snaps to the nearest of the six strings; chromatic
        mode names any note you play. Everything happens in your browser; no audio is recorded or uploaded.
      </p>
    </div>
  );
}
