"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TYPING_PASSAGES } from "../../lib/typingPassages";

// Common English words for the endless timed "Words" mode. Kept short and plain
// so the stream types cleanly on any keyboard.
const WORDS = "the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us great little world still own under last right move thing place live where before home around small found water never again need house point help high every near add food between keep tree begin life always those both paper together got group often run important until children side feet car mile night walk white sea began grow took river four carry state once book hear stop without second later miss idea enough eat face watch far really almost above girl sometimes cut young talk soon list song being leave family music color stand sun bird learn story plant cover city hand part open kind hold close five ready follow next hard plan warm wonder box hour morning game gray happy easy quiet clear simple table window paint garden reason answer letter number picture study coast wide field ground rest kept spell able matter school mother father friend keep bring build change carry pull wish learn build clean grand".split(" ");

// Short, space-indented snippets for "Code" mode (no tab characters, so every
// space is typeable).
const CODE = [
  'function greet(name) {\n  const message = "Hello, " + name;\n  console.log(message);\n  return message;\n}',
  'def total(items):\n    result = 0\n    for item in items:\n        result += item\n    return result',
  '.button {\n  padding: 8px 16px;\n  border-radius: 6px;\n  background: #0e7c6b;\n  color: white;\n}',
  'const nums = [1, 2, 3, 4];\nconst doubled = nums.map((n) => n * 2);\nconst sum = doubled.reduce((a, b) => a + b, 0);',
  'SELECT name, price\nFROM products\nWHERE price > 10\nORDER BY price DESC;',
];

const DURATIONS = [15, 30, 60, 120, 300];
const durLabel = (d) => (d >= 60 ? (d % 60 === 0 ? d / 60 + "m" : d + "s") : d + "s");
const MODES = [["words", "Words"], ["quote", "Quote"], ["code", "Code"], ["custom", "Custom"]];
const HKEY = "ebt_typing_history_v1";
const KEYROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const ri = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[ri(a.length)];

function buildWords(count, opts) {
  const out = [];
  let cap = opts.punctuation; // capitalise the first word when punctuation is on
  for (let i = 0; i < count; i++) {
    if (opts.numbers && Math.random() < 0.06) { out.push(String(ri(9000) + 10)); continue; }
    let w = pick(WORDS);
    if (cap) { w = w[0].toUpperCase() + w.slice(1); cap = false; }
    if (opts.punctuation && Math.random() < 0.14) {
      const p = pick([",", ".", ".", "!", "?", ";"]);
      w += p;
      if (p === "." || p === "!" || p === "?") cap = true;
    }
    out.push(w);
  }
  return out.join(" ");
}

const normCustom = (s) =>
  String(s || "").replace(/\r\n/g, "\n").replace(/\t/g, "  ").replace(/[ ]+\n/g, "\n").trim();

export default function TypingSpeedTest({ initialMode = "words", initialDuration = 30 } = {}) {
  const [mode, setMode] = useState(initialMode);
  const [duration, setDuration] = useState(initialDuration);
  const [opts, setOpts] = useState({ punctuation: false, numbers: false });
  const [customDraft, setCustomDraft] = useState("");
  const [customText, setCustomText] = useState("");

  const [target, setTarget] = useState("");
  const [typed, setTyped] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [now, setNow] = useState(0);

  const [history, setHistory] = useState([]);
  const [series, setSeries] = useState([]);
  const [isBest, setIsBest] = useState(false);

  const taRef = useRef(null);
  const errorsRef = useRef({});
  const lastLenRef = useRef(0);
  const seriesRef = useRef([]);
  const lastSecRef = useRef(-1);
  const typedRef = useRef("");
  const savedRef = useRef(false);

  const timed = mode === "words";
  const finished = endTime !== null;
  const modeKey = timed ? `words:${duration}` : mode;

  // Load saved history once.
  useEffect(() => {
    try { const h = JSON.parse(localStorage.getItem(HKEY) || "[]"); if (Array.isArray(h)) setHistory(h); } catch { /* ignore */ }
  }, []);

  const resetRun = useCallback(() => {
    setTyped(""); setStartTime(null); setEndTime(null); setNow(0); setSeries([]); setIsBest(false);
    errorsRef.current = {}; lastLenRef.current = 0; seriesRef.current = []; lastSecRef.current = -1;
    typedRef.current = ""; savedRef.current = false;
    if (typeof window !== "undefined") window.requestAnimationFrame(() => { if (taRef.current) taRef.current.focus(); });
  }, []);

  // Build a fresh target whenever the configuration changes.
  const regen = useCallback(() => {
    let t = "";
    if (mode === "words") t = buildWords(Math.ceil(duration * 3.2) + 40, opts);
    else if (mode === "quote") t = pick(TYPING_PASSAGES);
    else if (mode === "code") t = pick(CODE);
    else t = customText;
    setTarget(t);
    resetRun();
  }, [mode, duration, opts, customText, resetRun]);

  useEffect(() => { regen(); }, [regen]);

  const best = useMemo(() => {
    let b = 0; for (const h of history) if (h.k === modeKey && h.wpm > b) b = h.wpm; return b;
  }, [history, modeKey]);

  // Tick while running: refresh time, sample WPM once a second, end timed runs.
  useEffect(() => {
    if (startTime === null || finished) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const el = (t - startTime) / 1000;
      const sec = Math.floor(el);
      if (el > 0 && sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        const tp = typedRef.current; let c = 0;
        for (let i = 0; i < tp.length; i++) if (tp[i] === target[i]) c++;
        seriesRef.current.push({ t: el, wpm: Math.round((c / 5) / (el / 60)) });
      }
      if (timed && t - startTime >= duration * 1000) setEndTime(startTime + duration * 1000);
    }, 200);
    return () => clearInterval(id);
  }, [startTime, finished, timed, duration, target]);

  const onChange = useCallback((e) => {
    if (finished) return;
    let v = e.target.value;
    if (v.length > target.length) v = v.slice(0, target.length);
    if (startTime === null && v.length > 0) { const t = Date.now(); setStartTime(t); setNow(t); }
    const old = lastLenRef.current;
    if (v.length > old) {
      for (let i = old; i < v.length; i++) {
        if (v[i] !== target[i]) { const k = (target[i] || "").toLowerCase(); if (k && k !== " " && k !== "\n") errorsRef.current[k] = (errorsRef.current[k] || 0) + 1; }
      }
    }
    lastLenRef.current = v.length;
    typedRef.current = v;
    setTyped(v);
    if (!timed && target.length > 0 && v.length === target.length) setEndTime(Date.now());
  }, [finished, target, startTime, timed]);

  const stats = useMemo(() => {
    const tp = typed.length; let c = 0;
    for (let i = 0; i < tp; i++) if (typed[i] === target[i]) c++;
    const el = startTime === null ? 0 : (finished ? endTime : now) - startTime;
    const ms = el > 0 ? el : 0; const min = ms / 60000;
    const wpm = min > 0 ? Math.round((c / 5) / min) : 0;
    const acc = tp > 0 ? (c / tp) * 100 : 0;
    const remaining = timed && startTime !== null ? Math.max(0, Math.ceil(duration - ms / 1000)) : null;
    return { typedChars: tp, correct: c, wpm, acc, seconds: ms / 1000, remaining };
  }, [typed, target, startTime, endTime, now, finished, timed, duration]);

  // Save one record when a run finishes.
  useEffect(() => {
    if (!finished || savedRef.current) return;
    savedRef.current = true;
    setSeries(seriesRef.current.slice());
    if (stats.wpm > 0) {
      const entry = { k: modeKey, mode, dur: timed ? duration : null, wpm: stats.wpm, acc: Math.round(stats.acc), date: Date.now() };
      setIsBest(entry.wpm > best);
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 60);
        try { localStorage.setItem(HKEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusInput = useCallback(() => { if (taRef.current) taRef.current.focus(); }, []);

  // Windowed per-character view (keeps long/timed targets fast).
  const view = useMemo(() => {
    if (!target) return null;
    const long = target.length > 360;
    const start = long ? Math.max(0, typed.length - 30) : 0;
    const end = long ? Math.min(target.length, typed.length + 240) : target.length;
    const out = [];
    for (let i = start; i < end; i++) {
      const ch = target[i];
      const style = { borderRadius: "2px" };
      if (i < typed.length) {
        const ok = typed[i] === ch;
        style.backgroundColor = ok ? "rgba(34,197,94,0.20)" : (ch === " " ? "rgba(239,68,68,0.45)" : "rgba(239,68,68,0.30)");
        style.color = ok ? "inherit" : "rgba(239,68,68,1)";
      } else if (i === typed.length && !finished) {
        style.backgroundColor = "rgba(127,127,127,0.16)";
        style.borderBottom = "2px solid currentColor";
      } else style.opacity = 0.55;
      out.push(<span key={i} style={style}>{ch === "\n" ? "↵\n" : ch}</span>);
    }
    return out;
  }, [target, typed, finished]);

  const heat = useMemo(() => {
    const e = errorsRef.current; let max = 0;
    for (const k in e) if (e[k] > max) max = e[k];
    return { e, max };
  }, [finished, series]); // recompute after a run ends

  const spark = useMemo(() => {
    if (series.length < 2) return null;
    const W = 320, H = 60, maxT = series[series.length - 1].t || 1;
    let maxW = 10; for (const s of series) if (s.wpm > maxW) maxW = s.wpm;
    const pts = series.map((s) => `${((s.t / maxT) * W).toFixed(1)},${(H - (s.wpm / maxW) * (H - 8) - 4).toFixed(1)}`).join(" ");
    return { W, H, pts, maxW };
  }, [series]);

  const shareCard = useCallback(() => {
    try {
      const c = document.createElement("canvas"); c.width = 1200; c.height = 630;
      const g = c.getContext("2d");
      g.fillStyle = "#F2ECDF"; g.fillRect(0, 0, 1200, 630);
      g.textAlign = "center"; g.fillStyle = "#141414";
      g.font = '700 42px Arial, sans-serif'; g.fillText("EVERY BORING TOOL", 600, 96);
      g.font = '800 210px Arial, sans-serif'; g.fillText(String(stats.wpm), 600, 350);
      g.font = '700 40px Arial, sans-serif'; g.fillText("WPM", 600, 410);
      g.font = '500 34px Arial, sans-serif';
      const label = timed ? `Words · ${duration}s` : mode[0].toUpperCase() + mode.slice(1);
      g.fillText(`${Math.round(stats.acc)}% accuracy   ·   ${label}`, 600, 486);
      g.fillStyle = "#3A342B"; g.font = '600 30px Arial, sans-serif';
      g.fillText("everyboringtool.com", 600, 566);
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `typing-${stats.wpm}wpm.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch { /* canvas/download blocked */ }
  }, [stats.wpm, stats.acc, timed, duration, mode]);

  const recent = history.slice(0, 6);
  const noCustom = mode === "custom" && !customText;

  return (
    <div className="tool">
      {/* Mode */}
      <div className="seg-toggle" role="tablist" aria-label="Test type" style={{ marginBottom: 12 }}>
        {MODES.map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m}
            className={`seg-btn ${mode === m ? "is-active" : ""}`} onClick={() => setMode(m)}>{label}</button>
        ))}
      </div>

      {/* Words options */}
      {timed && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <div className="seg-toggle" role="tablist" aria-label="Duration">
            {DURATIONS.map((d) => (
              <button key={d} type="button" role="tab" aria-selected={duration === d}
                className={`seg-btn ${duration === d ? "is-active" : ""}`} onClick={() => setDuration(d)}>{durLabel(d)}</button>
            ))}
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={opts.punctuation} onChange={(e) => setOpts((o) => ({ ...o, punctuation: e.target.checked }))} /> punctuation
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={opts.numbers} onChange={(e) => setOpts((o) => ({ ...o, numbers: e.target.checked }))} /> numbers
          </label>
        </div>
      )}

      {/* Custom paste */}
      {mode === "custom" && (
        <div className="tool-field" style={{ marginBottom: 14 }}>
          <label className="tool-label" htmlFor="tst-custom">Paste your own text</label>
          <textarea id="tst-custom" className="tool-textarea" rows={3} value={customDraft}
            placeholder="Paste any text you want to practise typing…"
            onChange={(e) => setCustomDraft(e.target.value)} />
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-sm" disabled={!normCustom(customDraft)}
              onClick={() => setCustomText(normCustom(customDraft))}>Use this text</button>
          </div>
        </div>
      )}

      {noCustom ? (
        <p className="tool-note">Paste some text above and press “Use this text” to start.</p>
      ) : (
        <>
          {/* Sample */}
          <div className="tool-output" onClick={focusInput}
            style={{ fontSize: 17, lineHeight: 1.8, padding: "16px 18px",
              background: "var(--surface, rgba(127,127,127,0.06))", border: "1px solid var(--border, rgba(127,127,127,0.3))",
              borderRadius: 8, cursor: "text", whiteSpace: mode === "code" ? "pre-wrap" : "normal",
              fontFamily: mode === "code" ? "ui-monospace, Menlo, Consolas, monospace" : "inherit",
              maxHeight: 200, overflow: "hidden" }}>
            {view}
          </div>

          <textarea ref={taRef} className="tool-textarea" value={typed} onChange={onChange}
            readOnly={finished} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
            rows={3} placeholder="Click the passage, then start typing…"
            style={{ marginTop: 10, fontFamily: mode === "code" ? "ui-monospace, Menlo, Consolas, monospace" : "inherit" }} />

          {/* Live stats */}
          <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 12 }}>
            <div className="tool-stat"><div className="tool-stat-num">{stats.wpm}</div><div className="tool-stat-label">WPM</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{Math.round(stats.acc)}%</div><div className="tool-stat-label">Accuracy</div></div>
            <div className="tool-stat">
              <div className="tool-stat-num">{timed ? (stats.remaining != null ? stats.remaining : duration) : stats.seconds.toFixed(1)}{timed ? "s" : "s"}</div>
              <div className="tool-stat-label">{timed ? "Time left" : "Time"}</div>
            </div>
            <div className="tool-stat"><div className="tool-stat-num">{best || "—"}</div><div className="tool-stat-label">Your best</div></div>
          </div>

          {/* Result */}
          {finished && (
            <div className="tool-result" role="status" aria-live="polite" style={{ marginTop: 14 }}>
              <p className="tool-result-label">{isBest ? "New personal best! 🎉" : "Result"}</p>
              <div className="tool-result-value">{stats.wpm} WPM</div>
              <p className="tool-note">
                {stats.correct} correct characters at {Math.round(stats.acc)}% accuracy
                {timed ? ` in ${duration}s` : ` in ${stats.seconds.toFixed(1)}s`}.
              </p>

              {spark && (
                <div style={{ marginTop: 10 }}>
                  <div className="tool-stat-label" style={{ marginBottom: 4 }}>WPM over time</div>
                  <svg width="100%" viewBox={`0 0 ${spark.W} ${spark.H}`} style={{ maxWidth: 360, display: "block" }} preserveAspectRatio="none">
                    <polyline points={spark.pts} fill="none" stroke="var(--accent,#0e7c6b)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {heat.max > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="tool-stat-label" style={{ marginBottom: 6 }}>Keys you missed most</div>
                  <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
                    {KEYROWS.map((row, r) => (
                      <div key={r} style={{ display: "flex", gap: 4, marginLeft: r * 12 }}>
                        {row.split("").map((k) => {
                          const n = heat.e[k] || 0; const a = n / heat.max;
                          return (
                            <span key={k} title={n ? `${n} miss${n > 1 ? "es" : ""}` : "no misses"}
                              style={{ width: 26, height: 30, display: "grid", placeItems: "center", borderRadius: 5,
                                fontSize: 13, textTransform: "uppercase",
                                background: n ? `rgba(180,70,45,${(0.15 + a * 0.7).toFixed(2)})` : "var(--surface-2, rgba(127,127,127,0.1))",
                                color: a > 0.5 ? "#fff" : "inherit", border: "1px solid var(--border, rgba(127,127,127,0.25))" }}>{k}</span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="tool-actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-sm" onClick={shareCard}>⬇ Save result card</button>
              </div>
            </div>
          )}

          <div className="tool-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={regen}>↻ New test</button>
            <button type="button" className="btn" onClick={resetRun}>Restart</button>
          </div>
        </>
      )}

      {/* History */}
      {recent.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="tool-stat-label" style={{ marginBottom: 6 }}>Recent runs (saved on this device)</div>
          <div style={{ display: "grid", gap: 4 }}>
            {recent.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5,
                padding: "6px 10px", borderRadius: 6, background: "var(--surface-2, rgba(127,127,127,0.08))" }}>
                <span className="mono" style={{ fontWeight: 600 }}>{h.wpm} WPM</span>
                <span style={{ opacity: 0.7 }}>{h.acc}%</span>
                <span style={{ opacity: 0.7 }}>{h.dur ? `Words ${h.dur}s` : (h.mode || "").replace(/^\w/, (c) => c.toUpperCase())}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="tool-note" style={{ marginTop: 14 }}>
        WPM = correct characters ÷ 5 ÷ minutes elapsed. Everything runs in your browser — nothing you type is uploaded, and your
        history is stored only on this device.
      </p>
    </div>
  );
}
