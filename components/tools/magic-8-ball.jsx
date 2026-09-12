"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// A classic Magic 8-Ball, 100% client-side. You type a yes/no question (optional),
// then click the ball or press Enter/Space to "shake" it. After a short shake the
// answer surfaces on the blue triangle window. The 20 answers are the original
// Mattel set (10 affirmative, 5 non-committal, 5 negative), picked at random each
// shake. The last few question/answer pairs are kept in localStorage (try/catch so
// private mode never breaks it). Nothing is uploaded.

const LS_KEY = "ebt-magic-8-ball";

const AFFIRMATIVE = [
  "It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
];
const NON_COMMITTAL = [
  "Reply hazy, try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
];
const NEGATIVE = [
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful",
];

// tone drives the little colored dot in the history list
const ANSWERS = [
  ...AFFIRMATIVE.map((t) => ({ t, tone: "yes" })),
  ...NON_COMMITTAL.map((t) => ({ t, tone: "maybe" })),
  ...NEGATIVE.map((t) => ({ t, tone: "no" })),
];

const TONE_LABEL = { yes: "Yes", maybe: "Maybe", no: "No" };

export default function Magic8Ball() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle"); // "idle" | "shaking" | "revealed"
  const [answer, setAnswer] = useState(null); // { t, tone }
  const [history, setHistory] = useState([]);
  const [reduce, setReduce] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const timerRef = useRef(null);
  const pendingRef = useRef(null);
  const phaseRef = useRef(phase);
  const questionRef = useRef(question);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { questionRef.current = question; }, [question]);

  // ---- reduced motion ----
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on);
    };
  }, []);

  // ---- load saved history ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.history)) setHistory(s.history.slice(0, 6));
      }
    } catch (e) { /* private mode / blocked storage — start empty */ }
    setLoaded(true);
  }, []);

  // ---- persist history ----
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ history }));
    } catch (e) { /* ignore */ }
  }, [history, loaded]);

  // ---- the shake ----
  const shake = useCallback(() => {
    if (phaseRef.current === "shaking") return;
    const pick = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    pendingRef.current = pick;
    setAnswer(null);
    setPhase("shaking");
    phaseRef.current = "shaking";
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const p = pendingRef.current;
      setAnswer(p);
      setPhase("revealed");
      phaseRef.current = "revealed";
      const q = questionRef.current.trim();
      setHistory((h) => [
        { q, a: p.t, tone: p.tone, id: Date.now() + Math.random() },
        ...h,
      ].slice(0, 6));
    }, reduce ? 60 : 950);
  }, [reduce]);

  const clearHistory = useCallback(() => setHistory([]), []);

  // ---- keyboard: Space/Enter shakes when you're not typing in the question box ----
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Let the ball / buttons keep their native Enter+Space behavior when focused.
      if (tag === "BUTTON") return;
      if (e.code === "Space" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        shake();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shake]);

  // ---- cleanup ----
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const onInputKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      shake();
    }
  };

  const shaking = phase === "shaking";
  const revealed = phase === "revealed";
  const primaryLabel = shaking ? "Shaking…" : revealed ? "Ask again" : "Shake the 8-ball";

  return (
    <div className="tool m8b">
      <style>{`
        .m8b .m8b-field { margin-bottom: 6px; }
        .m8b .m8b-stage { display:flex; flex-direction:column; align-items:center; gap:14px; padding:10px 0 4px; }
        .m8b .m8b-ball {
          position:relative; display:block; padding:0; border:0; cursor:pointer;
          width:min(320px,80vw); height:min(320px,80vw); border-radius:50%;
          background:
            radial-gradient(circle at 33% 27%, #575c67 0%, #2a2d34 17%, #101216 44%, #060709 72%, #000 100%);
          box-shadow:
            inset 0 -26px 54px rgba(0,0,0,.88),
            inset 0 16px 36px rgba(255,255,255,.05),
            0 26px 54px rgba(0,0,0,.5);
          transition: transform .12s ease-out;
          -webkit-tap-highlight-color: transparent;
        }
        .m8b .m8b-ball::before {
          content:""; position:absolute; top:10%; left:19%; width:36%; height:26%;
          border-radius:50%; pointer-events:none; filter:blur(4px);
          background: radial-gradient(circle at 42% 40%, rgba(255,255,255,.9), rgba(255,255,255,0) 68%);
        }
        .m8b .m8b-ball:not(:disabled):hover { transform: translateY(-2px); }
        .m8b .m8b-ball:not(:disabled):active { transform: scale(.985); }
        .m8b .m8b-ball:focus-visible { outline:3px solid #4f8bff; outline-offset:4px; }

        /* shared centered face plate for the 8 and the answer window */
        .m8b .m8b-face {
          position:absolute; inset:0; margin:auto;
          display:flex; align-items:center; justify-content:center;
          transition: opacity .32s ease;
        }
        .m8b .m8b-hidden { opacity:0; pointer-events:none; }

        /* the white "8" disc (idle) */
        .m8b .m8b-eight {
          width:44%; height:44%; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          color:#0a0a0a; font-weight:900; font-size:min(88px,22vw); line-height:1;
          background: radial-gradient(circle at 40% 34%, #ffffff 0%, #ededf1 58%, #cfcfd6 100%);
          box-shadow: inset 0 3px 8px rgba(255,255,255,.7), inset 0 -6px 14px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.4);
        }

        /* the dark-blue viewing window (shaking + revealed) */
        .m8b .m8b-window {
          position:relative; width:56%; height:56%; border-radius:50%; overflow:hidden;
          display:flex; align-items:center; justify-content:center;
          background: radial-gradient(circle at 50% 38%, #0b1f4d 0%, #071638 58%, #030b1f 100%);
          box-shadow: inset 0 8px 22px rgba(0,0,0,.85), inset 0 -4px 12px rgba(70,110,210,.28);
        }
        .m8b .m8b-tri {
          position:relative; width:88%; height:88%;
          display:flex; align-items:flex-end; justify-content:center;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,.55));
        }
        .m8b .m8b-tri::before {
          content:""; position:absolute; inset:0;
          background: linear-gradient(158deg, #2a5bbd 0%, #163d8c 46%, #0a2450 100%);
          clip-path: polygon(50% 3%, 97% 95%, 3% 95%);
        }
        .m8b .m8b-tri-text {
          position:relative; z-index:1; width:76%; padding-bottom:11%;
          text-align:center; color:#eaf1ff; font-weight:700;
          font-size:clamp(11px,3.7vw,17px); line-height:1.14;
          text-shadow:0 1px 2px rgba(0,0,0,.65);
        }
        .m8b .m8b-dots { position:relative; z-index:1; display:flex; gap:9px; padding-bottom:9%; }
        .m8b .m8b-dots span {
          width:9px; height:9px; border-radius:50%; background:#8fb2ff; opacity:.4;
          animation: m8b-dot 1s ease-in-out infinite;
        }
        .m8b .m8b-dots span:nth-child(2){ animation-delay:.15s; }
        .m8b .m8b-dots span:nth-child(3){ animation-delay:.3s; }
        @keyframes m8b-dot { 0%,100%{opacity:.35;transform:translateY(0);} 50%{opacity:1;transform:translateY(-3px);} }

        @keyframes m8b-shake {
          0%,100%{transform:translate(0,0) rotate(0);}
          14%{transform:translate(-9px,4px) rotate(-4deg);}
          28%{transform:translate(8px,-6px) rotate(3.5deg);}
          42%{transform:translate(-7px,-3px) rotate(-3deg);}
          58%{transform:translate(7px,5px) rotate(3deg);}
          72%{transform:translate(-5px,2px) rotate(-2deg);}
          86%{transform:translate(4px,-2px) rotate(1.5deg);}
        }
        .m8b .m8b-ball.is-shaking { animation: m8b-shake .5s ease-in-out infinite; }
        @keyframes m8b-surface {
          from { opacity:0; transform: translateY(16%) scale(.6); }
          to   { opacity:1; transform: none; }
        }
        .m8b .m8b-ball.is-revealed .m8b-tri { animation: m8b-surface .5s cubic-bezier(.2,.8,.2,1); }

        @media (prefers-reduced-motion: reduce) {
          .m8b .m8b-ball.is-shaking { animation: none; }
          .m8b .m8b-ball.is-revealed .m8b-tri { animation: none; }
          .m8b .m8b-face { transition: none; }
          .m8b .m8b-dots span { animation: none; }
        }

        .m8b .m8b-history { margin-top:20px; }
        .m8b .m8b-history h2 { font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:600; margin:0 0 10px; }
        .m8b .m8b-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
        .m8b .m8b-item {
          display:flex; align-items:flex-start; gap:11px; padding:11px 13px;
          background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm);
        }
        .m8b .m8b-dot { flex:none; width:9px; height:9px; border-radius:50%; margin-top:6px; }
        .m8b .m8b-dot.yes { background:#22a35a; }
        .m8b .m8b-dot.maybe { background:#d99400; }
        .m8b .m8b-dot.no { background:#d23b3b; }
        .m8b .m8b-item-text { display:flex; flex-direction:column; gap:1px; min-width:0; }
        .m8b .m8b-q { font-size:13px; color:var(--muted); word-break:break-word; }
        .m8b .m8b-a { font-size:15px; font-weight:600; word-break:break-word; }
      `}</style>

      <div className="tool-field m8b-field">
        <label className="tool-label" htmlFor="m8b-q">Your yes-or-no question (optional)</label>
        <input
          id="m8b-q"
          className="tool-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Will today be a good day…"
          maxLength={140}
          autoComplete="off"
        />
      </div>

      <div className="m8b-stage">
        <button
          type="button"
          className={`m8b-ball${shaking ? " is-shaking" : ""}${revealed ? " is-revealed" : ""}`}
          onClick={shake}
          disabled={shaking}
          aria-label={shaking ? "Shaking the magic 8-ball" : "Shake the magic 8-ball"}
        >
          <div className={`m8b-face${phase === "idle" ? "" : " m8b-hidden"}`} aria-hidden="true">
            <div className="m8b-eight">8</div>
          </div>
          <div className={`m8b-face${phase === "idle" ? " m8b-hidden" : ""}`} aria-hidden="true">
            <div className="m8b-window">
              {revealed && answer ? (
                <div className="m8b-tri"><div className="m8b-tri-text">{answer.t}</div></div>
              ) : (
                <div className="m8b-tri">
                  <div className="m8b-dots"><span /><span /><span /></div>
                </div>
              )}
            </div>
          </div>
        </button>

        <div className="tool-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={shake} disabled={shaking}>
            {primaryLabel}
          </button>
          {history.length > 0 && (
            <button type="button" className="btn" onClick={clearHistory}>Clear history</button>
          )}
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {shaking ? "Shaking the magic 8-ball" : revealed && answer ? `The magic 8-ball says: ${answer.t}` : ""}
      </div>

      {history.length > 0 && (
        <div className="m8b-history">
          <h2>Recent answers</h2>
          <ul className="m8b-list">
            {history.map((h) => (
              <li key={h.id} className="m8b-item">
                <span className={`m8b-dot ${h.tone}`} title={TONE_LABEL[h.tone]} aria-hidden="true" />
                <span className="m8b-item-text">
                  <span className="m8b-q">{h.q ? h.q : "No question asked"}</span>
                  <span className="m8b-a">{h.a}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="tool-note" style={{ marginTop: 14 }}>
        Ask the magic 8-ball anything, give it a shake, and let fate answer. There are 20 classic replies in
        there — 10 that say yes, 5 that stall, and 5 that say no, each one chosen at random. It's purely for
        fun, so take every prediction with a wink. Your questions stay in this browser and are never uploaded.
      </p>
    </div>
  );
}
