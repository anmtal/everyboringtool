"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Everything is client-side: the script and settings live only in this browser
// (localStorage), and nothing is uploaded. Scrolling is driven by requestAnimationFrame
// setting the stage's scrollTop; mirror mode is a separate scaleX transform on the
// text so the scroll math stays untouched.

const LS_KEY = "ebt-teleprompter";

const DEFAULT_SCRIPT = `Welcome to the teleprompter.

Paste your own script here, press Start, and read straight down the middle of the screen while the text scrolls at your pace.

Use the Speed slider to match how fast you talk. Turn up the Font size so it stays easy to read from across the room. Switch on Mirror mode if you are bouncing the text off a piece of glass in front of your camera.

The space bar plays and pauses. The up and down arrow keys change the speed. Press F for full screen and R to jump back to the top.

Nothing you type is uploaded — your script stays in your browser.`;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function Teleprompter() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(70); // pixels per second
  const [fontSize, setFontSize] = useState(52);
  const [mirror, setMirror] = useState(false);
  const [countdownOn, setCountdownOn] = useState(true);
  const [count, setCount] = useState(0); // live 3-2-1 overlay, 0 = hidden
  const [isFs, setIsFs] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const wrapRef = useRef(null);   // goes fullscreen
  const stageRef = useRef(null);  // the scroll container
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const posRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(speed);
  const cdTimerRef = useRef(null);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.script === "string") setScript(s.script);
        if (Number.isFinite(s.speed)) setSpeed(clamp(s.speed, 10, 400));
        if (Number.isFinite(s.fontSize)) setFontSize(clamp(s.fontSize, 20, 160));
        if (typeof s.mirror === "boolean") setMirror(s.mirror);
        if (typeof s.countdownOn === "boolean") setCountdownOn(s.countdownOn);
      }
    } catch (e) { /* private mode / blocked storage — just use defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ script, speed, fontSize, mirror, countdownOn }));
    } catch (e) { /* ignore */ }
  }, [script, speed, fontSize, mirror, countdownOn, loaded]);

  // ---- the scroll loop ----
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  }, []);

  const frame = useCallback((ts) => {
    const stage = stageRef.current;
    if (!stage || !playingRef.current) return;
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    posRef.current += speedRef.current * dt;
    const max = stage.scrollHeight - stage.clientHeight;
    if (posRef.current >= max) {
      stage.scrollTop = max;
      stop();
      return;
    }
    stage.scrollTop = posRef.current;
    rafRef.current = requestAnimationFrame(frame);
  }, [stop]);

  const play = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    posRef.current = stage.scrollTop;
    lastTsRef.current = 0;
    setPlaying(true);
    playingRef.current = true;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
  }, [frame]);

  const runCountdown = useCallback(() => {
    clearInterval(cdTimerRef.current);
    setCount(3);
    let n = 3;
    cdTimerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(cdTimerRef.current);
        setCount(0);
        play();
      } else {
        setCount(n);
      }
    }, 700);
  }, [play]);

  const togglePlay = useCallback(() => {
    if (count > 0) { clearInterval(cdTimerRef.current); setCount(0); return; }
    if (playingRef.current) { stop(); return; }
    const stage = stageRef.current;
    const atStart = !stage || stage.scrollTop < 6;
    if (atStart && countdownOn) runCountdown();
    else play();
  }, [count, stop, countdownOn, runCountdown, play]);

  const restart = useCallback(() => {
    stop();
    clearInterval(cdTimerRef.current);
    setCount(0);
    posRef.current = 0;
    if (stageRef.current) stageRef.current.scrollTop = 0;
  }, [stop]);

  // ---- fullscreen ----
  const toggleFs = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
      else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } catch (e) { /* fullscreen blocked — inline still works */ }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  // ---- keyboard shortcuts (ignored while typing in the editor) ----
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      const k = e.key;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (k === "ArrowUp") { e.preventDefault(); setSpeed((s) => clamp(s + 5, 10, 400)); }
      else if (k === "ArrowDown") { e.preventDefault(); setSpeed((s) => clamp(s - 5, 10, 400)); }
      else if (k === "+" || k === "=") { setFontSize((f) => clamp(f + 4, 20, 160)); }
      else if (k === "-" || k === "_") { setFontSize((f) => clamp(f - 4, 20, 160)); }
      else if (k === "m" || k === "M") { setMirror((v) => !v); }
      else if (k === "f" || k === "F") { toggleFs(); }
      else if (k === "r" || k === "R") { restart(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleFs, restart]);

  // cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(cdTimerRef.current);
  }, []);

  const wpm = Math.round((speed / Math.max(fontSize * 0.62, 1)) * 60); // rough words-per-minute readout

  return (
    <div className="tool tp">
      <style>{`
        .tp .tp-wrap{position:relative;background:#0b0d12;border-radius:12px;overflow:hidden;border:1px solid #232838;}
        .tp .tp-wrap:fullscreen{border-radius:0;border:0;}
        .tp .tp-stage{height:clamp(320px,56vh,620px);overflow:hidden;scrollbar-width:none;}
        .tp .tp-stage::-webkit-scrollbar{display:none;}
        .tp .tp-wrap:fullscreen .tp-stage{height:100vh;}
        .tp .tp-inner{color:#fff;font-weight:700;text-align:center;line-height:1.42;
          padding:38vh 7% 82vh;letter-spacing:.2px;
          font-family:Georgia,'Times New Roman',serif;white-space:pre-wrap;word-wrap:break-word;}
        .tp .tp-line{position:absolute;left:0;right:0;top:38%;height:0;border-top:2px solid rgba(120,180,255,.5);
          box-shadow:0 0 0 9999px rgba(0,0,0,0);pointer-events:none;}
        .tp .tp-line::before,.tp .tp-line::after{content:"";position:absolute;top:-8px;border:8px solid transparent;}
        .tp .tp-line::before{left:0;border-left-color:rgba(120,180,255,.7);}
        .tp .tp-line::after{right:0;border-right-color:rgba(120,180,255,.7);}
        .tp .tp-fade{position:absolute;left:0;right:0;height:24%;pointer-events:none;z-index:2;}
        .tp .tp-fade-top{top:0;background:linear-gradient(#0b0d12,rgba(11,13,18,0));}
        .tp .tp-fade-bot{bottom:0;background:linear-gradient(rgba(11,13,18,0),#0b0d12);}
        .tp .tp-cd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;
          font-size:22vh;font-weight:800;color:#fff;background:rgba(11,13,18,.55);}
        .tp .tp-bar{position:absolute;left:0;right:0;bottom:0;z-index:6;display:flex;gap:8px;align-items:center;
          justify-content:center;flex-wrap:wrap;padding:10px;background:linear-gradient(rgba(11,13,18,0),rgba(11,13,18,.85));}
        .tp .tp-bar .btn{white-space:nowrap;}
        .tp .tp-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;margin-top:14px;}
        .tp .tp-ctl{display:flex;flex-direction:column;gap:4px;min-width:160px;flex:1;}
        .tp .tp-ctl label{font-size:13px;font-weight:600;opacity:.85;}
        .tp .tp-ctl input[type=range]{width:100%;}
        .tp .tp-toggles{display:flex;gap:18px;flex-wrap:wrap;align-items:center;}
        .tp .tp-check{display:flex;gap:7px;align-items:center;font-size:14px;cursor:pointer;}
        .tp .tp-hint{font-size:12.5px;opacity:.7;}
        .tp kbd{font:inherit;font-size:.85em;background:var(--line,#e6e6e6);border-radius:4px;padding:1px 5px;}
      `}</style>

      <div className="tool-field">
        <label className="tool-label" htmlFor="tp-script">Your script</label>
        <textarea
          id="tp-script"
          className="tool-textarea"
          rows={5}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Paste or type the script you want to read…"
          spellCheck={true}
        />
      </div>

      <div className="tp-controls">
        <div className="tp-ctl">
          <label htmlFor="tp-speed">Speed — {speed} px/s <span className="tp-hint">(~{wpm} wpm)</span></label>
          <input id="tp-speed" type="range" min={10} max={400} step={5}
            value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </div>
        <div className="tp-ctl">
          <label htmlFor="tp-font">Font size — {fontSize}px</label>
          <input id="tp-font" type="range" min={20} max={160} step={2}
            value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
        </div>
      </div>

      <div className="tp-toggles" style={{ marginTop: 12 }}>
        <label className="tp-check"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Mirror mode</label>
        <label className="tp-check"><input type="checkbox" checked={countdownOn} onChange={(e) => setCountdownOn(e.target.checked)} /> 3-2-1 countdown</label>
      </div>

      <div className="tool-actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={togglePlay}>
          {count > 0 ? "Cancel countdown" : playing ? "Pause" : "Start"}
        </button>
        <button type="button" className="btn" onClick={restart}>Restart</button>
        <button type="button" className="btn" onClick={toggleFs}>{isFs ? "Exit full screen" : "Full screen"}</button>
      </div>

      <div className="tp-wrap" ref={wrapRef} style={{ marginTop: 14 }}>
        <div className="tp-fade tp-fade-top" />
        <div className="tp-line" aria-hidden="true" />
        <div className="tp-fade tp-fade-bot" />
        <div className="tp-stage" ref={stageRef}>
          <div className="tp-inner" style={{ fontSize: `${fontSize}px`, transform: mirror ? "scaleX(-1)" : "none" }}>
            {script || " "}
          </div>
        </div>
        {count > 0 && <div className="tp-cd" aria-hidden="true">{count}</div>}
        <div className="tp-bar">
          <button type="button" className="btn btn-primary" onClick={togglePlay}>
            {count > 0 ? "Cancel" : playing ? "Pause" : "Start"}
          </button>
          <button type="button" className="btn" onClick={restart}>Restart</button>
          <button type="button" className="btn" onClick={() => setSpeed((s) => clamp(s - 5, 10, 400))}>Slower</button>
          <button type="button" className="btn" onClick={() => setSpeed((s) => clamp(s + 5, 10, 400))}>Faster</button>
          <button type="button" className="btn" onClick={toggleFs}>{isFs ? "Exit" : "Full screen"}</button>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Shortcuts: <kbd>Space</kbd> play/pause · <kbd>↑</kbd>/<kbd>↓</kbd> speed · <kbd>+</kbd>/<kbd>−</kbd> font ·
        {" "}<kbd>M</kbd> mirror · <kbd>F</kbd> full screen · <kbd>R</kbd> restart. Your script is saved only in this
        browser and is never uploaded.
      </p>
    </div>
  );
}
