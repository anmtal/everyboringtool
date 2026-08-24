"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function CoinFlip() {
  const [rot, setRot] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState(null); // "Heads" | "Tails"
  const [tally, setTally] = useState({ heads: 0, tails: 0 });
  const [reduce, setReduce] = useState(false);
  const timer = useRef(null);
  const pending = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);

  const flip = useCallback(() => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);
    const heads = Math.random() < 0.5;
    pending.current = heads ? "Heads" : "Tails";
    const targetMod = heads ? 0 : 180;
    const cur = ((rot % 360) + 360) % 360;
    let delta = targetMod - cur;
    if (delta < 0) delta += 360;
    const spins = reduce ? 0 : 5;
    setRot(rot + spins * 360 + delta);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setFlipping(false);
      setResult(pending.current);
      setTally((t) => (heads ? { ...t, heads: t.heads + 1 } : { ...t, tails: t.tails + 1 }));
    }, reduce ? 30 : 1300);
  }, [flipping, rot, reduce]);

  const flips = tally.heads + tally.tails;

  return (
    <div className="tool">
      <div className="coinflip-stage">
        <div className="coin" style={{ transform: `rotateX(${rot}deg)`, transition: flipping && !reduce ? "transform 1.25s cubic-bezier(.2,.72,.15,1)" : "none" }}>
          <div className="coin-face coin-heads"><span>Heads</span></div>
          <div className="coin-face coin-tails"><span>Tails</span></div>
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">{flipping ? "Flipping the coin" : result ? result : ""}</div>

      {result && !flipping && (
        <div className="tool-result" style={{ textAlign: "center" }}>
          <p className="tool-result-value" style={{ fontSize: 34, fontWeight: 800 }}>{result}!</p>
        </div>
      )}

      <div className="tool-actions" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-primary" onClick={flip} disabled={flipping}>
          {flipping ? "Flipping…" : result ? "Flip again" : "Flip the coin"}
        </button>
      </div>

      {flips > 0 && (
        <p className="tool-note" style={{ textAlign: "center" }}>
          Heads {tally.heads} · Tails {tally.tails} · {flips} flip{flips === 1 ? "" : "s"}
        </p>
      )}

      <p className="tool-note">
        A fair 50/50 virtual coin toss — flip to settle a quick decision or a friendly bet. Free, no sign-up, and it runs
        entirely in your browser.
      </p>
    </div>
  );
}
