"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { copyText } from "../../lib/copyText";

// A just-for-fun love calculator. The score is DETERMINISTIC: the same pair of
// names always returns the same percentage (a stable FNV-1a hash over the two
// normalized, lowercased names). We sort the pair first so "Alice + Bob" and
// "Bob + Alice" match — the whole point is that the result is repeatable and
// shareable, so there is deliberately no Math.random anywhere in here. Only the
// last-typed names are remembered (localStorage), and nothing is uploaded.

const LS_KEY = "ebt-love-calculator";

const HEART_PATH =
  "M50 87 C48 84 18 62 18 38 C18 25 28 16 39 16 C45 16 49 20 50 25 C51 20 55 16 61 16 C72 16 82 25 82 38 C82 62 52 84 50 87 Z";

// Tiers ordered high → low; first match wins.
const TIERS = [
  { min: 90, label: "Soulmates. Somebody call the caterer.", emoji: "💍", tone: "#ff2d6f" },
  { min: 80, label: "A match made in heaven!", emoji: "💖", tone: "#ff3d7f" },
  { min: 65, label: "Serious chemistry — this could be it.", emoji: "💘", tone: "#ff5a8a" },
  { min: 45, label: "There's a real spark here.", emoji: "✨", tone: "#ff77a1" },
  { min: 30, label: "A slow burn. Give it time.", emoji: "🌱", tone: "#ff9ab6" },
  { min: 15, label: "Just friends... for now.", emoji: "🤝", tone: "#f2a9c4" },
  { min: 0, label: "Better as pen pals, honestly.", emoji: "🫠", tone: "#d7a8be" },
];

function tierFor(score) {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

// keep only letters + digits, lowercased, so spacing / punctuation / case never
// change the result. Handles most accented Latin letters too.
function normalize(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .replace(/[^a-z0-9]/g, "");
}

// FNV-1a 32-bit → stable 0..100. Symmetric because we sort the pair first.
function loveScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return null;
  const combined = [na, nb].sort().join("");
  let h = 0x811c9dc5;
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 101; // 0..100 inclusive
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function LoveCalculator() {
  const [you, setYou] = useState("");
  const [them, setThem] = useState("");
  const [result, setResult] = useState(null); // { score, you, them }
  const [display, setDisplay] = useState(0); // animated 0..score
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const rafRef = useRef(0);
  const copyTimerRef = useRef(null);

  // ---- restore last-typed names ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.you === "string") setYou(s.you);
        if (typeof s.them === "string") setThem(s.them);
      }
    } catch (e) {
      /* private mode / blocked storage — just start empty */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ you, them }));
    } catch (e) {
      /* ignore */
    }
  }, [you, them, loaded]);

  // ---- count-up + heart-fill animation ----
  const animateTo = useCallback((target) => {
    cancelAnimationFrame(rafRef.current);
    const dur = 1300;
    let start = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setDisplay(Math.round(target * easeOutCubic(p)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else setDisplay(target);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const calculate = useCallback(() => {
    setCopied(false);
    const score = loveScore(you, them);
    if (score === null) {
      setError("Enter both names to see the spark.");
      setResult(null);
      setDisplay(0);
      cancelAnimationFrame(rafRef.current);
      return;
    }
    setError("");
    setResult({ score, you: you.trim(), them: them.trim() });
    setDisplay(0);
    animateTo(score);
  }, [you, them, animateTo]);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      calculate();
    },
    [calculate]
  );

  const swap = useCallback(() => {
    setYou(them);
    setThem(you);
  }, [you, them]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setYou("");
    setThem("");
    setResult(null);
    setDisplay(0);
    setError("");
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const t = tierFor(result.score);
    const text = `${result.you} ${t.emoji} ${result.them} = ${result.score}% love — "${t.label}" · everyboringtool.com/tool/love-calculator`;
    try {
      await copyText(text);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      setError("Couldn't copy on this browser — you can select the result text instead.");
    }
  }, [result]);

  // cleanup
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(copyTimerRef.current);
    },
    []
  );

  const tier = result ? tierFor(result.score) : null;
  const fillH = result ? display : 0; // 0..100 in the SVG's 100-tall viewBox

  return (
    <div className="tool love">
      <style>{`
        .love form{margin:0;}
        .love .love-fields{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;}
        .love .love-field{flex:1;min-width:190px;display:flex;flex-direction:column;gap:5px;}
        .love .love-field label{font-size:13px;font-weight:600;color:var(--muted);}
        .love .love-input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;
          border:1px solid var(--border);background:var(--surface,#fff);color:var(--text);font-size:16px;}
        .love .love-input:focus{outline:2px solid #ff5a8a;outline-offset:1px;border-color:#ff5a8a;}
        .love .love-amp{flex:none;align-self:center;font-size:22px;color:#ff5a8a;padding-bottom:8px;user-select:none;}
        .love .love-swap{flex:none;align-self:flex-end;}

        /* the dark reveal stage — matches the site's other rich tools */
        .love .love-stage{position:relative;margin-top:16px;border-radius:14px;overflow:hidden;
          background:radial-gradient(120% 90% at 50% 0%,#2a1120 0%,#160a14 55%,#0c0710 100%);
          border:1px solid #3a1c2e;padding:26px 18px 30px;text-align:center;}
        .love .love-heart-wrap{position:relative;width:min(58vw,190px);margin:2px auto 6px;
          filter:drop-shadow(0 10px 26px rgba(255,45,111,.35));}
        .love .love-heart{display:block;width:100%;height:auto;animation:love-beat 1.15s ease-in-out infinite;transform-origin:50% 55%;}
        .love .love-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:clamp(30px,10vw,46px);font-weight:800;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5);
          padding-top:6px;pointer-events:none;}
        .love .love-pct small{font-size:.5em;font-weight:700;margin-left:1px;}
        .love .love-names{color:#ffd9e6;font-size:15px;font-weight:600;margin:4px 0 10px;word-break:break-word;}
        .love .love-names .amp{color:#ff5a8a;margin:0 7px;}
        .love .love-msg{font-size:clamp(17px,4.4vw,21px);font-weight:700;color:#fff;margin:0 auto;max-width:24em;line-height:1.3;}
        .love .love-msg .em{font-size:1.25em;margin-right:6px;vertical-align:-1px;}
        .love .love-sub{color:#e6b9cb;font-size:12.5px;margin:10px auto 0;max-width:26em;line-height:1.4;}

        .love .love-empty{color:#e9c4d5;font-size:15px;line-height:1.5;max-width:24em;margin:8px auto;}
        .love .love-empty .big{font-size:34px;display:block;margin-bottom:6px;}

        /* floating hearts on reveal */
        .love .love-floats{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
        .love .love-floats span{position:absolute;bottom:-24px;font-size:16px;opacity:0;
          animation:love-float 3.4s ease-in infinite;}
        .love .love-floats span:nth-child(1){left:12%;animation-delay:.0s;font-size:14px;}
        .love .love-floats span:nth-child(2){left:28%;animation-delay:.7s;font-size:20px;}
        .love .love-floats span:nth-child(3){left:47%;animation-delay:1.3s;font-size:12px;}
        .love .love-floats span:nth-child(4){left:66%;animation-delay:.4s;font-size:18px;}
        .love .love-floats span:nth-child(5){left:82%;animation-delay:1.7s;font-size:15px;}

        .love .love-actions2{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:16px;}
        .love .love-err{color:#c81e5b;font-size:13.5px;margin-top:10px;font-weight:600;}
        :root:not([data-theme="light"]) .love .love-err{color:#ff8fb0;}

        @keyframes love-beat{0%,100%{transform:scale(1);}14%{transform:scale(1.09);}28%{transform:scale(1);}42%{transform:scale(1.06);}}
        @keyframes love-float{0%{transform:translateY(0) scale(.7);opacity:0;}
          15%{opacity:.9;}100%{transform:translateY(-230px) scale(1.1);opacity:0;}}
        @media (prefers-reduced-motion: reduce){
          .love .love-heart{animation:none;}
          .love .love-floats span{animation:none;display:none;}
        }
      `}</style>

      <form onSubmit={onSubmit}>
        <div className="love-fields">
          <div className="love-field">
            <label htmlFor="love-you">Your name</label>
            <input
              id="love-you"
              className="love-input"
              type="text"
              autoComplete="off"
              value={you}
              onChange={(e) => setYou(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={40}
            />
          </div>
          <span className="love-amp" aria-hidden="true">💕</span>
          <div className="love-field">
            <label htmlFor="love-them">Their name</label>
            <input
              id="love-them"
              className="love-input"
              type="text"
              autoComplete="off"
              value={them}
              onChange={(e) => setThem(e.target.value)}
              placeholder="e.g. Sam"
              maxLength={40}
            />
          </div>
          <button
            type="button"
            className="btn love-swap"
            onClick={swap}
            title="Swap the two names"
            disabled={!you && !them}
          >
            ⇄ Swap
          </button>
        </div>

        <div className="tool-actions" style={{ marginTop: 14 }}>
          <button type="submit" className="btn btn-primary">
            {result ? "Calculate again" : "Calculate love"}
          </button>
          <button type="button" className="btn" onClick={reset} disabled={!you && !them && !result}>
            Clear
          </button>
        </div>
      </form>

      {error && <p className="love-err" role="alert">{error}</p>}

      <div className="love-stage" role="status" aria-live="polite">
        {result ? (
          <>
            <div className="love-floats" aria-hidden="true">
              <span>💗</span><span>💕</span><span>❤️</span><span>💞</span><span>💓</span>
            </div>

            <div className="love-heart-wrap">
              <svg className="love-heart" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <clipPath id="love-heart-clip">
                    <path d={HEART_PATH} />
                  </clipPath>
                  <linearGradient id="love-heart-grad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ff2d6f" />
                    <stop offset="100%" stopColor="#ff8ab0" />
                  </linearGradient>
                </defs>
                <g clipPath="url(#love-heart-clip)">
                  <rect x="0" y="0" width="100" height="100" fill="rgba(255,255,255,0.08)" />
                  <rect
                    x="0"
                    y={100 - fillH}
                    width="100"
                    height={fillH}
                    fill="url(#love-heart-grad)"
                  />
                </g>
                <path d={HEART_PATH} fill="none" stroke="#ff6f97" strokeWidth="2.5" />
              </svg>
              <div className="love-pct">
                {display}<small>%</small>
              </div>
            </div>

            <p className="love-names">
              {result.you}<span className="amp">💘</span>{result.them}
            </p>
            <p className="love-msg">
              <span className="em" aria-hidden="true">{tier.emoji}</span>
              {tier.label}
            </p>
            <p className="love-sub">
              Same two names always score the same — that's the fun of it. This is a
              lighthearted toy, not a real prediction of anyone's relationship.
            </p>

            <div className="love-actions2">
              <button
                type="button"
                className={copied ? "btn btn-success" : "btn"}
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy result"}
              </button>
            </div>
          </>
        ) : (
          <p className="love-empty">
            <span className="big" aria-hidden="true">💞</span>
            Type two names above and hit <strong>Calculate love</strong> to reveal
            your match percentage.
          </p>
        )}
      </div>

      <p className="tool-note" style={{ marginTop: 14 }}>
        Everything runs in your browser — no names are uploaded or stored anywhere
        but this device. The score is worked out from the letters in each name, so
        the same pairing always gives the same percentage. It's for fun only.
      </p>
    </div>
  );
}
