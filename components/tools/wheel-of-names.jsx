"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const CX = 110, CY = 110, R = 100;
// Fills dark enough for white labels to read (~4.5:1+).
const PALETTE = ["#c0392b", "#2e7d55", "#2471a3", "#b9770e", "#7d3c98", "#16879e", "#a93226", "#1e8449", "#2e5fa3", "#ba4a00"];

// Labels stop being readable below ~6° a slice, so the wheel holds 60 entries.
// Anything past that is flagged in the UI (never dropped silently).
const MAX_SLICES = 60;
const MAX_HISTORY = 200;
const LS_KEY = "ebt-wheel-of-names-v1";
const SAMPLE = ["Ava", "Ben", "Chloe", "Diego", "Ella", "Farah", "George", "Hana"];
const PICKER_URL = "/education/random-picker";

const SPIN_LENGTHS = {
  quick: { label: "Quick", secs: 2, turns: 3 },
  normal: { label: "Normal", secs: 4, turns: 5 },
  long: { label: "Long", secs: 8, turns: 9 },
};

const QUICK_LISTS = [
  { id: "numbers", label: "Numbers 1–10", items: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
  { id: "yes-no", label: "Yes / No", items: ["Yes", "No"] },
  { id: "days", label: "Days of the week", items: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  { id: "dinner", label: "Dinner ideas", items: ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta", "Curry", "Salad", "Stir-fry"] },
  {
    id: "nfl",
    label: "NFL teams",
    items: [
      "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills", "Carolina Panthers",
      "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys", "Denver Broncos",
      "Detroit Lions", "Green Bay Packers", "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars",
      "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
      "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants", "New York Jets",
      "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers",
      "Tennessee Titans", "Washington Commanders",
    ],
  },
];

const TWO_32 = 0x100000000; // 2^32

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias (same approach as the Random Name Picker).
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(TWO_32 / max) * max;
  const buf = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

// Non-blank, trimmed lines.
function parseEntries(text) {
  return String(text || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

// Remove the idx-th entry from the raw text, leaving every other line as typed —
// but only if that entry still holds `name`. There is deliberately no fallback to
// "the first line with that name": a list edited since the spin could hold a
// different person with the same name.
function removeEntry(text, idx, name) {
  const lines = String(text || "").split(/\r?\n/);
  const pos = [];
  lines.forEach((l, i) => { if (l.trim()) pos.push(i); });
  if (!(idx >= 0 && idx < pos.length) || lines[pos[idx]].trim() !== name) return text;
  lines.splice(pos[idx], 1);
  return lines.join("\n");
}

const range = (n) => Array.from({ length: n }, (_, i) => i);

// Fisher-Yates with the secure generator.
function shuffled(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Index order that sorts `items` A–Z (equal names keep their order).
function sortOrder(items) {
  return range(items.length).sort((a, b) => items[a].localeCompare(items[b], undefined, { sensitivity: "base", numeric: true }) || a - b);
}

function sortedAZ(items) {
  return sortOrder(items).map((i) => items[i]);
}

// The list tools return the new entries plus where entry `idx` ended up (-1 when
// not tracked), so a pending winner removal follows its own entry.
function reordered(items, order, idx) {
  return { items: order.map((i) => items[i]), idx: idx >= 0 ? order.indexOf(idx) : -1 };
}
const shuffleTracked = (items, idx) => reordered(items, shuffled(range(items.length)), idx);
const sortTracked = (items, idx) => reordered(items, sortOrder(items), idx);
// Copies of a name merge into its first copy, so the entry follows the name there.
function dedupeTracked(items, idx) {
  const out = withoutDuplicates(items);
  return { items: out, idx: idx >= 0 && idx < items.length ? out.indexOf(items[idx]) : -1 };
}

// Keeps the first occurrence of each entry (case-sensitive, as on the wheel).
function withoutDuplicates(items) {
  const seen = new Set();
  return items.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

// Entries listed more than once, in first-appearance order.
function duplicateCounts(items) {
  const m = new Map();
  for (const s of items) m.set(s, (m.get(s) || 0) + 1);
  const out = [];
  m.forEach((count, name) => { if (count > 1) out.push({ name, count }); });
  return out;
}

// 12.5 -> "12.5%", 25 -> "25%", 3.333 -> "3.3%".
function fmtPct(p) {
  const r = Math.round(p * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)) + "%";
}

// Clockwise rotation (deg) that puts the point `frac` of the way through slice
// `idx` (0 = leading edge, 1 = trailing edge) under the top pointer, after
// `turns` full turns from `current`.
function landingRotation(current, idx, n, frac, turns) {
  const seg = 360 / n;
  const targetMod = (((-(idx * seg + frac * seg)) % 360) + 360) % 360;
  const cur = ((current % 360) + 360) % 360;
  let delta = targetMod - cur;
  if (delta < 0) delta += 360;
  return current + turns * 360 + delta;
}

function historyText(history) {
  return history.map((h) => `${h.n}. ${h.name}`).join("\n");
}

function pt(r, aDeg) {
  const a = (aDeg - 90) * Math.PI / 180; // 0° = top, clockwise
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

// Live rotation of an element (deg) from its computed transform matrix.
function readAngle(el) {
  try {
    const tr = window.getComputedStyle(el).transform;
    if (!tr || tr === "none") return 0;
    const m = tr.match(/^matrix\(([^)]+)\)$/);
    if (!m) return null;
    const p = m[1].split(",").map(parseFloat);
    return (Math.atan2(p[1], p[0]) * 180) / Math.PI;
  } catch (e) {
    return null;
  }
}

const offStyle = (disabled) => (disabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined);

export default function WheelOfNames() {
  const [text, setText] = useState(SAMPLE.join("\n"));
  const [autoRemove, setAutoRemove] = useState(false);
  const [spinLength, setSpinLength] = useState("normal");
  const [sound, setSound] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null); // { name, restored? } — what the result card shows
  // The winning entry ({ name, idx } in the list) while its position is known for sure:
  // the list tools move it along, a manual edit or a new list drops it. Auto-remove
  // takes it off at the next spin, and the Remove button uses it.
  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState([]); // [{ n, name }], session only
  const [undoText, setUndoText] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [fsEnabled, setFsEnabled] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const timer = useRef(null);
  const copyTimer = useRef(null);
  const spinningRef = useRef(false);
  const stageRef = useRef(null);
  const svgRef = useRef(null);
  const wheelRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(0);

  // ---- cleanup on unmount ----
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    try { if (audioRef.current && audioRef.current.close) audioRef.current.close(); } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);

  // ---- load the saved list + settings (this browser only) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === "object") {
          const hasText = typeof s.text === "string" && s.text.trim();
          if (hasText) setText(s.text);
          if (typeof s.autoRemove === "boolean") setAutoRemove(s.autoRemove);
          if (typeof s.spinLength === "string" && Object.prototype.hasOwnProperty.call(SPIN_LENGTHS, s.spinLength)) setSpinLength(s.spinLength);
          if (typeof s.sound === "boolean") setSound(s.sound);
          // A winner still waiting to come off (auto-remove) — only if that line still holds it.
          const p = s.pending;
          if (hasText && s.autoRemove === true && p && typeof p.name === "string" && Number.isInteger(p.idx)) {
            const list = parseEntries(s.text);
            if (list[p.idx] === p.name) {
              setPending({ name: p.name, idx: p.idx });
              setWinner({ name: p.name, restored: true });
              const n = Math.min(list.length, MAX_SLICES);
              if (p.idx < n) setRotation(landingRotation(0, p.idx, n, 0.5, 0)); // pointer back on that slice
            }
          }
        }
      }
    } catch (e) { /* private mode / blocked storage — start with the sample list */ }
    setLoaded(true);
  }, []);

  // ---- save on change; an empty list leaves nothing behind ----
  useEffect(() => {
    if (!loaded) return;
    try {
      if (text === "") localStorage.removeItem(LS_KEY);
      else {
        const p = autoRemove && pending ? { name: pending.name, idx: pending.idx } : null;
        localStorage.setItem(LS_KEY, JSON.stringify({ text, autoRemove, spinLength, sound, pending: p }));
      }
    } catch (e) { /* ignore */ }
  }, [loaded, text, autoRemove, spinLength, sound, pending]);

  // ---- fullscreen (not offered where element fullscreen is unsupported, e.g. iPhone Safari) ----
  useEffect(() => {
    setFsEnabled(!!(document.fullscreenEnabled || document.webkitFullscreenEnabled));
    const onFs = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      const on = !!el && el === stageRef.current;
      setIsFs(on);
      // Put focus on the wheel so Space / Enter spins instead of re-pressing the exit button.
      if (on && svgRef.current) { try { svgRef.current.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  const allNames = useMemo(() => parseEntries(text), [text]);
  const names = useMemo(() => allNames.slice(0, MAX_SLICES), [allNames]);
  const N = names.length;
  const extra = allNames.length - N;
  const SEG = N > 0 ? 360 / N : 360;
  // What the next spin draws from: with auto-remove on, the last winner comes off first.
  const pendingAuto = autoRemove && !!pending;
  const nextNames = useMemo(
    () => (pendingAuto ? parseEntries(removeEntry(text, pending.idx, pending.name)) : allNames).slice(0, MAX_SLICES),
    [pendingAuto, pending, text, allNames]
  );
  const nextN = nextNames.length;
  const dups = useMemo(() => duplicateCounts(nextNames), [nextNames]);
  const anyDups = useMemo(() => new Set(allNames).size !== allNames.length, [allNames]);
  const spinCount = history.length ? history[history.length - 1].n : 0;
  const soundOn = sound && !reduce;

  const slices = useMemo(() => names.map((name, i) => {
    const a0 = i * SEG, a1 = (i + 1) * SEG, mid = a0 + SEG / 2;
    const [x0, y0] = pt(R, a0);
    const [x1, y1] = pt(R, a1);
    const large = SEG > 180 ? 1 : 0;
    const d = `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    const [lx, ly] = pt(R * 0.58, mid);
    const rot = mid > 180 ? mid + 90 : mid - 90; // keep labels upright & radial
    const label = name.length > 24 ? name.slice(0, 23) + "…" : name;
    return { d, lx, ly, rot, label, fill: PALETTE[i % PALETTE.length] };
  }), [names, SEG]);

  const fontSize = N > 20 ? 8 : N > 12 ? 10 : N > 7 ? 12 : 13;

  // ---- optional tick sound (Web Audio, created on a user gesture) ----
  function ensureAudio() {
    try {
      let ctx = audioRef.current;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        audioRef.current = ctx;
      }
      if (ctx.state === "suspended" && ctx.resume) {
        const p = ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function tick() {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1000, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.01);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.012);
    } catch (e) { /* ignore */ }
  }

  function stopTicks() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }

  // Follows the CSS transition by reading the wheel's live angle every frame and
  // ticks whenever a slice edge passes the pointer. The wheel only turns forward.
  function startTicks(seg) {
    stopTicks();
    const el = wheelRef.current;
    if (!el || typeof window.requestAnimationFrame !== "function") return;
    let prev = null, total = 0, edge = 0;
    const step = () => {
      const a = readAngle(el);
      if (a !== null) {
        if (prev === null) {
          total = ((a % 360) + 360) % 360;
          edge = Math.floor(total / seg);
        } else {
          let d = (((a - prev) % 360) + 360) % 360;
          if (d > 300) d -= 360; // rounding jitter, not a real near-full turn
          total += d;
          const e = Math.floor(total / seg);
          if (e !== edge) { edge = e; tick(); }
        }
        prev = a;
      }
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
  }

  // ---- the spin ----
  function spin() {
    if (spinningRef.current) return;
    let entries = allNames;
    if (autoRemove && pending) {
      // The previous winner stays under the pointer until now, then comes off.
      const next = removeEntry(text, pending.idx, pending.name);
      if (next !== text) {
        setText(next);
        entries = parseEntries(next);
      }
      setPending(null);
      setWinner(null);
    }
    const wheel = entries.slice(0, MAX_SLICES);
    const count = wheel.length;
    if (count < 2) return;

    // The winner is decided here, before the wheel moves; the animation is the reveal.
    const idx = secureRandomInt(count);
    // Land somewhere in the middle 70% of the slice so the result is never on an edge.
    const frac = 0.5 + (secureRandomInt(1000) / 1000 - 0.5) * 0.7;
    const cfg = SPIN_LENGTHS[spinLength] || SPIN_LENGTHS.normal;
    const turns = reduce ? 0 : cfg.turns;
    const ms = reduce ? 30 : cfg.secs * 1000 + 200;
    const result = { name: wheel[idx], idx };

    spinningRef.current = true;
    setSpinning(true);
    setWinner(null);
    setPending(null);
    setRotation(landingRotation(rotation, idx, count, frac, turns));
    if (soundOn && ensureAudio()) startTicks(360 / count);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      stopTicks();
      spinningRef.current = false;
      setSpinning(false);
      setWinner({ name: result.name });
      setPending(result);
      setHistory((h) => {
        const n = h.length ? h[h.length - 1].n + 1 : 1;
        const next = h.concat({ n, name: result.name });
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });
    }, ms);
  }

  const removeWinner = () => {
    if (!pending) return;
    setText(removeEntry(text, pending.idx, pending.name));
    setPending(null);
    setWinner(null);
  };

  // ---- list tools ----
  // `moved` is where the winning entry sits in the new list (shuffle / sort / dedupe):
  // the winner card stays and a pending removal follows it. A new list (moved
  // undefined) starts fresh.
  const replaceList = (next, moved) => {
    if (next === text) return;
    setUndoText(text);
    setText(next);
    if (moved === undefined) {
      setWinner(null);
      setPending(null);
    } else {
      setPending(pending && moved >= 0 ? { name: pending.name, idx: moved } : null);
    }
  };
  const runListTool = (fn) => {
    const r = fn(allNames, pending ? pending.idx : -1);
    replaceList(r.items.join("\n"), r.idx);
  };
  const doShuffle = () => runListTool(shuffleTracked);
  const doSort = () => runListTool(sortTracked);
  const doDedupe = () => runListTool(dedupeTracked);
  const doQuickList = (items) => replaceList(items.join("\n"));
  const doUndo = () => {
    if (undoText === null) return;
    setText(undoText);
    setUndoText(null);
    setWinner(null);
    setPending(null);
  };
  const doClear = () => {
    if (text !== "") setUndoText(text);
    setText("");
    setHistory([]);
    setWinner(null);
    setPending(null);
    setCopied(false);
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
  };

  const clearHistory = () => { setHistory([]); setCopied(false); };

  async function copyHistory() {
    if (!history.length) return;
    try {
      await copyText(historyText(history));
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function toggleFs() {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) { const p = req.call(el); if (p && p.catch) p.catch(() => {}); }
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) { const p = exit.call(document); if (p && p.catch) p.catch(() => {}); }
      }
    } catch (e) { /* fullscreen blocked — the inline wheel still works */ }
  }

  const canSpin = !spinning && N >= 2;
  const cfg = SPIN_LENGTHS[spinLength] || SPIN_LENGTHS.normal;
  const wheelSize = isFs ? "min(80vh, 90vw, calc(100vh - 230px))" : undefined;

  const stageStyle = isFs
    ? { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16, background: "var(--bg)", color: "var(--text)", overflow: "auto" }
    : { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 };

  const short = (s) => (s.length > 18 ? s.slice(0, 17) + "…" : s);

  return (
    <div className="tool">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 20, alignItems: "start" }}>
        {/* ---- wheel, result and spin controls (this is what goes full screen) ---- */}
        <div ref={stageRef} style={stageStyle}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <svg
              ref={svgRef}
              viewBox="0 0 220 220"
              width="380"
              height="380"
              style={{ maxWidth: "100%", width: wheelSize, height: wheelSize || "auto", cursor: canSpin ? "pointer" : "default" }}
              onClick={spin}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); spin(); }
              }}
              tabIndex={0}
              role="button"
              aria-disabled={!canSpin}
              aria-label={
                spinning ? "Wheel spinning"
                  : N < 2 ? "Wheel of names — add at least 2 entries to spin"
                    : `Wheel of names with ${N} entries — press Enter or Space to spin`
              }
            >
              {N >= 2 ? (
                <>
                  <g ref={wheelRef} style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "110px 110px", transition: spinning && !reduce ? `transform ${cfg.secs}s cubic-bezier(0.16,0.73,0.09,1)` : "none" }}>
                    {slices.map((s, i) => {
                      // Labels are drawn radially, centred at r=58, with ~74px of room
                      // before the rim. Shrink the font so a long name fits in full
                      // instead of truncating; only very long names (>24 chars) get an
                      // ellipsis. textLength is a final safety cap so nothing can ever
                      // spill past the rim even on the widest glyphs.
                      const fs = Math.max(7, Math.min(fontSize, Math.floor(74 / (s.label.length * 0.6))));
                      const estW = s.label.length * fs * 0.62;
                      const tl = estW > 74 ? 74 : undefined;
                      return (
                        <g key={i}>
                          <path d={s.d} fill={s.fill} stroke="#ffffff" strokeWidth="1" />
                          <text x={s.lx} y={s.ly} fill="#ffffff" fontSize={fs} fontWeight="700" textAnchor="middle" dominantBaseline="central" transform={`rotate(${s.rot} ${s.lx} ${s.ly})`} textLength={tl} lengthAdjust={tl ? "spacingAndGlyphs" : undefined}>{s.label}</text>
                        </g>
                      );
                    })}
                    <circle cx="110" cy="110" r="16" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
                  </g>
                  <polygon points="110,28 94,2 126,2" fill="var(--text)" stroke="var(--surface)" strokeWidth="2" strokeLinejoin="round" />
                </>
              ) : (
                <>
                  <circle cx="110" cy="110" r="100" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2" />
                  <text x="110" y="112" textAnchor="middle" dominantBaseline="central" fill="var(--muted)" fontSize="12">Add 2+ names</text>
                </>
              )}
            </svg>
          </div>

          <div className="sr-only" role="status" aria-live="polite">{spinning ? "Spinning the wheel" : winner && !winner.restored ? `Winner: ${winner.name}` : ""}</div>

          {winner && !spinning && (
            <div className="tool-result" style={{ textAlign: "center", minWidth: isFs ? "min(420px, 90vw)" : undefined }}>
              <p className="tool-result-label">{winner.restored ? "Last winner" : "Winner"}</p>
              <p className="tool-result-value" style={{ fontSize: isFs ? 44 : 32, fontWeight: 800, margin: 0 }}>{winner.name}</p>
              {pendingAuto && (
                <p className="tool-note" style={{ marginTop: 6 }}>“{short(winner.name)}” comes off the wheel when you spin again.</p>
              )}
              {!pending && allNames.includes(winner.name) && (
                <p className="tool-note" style={{ marginTop: 6 }}>
                  {autoRemove
                    ? `You edited the list, so “${short(winner.name)}” won't come off automatically. Delete it from the list if it shouldn't be drawn again.`
                    : `You edited the list, so delete “${short(winner.name)}” from the list yourself if it shouldn't be drawn again.`}
                </p>
              )}
            </div>
          )}

          <div className="tool-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={spin} disabled={!canSpin}>
              {spinning ? "Spinning…" : winner ? "Spin again" : "Spin the wheel"}
            </button>
            {winner && pending && !spinning && !autoRemove && (
              <button type="button" className="btn" onClick={removeWinner}>Remove “{short(winner.name)}”</button>
            )}
            {fsEnabled && (
              <button type="button" className="btn" onClick={toggleFs}>{isFs ? "Exit full screen" : "Full screen"}</button>
            )}
          </div>
        </div>

        {/* ---- the list and options ---- */}
        <div className="tool-fields">
          <div className="tool-field">
            <label className="tool-label" htmlFor="won-names">Names or options (one per line)</label>
            <textarea
              id="won-names"
              className="tool-textarea"
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setUndoText(null);
                setPending(null); // can't tell where the winner went any more, so nothing comes off by name
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); spin(); }
              }}
              placeholder="Enter one name per line"
              readOnly={spinning}
              aria-describedby="won-count"
              style={spinning ? { opacity: 0.7 } : undefined}
            />
            <p id="won-count" className="tool-note" style={{ margin: "4px 0 0" }}>
              {N === 0
                ? "No entries yet — add at least 2 to spin."
                : N === 1
                  ? `Only “${short(names[0])}” is left — add at least one more entry to spin.`
                  : pendingAuto
                    ? `${N} entries on the wheel — “${short(pending.name)}” comes off before the next spin, leaving ${nextN}. Ctrl+Enter (⌘+Enter on Mac) spins from here.`
                    : `${N} entries on the wheel. Ctrl+Enter (⌘+Enter on Mac) spins from here.`}
            </p>
          </div>

          {extra > 0 && (
            <p className="tool-note" role="note">
              Only the first {MAX_SLICES} entries fit on the wheel — {extra} more {extra === 1 ? "isn't" : "aren't"} included.
              For longer lists use the <a href={PICKER_URL} style={{ textDecoration: "underline" }}>Random Name Picker</a>.
            </p>
          )}

          {dups.length > 0 && (
            <p className="tool-note" role="note">
              {dups.slice(0, 3).map((d) => (pendingAuto
                ? `“${short(d.name)}” has ${d.count} entries in the next spin, so a ${d.count} in ${nextN} (${fmtPct((d.count / nextN) * 100)}) chance.`
                : `“${short(d.name)}” is on the wheel ${d.count} times, so it has a ${d.count} in ${nextN} (${fmtPct((d.count / nextN) * 100)}) chance each spin.`)).join(" ")}
              {dups.length > 3 ? ` ${dups.length - 3} more ${dups.length - 3 === 1 ? "entry is" : "entries are"} listed more than once.` : ""}
              {" "}Remove duplicates evens everyone out.
            </p>
          )}

          <div className="tool-actions" role="group" aria-label="List tools">
            <button type="button" className="btn btn-sm" onClick={doShuffle} disabled={spinning || allNames.length < 2} style={offStyle(spinning || allNames.length < 2)}>Shuffle</button>
            <button type="button" className="btn btn-sm" onClick={doSort} disabled={spinning || allNames.length < 2} style={offStyle(spinning || allNames.length < 2)}>Sort A–Z</button>
            <button type="button" className="btn btn-sm" onClick={doDedupe} disabled={spinning || !anyDups} style={offStyle(spinning || !anyDups)}>Remove duplicates</button>
            <button type="button" className="btn btn-sm" onClick={doClear} disabled={spinning || (text === "" && history.length === 0)} style={offStyle(spinning || (text === "" && history.length === 0))}>Clear</button>
            {undoText !== null && (
              <button type="button" className="btn btn-sm" onClick={doUndo} disabled={spinning} style={offStyle(spinning)}>Undo</button>
            )}
          </div>

          <div className="tool-field">
            <span className="tool-label" id="won-quick">Quick lists (Undo brings your own list back)</span>
            <div className="chips" role="group" aria-labelledby="won-quick">
              {QUICK_LISTS.map((q) => (
                <button key={q.id} type="button" className="chip" onClick={() => doQuickList(q.items)} disabled={spinning} style={{ cursor: spinning ? "not-allowed" : "pointer", opacity: spinning ? 0.45 : undefined }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="won-autoremove" style={{ fontWeight: "normal" }}>
              <input id="won-autoremove" type="checkbox" checked={autoRemove} onChange={(e) => setAutoRemove(e.target.checked)} style={{ marginRight: "0.5rem" }} />
              Remove the winner after each spin
            </label>
            <label className="tool-label" htmlFor="won-sound" style={{ fontWeight: "normal" }}>
              <input
                id="won-sound"
                type="checkbox"
                checked={soundOn}
                disabled={reduce}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSound(on);
                  if (on) ensureAudio();
                  else stopTicks();
                }}
                style={{ marginRight: "0.5rem" }}
              />
              Tick sound while spinning{reduce ? " (off while reduced motion is on)" : ""}
            </label>
          </div>

          <div className="tool-field">
            <span className="tool-label" id="won-length">Spin length</span>
            <div className="seg-toggle" role="group" aria-labelledby="won-length" style={{ alignSelf: "flex-start" }}>
              {Object.keys(SPIN_LENGTHS).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`seg-btn ${spinLength === k ? "is-active" : ""}`}
                  aria-pressed={spinLength === k}
                  onClick={() => setSpinLength(k)}
                  disabled={spinning}
                  style={offStyle(spinning)}
                >
                  {SPIN_LENGTHS[k].label} {SPIN_LENGTHS[k].secs} s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{nextN}</div>
          <div className="tool-stat-label">{pendingAuto ? "Entries in the next spin" : "Entries on the wheel"}</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{nextN >= 2 ? fmtPct(100 / nextN) : "—"}</div>
          <div className="tool-stat-label">{pendingAuto ? "Chance per entry, next spin" : "Chance per entry, each spin"}</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{spinCount}</div>
          <div className="tool-stat-label">Spins</div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="tool-result">
          <p className="tool-result-label">Spin history ({spinCount})</p>
          <ol start={history[0].n} style={{ margin: "6px 0 0", paddingLeft: "1.8rem", lineHeight: 1.7, maxHeight: 260, overflowY: "auto" }}>
            {history.map((h) => (
              <li key={h.n} style={{ wordBreak: "break-word" }}>{h.name}</li>
            ))}
          </ol>
          <div className="tool-actions" style={{ marginTop: 12 }}>
            <button type="button" className={copied ? "btn btn-sm btn-success" : "btn btn-sm"} onClick={copyHistory}>
              {copied ? "Copied!" : "Copy history"}
            </button>
            <button type="button" className="btn btn-sm" onClick={clearHistory} disabled={spinning} style={offStyle(spinning)}>Clear history</button>
          </div>
          <p className="tool-note" style={{ margin: "8px 0 0" }}>The history isn&apos;t saved: it clears when you refresh or leave the page, so copy it if you need a record.</p>
        </div>
      )}

      <p className="tool-note">
        The winner is drawn with your browser&apos;s cryptographic random number generator before the wheel starts
        turning, and every entry has the same chance on each spin. Your list is saved only in this browser on this
        device — it is never uploaded. Press Clear to erase it.
      </p>
    </div>
  );
}
