"use client";

import { useState, useEffect, useCallback } from "react";

const SUITS = ["♠", "♥", "♦", "♣"]; // ♠ ♥ ♦ ♣
const RSTR = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const isRed = (s) => s === "♥" || s === "♦";

function makeDeck() {
  const d = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) d.push({ suit, rank, up: false });
  return d;
}
function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
function newGame() {
  const deck = shuffle(makeDeck());
  const tableau = [[], [], [], [], [], [], []];
  let k = 0;
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) {
      const card = deck[k++];
      card.up = n === col;
      tableau[col].push(card);
    }
  }
  const stock = deck.slice(k).map((c) => ({ ...c, up: false }));
  return { stock, waste: [], foundations: [[], [], [], []], tableau, moves: 0, won: false };
}

// is [cards] a valid descending, alternating-colour run?
function validRun(cards) {
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].up) return false;
    if (i > 0) {
      const prev = cards[i - 1], cur = cards[i];
      if (cur.rank !== prev.rank - 1 || isRed(cur.suit) === isRed(prev.suit)) return false;
    }
  }
  return true;
}
function canToTableau(card, topCard) {
  if (!topCard) return card.rank === 13;
  return isRed(card.suit) !== isRed(topCard.suit) && card.rank === topCard.rank - 1;
}
function canToFoundation(card, pile) {
  if (pile.length === 0) return card.rank === 1;
  const top = pile[pile.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

const CARD_W = 44, CARD_H = 62, OVERLAP = 22;

export default function Solitaire() {
  const [game, setGame] = useState(null);
  const [sel, setSel] = useState(null); // {type:'waste'} | {type:'tableau', col, idx}

  useEffect(() => { setGame(newGame()); }, []);

  const reset = useCallback(() => { setGame(newGame()); setSel(null); }, []);

  const draw = useCallback(() => {
    setGame((g) => {
      if (!g) return g;
      const ng = { ...g, stock: g.stock.slice(), waste: g.waste.slice() };
      if (ng.stock.length > 0) {
        const c = ng.stock.pop();
        ng.waste.push({ ...c, up: true });
      } else {
        ng.stock = ng.waste.reverse().map((c) => ({ ...c, up: false }));
        ng.waste = [];
      }
      ng.moves = g.moves + 1;
      return ng;
    });
    setSel(null);
  }, []);

  function movingCards(g, s) {
    if (!s) return [];
    if (s.type === "waste") return g.waste.length ? [g.waste[g.waste.length - 1]] : [];
    return g.tableau[s.col].slice(s.idx);
  }

  const tryMove = useCallback((dest) => {
    setGame((g) => {
      if (!g || !sel) return g;
      const cards = movingCards(g, sel);
      if (!cards.length) return g;
      let ok = false;
      const ng = {
        ...g,
        waste: g.waste.slice(),
        foundations: g.foundations.map((f) => f.slice()),
        tableau: g.tableau.map((t) => t.slice()),
      };
      if (dest.type === "foundation") {
        if (cards.length === 1 && canToFoundation(cards[0], ng.foundations[dest.idx])) {
          ng.foundations[dest.idx].push(cards[0]);
          ok = true;
        }
      } else if (dest.type === "tableau") {
        const col = ng.tableau[dest.idx];
        const top = col[col.length - 1] || null;
        if (validRun(cards) && canToTableau(cards[0], top)) {
          for (const c of cards) col.push(c);
          ok = true;
        }
      }
      if (!ok) return g;
      // remove from source
      if (sel.type === "waste") ng.waste.pop();
      else {
        ng.tableau[sel.col] = ng.tableau[sel.col].slice(0, sel.idx);
        const src = ng.tableau[sel.col];
        if (src.length && !src[src.length - 1].up) src[src.length - 1] = { ...src[src.length - 1], up: true };
      }
      ng.moves = g.moves + 1;
      ng.won = ng.foundations.reduce((s, f) => s + f.length, 0) === 52;
      return ng;
    });
    setSel(null);
  }, [sel]);

  if (!game) return <div className="tool"><p className="tool-note">Dealing…</p></div>;

  const selMatch = (type, col, idx) =>
    sel && sel.type === type && (type === "waste" || (sel.col === col && sel.idx === idx));

  const wasteTop = game.waste[game.waste.length - 1];

  const cardStyle = (card, selected) => ({
    width: CARD_W, height: CARD_H, borderRadius: 6,
    background: "#fff",
    border: selected ? "2px solid #2a7de1" : "1px solid #b9b4ac",
    boxShadow: selected ? "0 0 0 2px rgba(42,125,225,0.35)" : "0 1px 2px rgba(0,0,0,0.18)",
    color: isRed(card.suit) ? "#d23" : "#111",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "3px 5px", font: "600 13px/1 ui-sans-serif,system-ui,sans-serif",
    cursor: "pointer", userSelect: "none", boxSizing: "border-box",
  });
  const backStyle = {
    width: CARD_W, height: CARD_H, borderRadius: 6,
    background: "repeating-linear-gradient(45deg,#3355aa,#3355aa 4px,#2c4890 4px,#2c4890 8px)",
    border: "1px solid #223", boxSizing: "border-box",
  };
  const slotStyle = {
    width: CARD_W, height: CARD_H, borderRadius: 6,
    border: "1px dashed rgba(128,128,128,0.55)", boxSizing: "border-box",
  };
  const face = (card) => (
    <>
      <span>{RSTR[card.rank]}{card.suit}</span>
      <span style={{ alignSelf: "flex-end" }}>{card.suit}</span>
    </>
  );

  return (
    <div className="tool">
      <div className="tool-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" className="btn btn-primary" onClick={reset}>New game</button>
        <span className="tool-note" style={{ margin: 0 }}>Moves: {game.moves}</span>
      </div>

      {game.won && (
        <div className="tool-result"><p className="tool-result-value" style={{ textAlign: "center", fontSize: 20 }}>🎉 You won! Well played.</p></div>
      )}

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 7 * (CARD_W + 6) }}>
          {/* top row: stock, waste, foundations */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <div onClick={draw} style={game.stock.length ? backStyle : slotStyle} title="Draw" role="button" aria-label="Draw from stock" />
            <div
              onClick={() => wasteTop && setSel(selMatch("waste") ? null : { type: "waste" })}
              style={wasteTop ? cardStyle(wasteTop, selMatch("waste")) : slotStyle}
              aria-label="Waste pile"
            >
              {wasteTop && face(wasteTop)}
            </div>
            <div style={{ width: CARD_W }} />
            {game.foundations.map((f, i) => {
              const top = f[f.length - 1];
              return (
                <div key={i} onClick={() => tryMove({ type: "foundation", idx: i })} style={top ? cardStyle(top, false) : slotStyle} aria-label={`Foundation ${i + 1}`}>
                  {top ? face(top) : <span style={{ color: "rgba(128,128,128,0.7)", fontSize: 18, display: "grid", placeItems: "center", height: "100%" }}>A</span>}
                </div>
              );
            })}
          </div>

          {/* tableau */}
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            {game.tableau.map((col, ci) => (
              <div
                key={ci}
                onClick={() => { if (col.length === 0 && sel) tryMove({ type: "tableau", idx: ci }); }}
                style={{ width: CARD_W, minHeight: CARD_H, position: "relative" }}
              >
                {col.length === 0 && <div style={slotStyle} />}
                {col.map((card, i) => {
                  const selected = selMatch("tableau", ci, i);
                  const onClick = (e) => {
                    e.stopPropagation();
                    if (!card.up) return;
                    if (sel) {
                      // clicking a card in another/this column = destination
                      if (!(sel.type === "tableau" && sel.col === ci)) { tryMove({ type: "tableau", idx: ci }); return; }
                    }
                    // select this run (only if it's a valid run from here)
                    if (validRun(col.slice(i))) setSel(selected ? null : { type: "tableau", col: ci, idx: i });
                  };
                  return (
                    <div key={i} onClick={onClick} style={{ position: i === 0 ? "relative" : "absolute", top: i * OVERLAP, left: 0 }}>
                      {card.up ? <div style={cardStyle(card, selected)}>{face(card)}</div> : <div style={backStyle} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="tool-note">
        Klondike solitaire. Click the deck to draw. Click a face-up card to pick it up (it grabs the run below it), then
        click where it goes — a column, or a foundation (top-right, build each suit up from Ace to King). Build columns
        down in alternating colours. Free, and runs entirely in your browser.
      </p>
    </div>
  );
}
