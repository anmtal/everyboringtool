"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";

// Classroom Timer: a big countdown made to be projected on a board.
//
// Timing: the time left is always worked out from an absolute end timestamp
// (endAt - Date.now()), never by decrementing a counter, so a throttled
// background tab, a busy device or a switch to the slides can't make it drift.
// A one-shot timeout aimed at the end time finishes the timer even while the
// display interval is being throttled in a hidden tab.
//
// Sound: the alarm is synthesised with the Web Audio API (no audio files).
// Browsers keep audio locked until the visitor interacts with the page, so the
// AudioContext is created / resumed inside a user gesture (Start, the Space
// key, the sound toggle) and the end of the timer just plays on that context.

const PRESETS = [1, 2, 3, 5, 10, 15, 20, 30]; // minutes
const MAX_MINUTES = 180;
const DEFAULT_MS = 5 * 60 * 1000;
const WARN_FRACTION = 0.2; // amber for the last 20% of the time
const DANGER_MS = 10 * 1000; // red for the final 10 seconds
const TICK_MS = 200;
// Three bursts of three beeps (start offsets, seconds): about 2.4 s in total.
const ALARM = [0, 0.2, 0.4, 0.9, 1.1, 1.3, 1.8, 2.0, 2.2];
const DONE_TEXT = "Time's up!";

function pad(n) {
  return String(n).padStart(2, "0");
}

function wholeSeconds(ms) {
  return Math.max(0, Math.ceil(ms / 1000));
}

// 245000 -> "04:05"; 3723000 -> "1:02:03".
function formatClock(ms) {
  const total = wholeSeconds(ms);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Spoken form for the screen-reader live region: "4 minutes 5 seconds".
function spoken(ms) {
  const total = wholeSeconds(ms);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s || parts.length === 0) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.join(" ");
}

// Approximate width of the big text in ems, measured in Inter bold at the
// -0.02em tracking used in CSS ("05:00" = 2.76em, "Time's up!" = 4.98em),
// rounded up. CSS divides the box width by this so the text always fits.
function textEms(text) {
  if (text === DONE_TEXT) return 5.05;
  let ems = 0;
  for (const ch of text) ems += ch === ":" ? 0.3 : 0.62;
  return Math.round(ems * 100) / 100;
}

function isTextEntry(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const CONTROL_SELECTOR = "a[href], button, input, select, textarea, summary, [role='button'], [contenteditable='true']";

export default function ClassroomTimer() {
  const [durationMs, setDurationMs] = useState(DEFAULT_MS);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_MS);
  const [status, setStatus] = useState("idle"); // idle | running | paused | done
  const [soundOn, setSoundOn] = useState(true);
  const [audioNote, setAudioNote] = useState("");
  const [customMin, setCustomMin] = useState("5");
  const [customSec, setCustomSec] = useState("00");
  const [customError, setCustomError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [fsApi, setFsApi] = useState(false); // real Fullscreen API usable here
  const [inFrame, setInFrame] = useState(false);
  const [nativeFs, setNativeFs] = useState(false);
  const [faux, setFaux] = useState(false); // fallback overlay (e.g. iPhone Safari)

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  // Refs mirror the values the timer engine needs, so callbacks fired from
  // timeouts, intervals and window listeners never read a stale render.
  const statusRef = useRef("idle");
  const durationRef = useRef(DEFAULT_MS);
  const remainingRef = useRef(DEFAULT_MS);
  const endAtRef = useRef(0);
  const finishTimerRef = useRef(null);
  const soundRef = useRef(true);
  const audioRef = useRef(null);
  const alarmRef = useRef(null);
  const wakeRef = useRef(null);
  const visibleRef = useRef(true);
  const minuteNoticeRef = useRef(false);
  const titleRef = useRef({ original: "", set: "" });
  const handlersRef = useRef({});

  function setStatusBoth(s) {
    statusRef.current = s;
    setStatus(s);
  }

  function setRemainingBoth(ms) {
    remainingRef.current = ms;
    setRemainingMs(ms);
  }

  // ---- audio ----------------------------------------------------------------

  function getAudio() {
    if (audioRef.current) return audioRef.current;
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      const ctx = new AC();
      // A one-sample silent buffer started inside the gesture unlocks audio on
      // older iOS Safari, which ignores resume() alone.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
      audioRef.current = ctx;
      return ctx;
    } catch (e) {
      return null;
    }
  }

  // Must be called from inside a click / key handler (a user gesture).
  function unlockAudio() {
    if (!soundRef.current) return null;
    const ctx = getAudio();
    if (!ctx) {
      setAudioNote("This browser can't play the alarm sound, so watch for the red Time's up screen.");
      return null;
    }
    if (ctx.state !== "running") {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {
        /* resume() can throw on very old engines; the alarm path retries */
      }
    }
    setAudioNote("");
    return ctx;
  }

  function stopAlarm() {
    const master = alarmRef.current;
    alarmRef.current = null;
    if (master) {
      try {
        master.disconnect();
      } catch (e) {
        /* already disconnected */
      }
    }
  }

  function beeps(ctx, offsets) {
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.03;
    for (const off of offsets) {
      const t = t0 + off;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 880;
      // Short attack/release ramps so the beeps don't click.
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
      env.gain.setValueAtTime(0.5, t + 0.12);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(env);
      env.connect(master);
      osc.start(t);
      osc.stop(t + 0.18);
    }
    return master;
  }

  function playAlarm() {
    const ctx = audioRef.current;
    if (!ctx) return; // no Web Audio: the note was already shown
    const blocked = () =>
      setAudioNote("The browser blocked the alarm sound this time. Press Start or Space on this page before the timer ends and it will be allowed.");
    const go = () => {
      stopAlarm();
      try {
        alarmRef.current = beeps(ctx, ALARM);
      } catch (e) {
        blocked();
      }
    };
    if (ctx.state === "running") {
      go();
      return;
    }
    try {
      ctx.resume().then(() => (ctx.state === "running" ? go() : blocked()), blocked);
    } catch (e) {
      blocked();
    }
  }

  // ---- timer engine -----------------------------------------------------------

  function clearFinishTimer() {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }

  function finish() {
    clearFinishTimer();
    endAtRef.current = 0;
    setRemainingBoth(0);
    setStatusBoth("done");
    setAnnounce(DONE_TEXT);
    if (soundRef.current) playAlarm();
  }

  // Recompute the time left from the end timestamp.
  function tick() {
    if (statusRef.current !== "running") return;
    const left = endAtRef.current - Date.now();
    if (left <= 0) {
      finish();
      return;
    }
    setRemainingBoth(left);
    if (!minuteNoticeRef.current && left <= 60000) {
      minuteNoticeRef.current = true;
      setAnnounce("1 minute left");
    }
  }

  function armFinishTimer() {
    clearFinishTimer();
    const left = endAtRef.current - Date.now();
    finishTimerRef.current = setTimeout(function onEnd() {
      finishTimerRef.current = null;
      if (statusRef.current !== "running") return;
      const rest = endAtRef.current - Date.now();
      if (rest <= 0) finish();
      else finishTimerRef.current = setTimeout(onEnd, rest + 20);
    }, Math.max(0, left) + 20);
  }

  function start() {
    if (statusRef.current === "running") return;
    unlockAudio();
    stopAlarm();
    const resuming = statusRef.current === "paused" && remainingRef.current > 0;
    const left = resuming ? remainingRef.current : durationRef.current;
    endAtRef.current = Date.now() + left;
    setRemainingBoth(left);
    // Starting with a minute or less left: no separate "1 minute left" notice.
    minuteNoticeRef.current = left <= 60000;
    setStatusBoth("running");
    armFinishTimer();
    setAnnounce(resuming ? `Resumed, ${spoken(left)} left` : `Started, ${spoken(left)}`);
  }

  function pause() {
    if (statusRef.current !== "running") return;
    const left = endAtRef.current - Date.now();
    clearFinishTimer();
    if (left <= 0) {
      finish();
      return;
    }
    setRemainingBoth(left);
    setStatusBoth("paused");
    setAnnounce(`Paused with ${spoken(left)} left`);
  }

  function reset() {
    clearFinishTimer();
    stopAlarm();
    setRemainingBoth(durationRef.current);
    setStatusBoth("idle");
    setAnnounce(`Reset to ${spoken(durationRef.current)}`);
  }

  function toggle() {
    if (statusRef.current === "running") pause();
    else start();
  }

  function choose(ms) {
    clearFinishTimer();
    stopAlarm();
    durationRef.current = ms;
    setDurationMs(ms);
    setRemainingBoth(ms);
    setStatusBoth("idle");
    const total = Math.round(ms / 1000);
    setCustomMin(String(Math.floor(total / 60)));
    setCustomSec(pad(total % 60));
    setCustomError("");
    setAnnounce(`Timer set to ${spoken(ms)}`);
  }

  function onCustomSubmit(e) {
    e.preventDefault();
    const mStr = customMin.trim();
    const sStr = customSec.trim();
    const m = mStr === "" ? 0 : Number(mStr);
    const s = sStr === "" ? 0 : Number(sStr);
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0) {
      setCustomError("Use whole numbers for the minutes and seconds.");
      return;
    }
    const total = m * 60 + s; // 90 seconds is accepted and becomes 1:30
    if (total <= 0) {
      setCustomError("Enter a time longer than zero.");
      return;
    }
    if (total > MAX_MINUTES * 60) {
      setCustomError(`The longest timer is ${MAX_MINUTES} minutes.`);
      return;
    }
    choose(total * 1000);
  }

  function toggleSound() {
    const next = !soundRef.current;
    soundRef.current = next;
    setSoundOn(next);
    if (next) {
      const ctx = unlockAudio();
      // One short confirmation beep doubles as a speaker check.
      if (ctx) {
        try {
          stopAlarm();
          alarmRef.current = beeps(ctx, [0]);
        } catch (e) {
          /* ignore: the real alarm path reports problems */
        }
      }
    } else {
      stopAlarm();
      setAudioNote("");
    }
  }

  // ---- full screen ------------------------------------------------------------

  const isFull = nativeFs || faux;
  const showFsButton = fsApi || !inFrame;

  function enterFull() {
    const el = rootRef.current;
    if (!el) return;
    const fallback = () => {
      if (!inFrame) setFaux(true);
    };
    const req = fsApi ? el.requestFullscreen || el.webkitRequestFullscreen : null;
    if (!req) {
      fallback();
      return;
    }
    try {
      const p = req.call(el);
      if (p && typeof p.catch === "function") p.catch(fallback);
    } catch (e) {
      fallback();
    }
  }

  function exitFull() {
    if (faux) setFaux(false);
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) return;
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    try {
      const p = ex && ex.call(document);
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {
      /* already left full screen */
    }
  }

  // ---- screen wake lock ---------------------------------------------------------

  function releaseWake() {
    const lock = wakeRef.current;
    wakeRef.current = null;
    if (lock) lock.release().catch(() => {});
  }

  async function requestWake() {
    if (wakeRef.current || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (document.visibilityState !== "visible") return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => {
        if (wakeRef.current === lock) wakeRef.current = null;
      });
      if (statusRef.current === "running" && !wakeRef.current) wakeRef.current = lock;
      else lock.release().catch(() => {});
    } catch (e) {
      /* not allowed here (e.g. an iframe without permission) or low battery */
    }
  }

  // ---- keyboard -----------------------------------------------------------------

  // Space = start / pause, R = reset. Ignored while typing in a field, when
  // focus is on a control outside the timer (so Space still presses that
  // button), and while the timer is scrolled out of view (so Space still
  // scrolls the page when you're reading further down).
  function shortcutTarget(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return false;
    const t = e.target;
    if (isTextEntry(t)) return false;
    const root = rootRef.current;
    const inside = !!(root && t && root.contains(t));
    if (!inside && t && t.closest && t.closest(CONTROL_SELECTOR)) return false;
    return inside || visibleRef.current || isFull;
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && faux) {
      setFaux(false);
      return;
    }
    const isSpace = e.code === "Space" || e.key === " ";
    const isR = e.key === "r" || e.key === "R";
    if (!isSpace && !isR) return;
    if (!shortcutTarget(e)) return;
    if (isR) {
      const root = rootRef.current;
      const inTimer = !!(root && e.target && root.contains(e.target));
      if (!inTimer && !isFull) return;
    }
    // preventDefault also stops a focused button inside the timer from being
    // "clicked" by the same Space press.
    e.preventDefault();
    if (e.repeat) return;
    if (isSpace) {
      if (status === "idle" || status === "done") trackEvent("tool_use", { tool_slug: "classroom-timer", tool_action: "start_key" });
      toggle();
    } else reset();
  }

  function onKeyUp(e) {
    // Firefox activates a focused button on Space keyup; swallow it there too.
    if ((e.code === "Space" || e.key === " ") && shortcutTarget(e)) e.preventDefault();
  }

  handlersRef.current = { tick, onKeyDown, onKeyUp, requestWake };

  // ---- effects --------------------------------------------------------------------

  // The display refresh: only while running. The end itself is handled by the
  // one-shot finish timer, so throttling of this interval can't delay it.
  useEffect(() => {
    if (status !== "running") return undefined;
    const id = setInterval(() => handlersRef.current.tick(), TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const down = (e) => handlersRef.current.onKeyDown(e);
    const up = (e) => handlersRef.current.onKeyUp(e);
    const vis = () => {
      if (document.visibilityState !== "visible") return;
      // Catch the display up at once and take the wake lock back (browsers
      // drop it whenever the tab is hidden).
      handlersRef.current.tick();
      if (statusRef.current === "running") handlersRef.current.requestWake();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // Track whether the timer is on screen (for the Space shortcut).
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[entries.length - 1].isIntersecting;
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Full-screen support (feature-detected) and change tracking.
  useEffect(() => {
    let framed = false;
    try {
      framed = window.self !== window.top;
    } catch (e) {
      framed = true;
    }
    setInFrame(framed);
    const el = rootRef.current;
    const enabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    setFsApi(enabled && !!el && !!(el.requestFullscreen || el.webkitRequestFullscreen));
    const onChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setNativeFs(!!fsEl && fsEl === rootRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // The fallback overlay covers the page; stop the page behind it scrolling.
  useEffect(() => {
    if (!faux) return undefined;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [faux]);

  // Keep the screen awake while the timer runs; release on pause / reset / end.
  useEffect(() => {
    if (status === "running") handlersRef.current.requestWake();
    else releaseWake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const clock = formatClock(remainingMs);

  // Show the time in the tab title while it runs. Only ever restore a title we
  // set ourselves, so a client-side navigation's new title is never clobbered.
  useEffect(() => {
    const t = titleRef.current;
    t.original = document.title;
    return () => {
      if (t.set && document.title === t.set) document.title = t.original;
    };
  }, []);

  useEffect(() => {
    const t = titleRef.current;
    let next = "";
    if (status === "running") next = `${clock} · Classroom Timer`;
    else if (status === "paused") next = `Paused ${clock} · Classroom Timer`;
    else if (status === "done") next = `${DONE_TEXT} · Classroom Timer`;
    if (next) {
      document.title = next;
      t.set = next;
    } else if (t.set && document.title === t.set) {
      document.title = t.original;
      t.set = "";
    }
  }, [status, clock]);

  // Unmount: stop everything that could outlive the component.
  useEffect(
    () => () => {
      clearFinishTimer();
      stopAlarm();
      releaseWake();
      const ctx = audioRef.current;
      audioRef.current = null;
      if (ctx && typeof ctx.close === "function") ctx.close().catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ---- render ---------------------------------------------------------------------

  let phase = "idle";
  if (status === "done") phase = "done";
  else if (status !== "idle" || remainingMs !== durationMs) {
    if (remainingMs <= DANGER_MS) phase = "danger";
    else if (remainingMs <= durationMs * WARN_FRACTION) phase = "warn";
    else phase = "calm";
  }

  let pill = "Ready";
  if (status === "paused") pill = "Paused";
  else if (status === "running") pill = phase === "danger" ? "Final seconds" : phase === "warn" ? "Almost done" : "Running";

  const bigText = status === "done" ? DONE_TEXT : clock;
  const fraction = durationMs > 0 ? Math.min(1, Math.max(0, remainingMs / durationMs)) : 0;
  const primary = status === "running" ? "Pause" : status === "paused" ? "Resume" : status === "done" ? "Restart" : "Start";

  return (
    <div
      ref={rootRef}
      className={`tool ct${isFull ? " is-full" : ""}${faux ? " is-faux" : ""}`}
      data-phase={phase}
    >
      <div ref={stageRef} className="ct-stage">
        <div className="ct-display">
          {status !== "done" && <span className="ct-pill">{pill}</span>}
          <div className="ct-digits" role="timer" aria-atomic="true" style={{ "--ct-em": textEms(bigText) }}>
            {bigText}
          </div>
        </div>
        <div className="ct-bar" aria-hidden="true">
          <div className="ct-bar-fill" style={{ transform: `scaleX(${fraction})` }} />
        </div>
        <div className="tool-actions ct-controls">
          <button type="button" className="btn btn-primary" onClick={toggle}>
            {primary}
          </button>
          <button type="button" className="btn" onClick={reset}>
            Reset
          </button>
          <button type="button" className="btn" onClick={toggleSound}>
            {soundOn ? "Sound: on" : "Sound: off"}
          </button>
          {showFsButton && (
            <button type="button" className="btn" onClick={isFull ? exitFull : enterFull}>
              {isFull ? "Exit full screen" : "Full screen"}
            </button>
          )}
        </div>
      </div>

      <div className="ct-setup">
        <div className="ct-presets" role="group" aria-label="Preset times">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className="chip ct-preset"
              aria-pressed={durationMs === m * 60000}
              onClick={() => choose(m * 60000)}
            >
              {m} min
            </button>
          ))}
        </div>
        <form className="ct-custom" onSubmit={onCustomSubmit} noValidate aria-label="Custom time">
          <span className="ct-custom-label">Custom</span>
          <input
            className="tool-input"
            type="number"
            inputMode="numeric"
            min="0"
            max={MAX_MINUTES}
            step="1"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            aria-label="Minutes"
          />
          <span className="ct-unit" aria-hidden="true">min</span>
          <input
            className="tool-input"
            type="number"
            inputMode="numeric"
            min="0"
            max="59"
            step="1"
            value={customSec}
            onChange={(e) => setCustomSec(e.target.value)}
            aria-label="Seconds"
          />
          <span className="ct-unit" aria-hidden="true">sec</span>
          <button type="submit" className="btn">
            Set time
          </button>
        </form>
      </div>

      {customError && (
        <p className="tool-error" role="alert">
          {customError}
        </p>
      )}
      {audioNote && (
        <p className="tool-note" role="status">
          {audioNote}
        </p>
      )}
      <p className="tool-note ct-hint">
        Keyboard: Space starts or pauses; R resets when the timer is selected (not while you&rsquo;re typing in a time box).
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
