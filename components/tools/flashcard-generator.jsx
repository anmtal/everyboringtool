"use client";

import { useMemo, useState } from "react";

// Try, in order of preference, a set of separators that split a pasted line
// into "term" and "definition". We look for the FIRST occurrence of a
// space-padded dash first so definitions containing commas/colons survive.
const SEPARATORS = [
  " - ",
  " — ",
  " – ",
  "\t",
  " = ",
  " : ",
  ": ",
  " | ",
  "|",
  "=",
  ",",
];

function splitLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return null;
  for (const sep of SEPARATORS) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      const term = line.slice(0, idx).trim();
      const definition = line.slice(idx + sep.length).trim();
      if (term && definition) return { term, definition };
    }
  }
  // No usable separator found — treat the whole line as a term with no back.
  return { term: line, definition: "" };
}

function parseBulk(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const cards = [];
  for (const line of lines) {
    const parsed = splitLine(line);
    if (parsed && parsed.term) cards.push(parsed);
  }
  return cards;
}

let idCounter = 0;
function makeCard(term, definition) {
  idCounter += 1;
  return {
    id: `c${idCounter}`,
    term,
    definition,
    known: false,
  };
}

// Fisher–Yates shuffle over a copy of the array.
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardGenerator() {
  const [cards, setCards] = useState([]);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState("");

  const [studying, setStudying] = useState(false);
  const [order, setOrder] = useState([]); // array of card ids defining study order
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hideKnown, setHideKnown] = useState(false);

  const knownCount = useMemo(() => cards.filter((c) => c.known).length, [cards]);

  // Cards visible in the current study session (respecting "hide known").
  const studyDeck = useMemo(() => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean);
    if (hideKnown) return ordered.filter((c) => !c.known);
    return ordered;
  }, [cards, order, hideKnown]);

  const total = studyDeck.length;
  const safePos = total > 0 ? Math.min(pos, total - 1) : 0;
  const current = total > 0 ? studyDeck[safePos] : null;

  function handleAdd(e) {
    if (e) e.preventDefault();
    const t = term.trim();
    const d = definition.trim();
    if (!t) {
      setError("Enter a term for the front of the card.");
      return;
    }
    setCards((prev) => [...prev, makeCard(t, d)]);
    setTerm("");
    setDefinition("");
    setError("");
  }

  function handleImport() {
    const parsed = parseBulk(bulk);
    if (parsed.length === 0) {
      setError("No cards found. Put one card per line, like: term - definition");
      return;
    }
    setCards((prev) => [...prev, ...parsed.map((p) => makeCard(p.term, p.definition))]);
    setBulk("");
    setError("");
  }

  function handleDelete(id) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function handleClearAll() {
    setCards([]);
    setError("");
    setStudying(false);
  }

  function toggleKnownInList(id) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, known: !c.known } : c))
    );
  }

  function startStudy(shuffle) {
    if (cards.length === 0) {
      setError("Add at least one card before studying.");
      return;
    }
    const ids = cards.map((c) => c.id);
    setOrder(shuffle ? shuffled(ids) : ids);
    setPos(0);
    setFlipped(false);
    setStudying(true);
    setError("");
  }

  function stopStudy() {
    setStudying(false);
    setFlipped(false);
  }

  function goNext() {
    if (total === 0) return;
    setFlipped(false);
    setPos((p) => (p + 1) % total);
  }

  function goPrev() {
    if (total === 0) return;
    setFlipped(false);
    setPos((p) => (p - 1 + total) % total);
  }

  function shuffleDeck() {
    setOrder((prev) => shuffled(prev));
    setPos(0);
    setFlipped(false);
  }

  function toggleCurrentKnown() {
    if (!current) return;
    setCards((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, known: !c.known } : c))
    );
  }

  function resetKnown() {
    setCards((prev) => prev.map((c) => ({ ...c, known: false })));
  }

  function onCardKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  }

  const border = "1px solid rgba(128, 128, 128, 0.35)";
  const knownColor = "#2ea043";

  // ---- Study mode view -------------------------------------------------
  if (studying) {
    return (
      <div className="tool">
        <div className="tool-actions">
          <button className="btn" type="button" onClick={stopStudy}>
            ← Back to editing
          </button>
          <button className="btn" type="button" onClick={shuffleDeck}>
            Shuffle
          </button>
          <button className="btn" type="button" onClick={resetKnown}>
            Reset known
          </button>
          <label
            className="tool-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5em",
              cursor: "pointer",
              margin: 0,
            }}
          >
            <input
              type="checkbox"
              checked={hideKnown}
              onChange={(e) => {
                setHideKnown(e.target.checked);
                setPos(0);
                setFlipped(false);
              }}
            />
            Hide known cards
          </label>
        </div>

        {total === 0 ? (
          <div className="tool-note" style={{ marginTop: "1rem" }}>
            {hideKnown
              ? "Every card is marked known. Uncheck “Hide known cards” or reset to keep studying."
              : "No cards to study."}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                margin: "0.25rem 0 0.75rem",
                fontSize: "0.95rem",
                opacity: 0.8,
              }}
            >
              <span>
                Card {safePos + 1} / {total}
              </span>
              <span>
                {knownCount} of {cards.length} known
              </span>
            </div>

            {/* Flip card */}
            <div style={{ perspective: "1200px" }}>
              <div
                role="button"
                tabIndex={0}
                aria-label={
                  flipped ? "Definition. Click to see the term." : "Term. Click to reveal the definition."
                }
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={onCardKeyDown}
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: "220px",
                  cursor: "pointer",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s ease",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front (term) */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "1.5rem",
                    boxSizing: "border-box",
                    border,
                    borderRadius: "14px",
                    background: "rgba(128, 128, 128, 0.08)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: 0.55,
                      marginBottom: "0.75rem",
                    }}
                  >
                    Term
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 600, wordBreak: "break-word" }}>
                    {current.term}
                  </div>
                  {current.known ? (
                    <div style={{ marginTop: "0.9rem", color: knownColor, fontSize: "0.85rem", fontWeight: 600 }}>
                      ✓ Known
                    </div>
                  ) : null}
                </div>

                {/* Back (definition) */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "1.5rem",
                    boxSizing: "border-box",
                    border,
                    borderRadius: "14px",
                    background: "rgba(46, 160, 67, 0.10)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: 0.55,
                      marginBottom: "0.75rem",
                    }}
                  >
                    Definition
                  </div>
                  <div style={{ fontSize: "1.25rem", wordBreak: "break-word" }}>
                    {current.definition ? current.definition : "(no definition)"}
                  </div>
                </div>
              </div>
            </div>

            <p className="tool-note" style={{ textAlign: "center", marginTop: "0.6rem" }}>
              Click the card to flip between term and definition.
            </p>

            <div className="tool-actions" style={{ justifyContent: "center" }}>
              <button className="btn" type="button" onClick={goPrev}>
                ← Previous
              </button>
              <button
                className={current.known ? "btn btn-success" : "btn"}
                type="button"
                onClick={toggleCurrentKnown}
              >
                {current.known ? "✓ Known" : "Mark known"}
              </button>
              <button className="btn btn-primary" type="button" onClick={goNext}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- Edit / build view ----------------------------------------------
  return (
    <div className="tool">
      <div className="tool-fields">
        <form className="tool-row" onSubmit={handleAdd}>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fc-term">
              Term (front)
            </label>
            <input
              id="fc-term"
              className="tool-input"
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. Photosynthesis"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fc-def">
              Definition (back)
            </label>
            <input
              id="fc-def"
              className="tool-input"
              type="text"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="e.g. How plants make food from light"
            />
          </div>
        </form>

        <div className="tool-actions">
          <button className="btn btn-primary" type="button" onClick={handleAdd}>
            Add card
          </button>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="fc-bulk">
            Or paste many at once (one per line: term - definition)
          </label>
          <textarea
            id="fc-bulk"
            className="tool-textarea"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"mitochondria - the powerhouse of the cell\nHTTP - HyperText Transfer Protocol\nbonjour = hello"}
            rows={6}
            spellCheck={false}
          />
          <p className="tool-note" style={{ marginTop: "0.4rem" }}>
            Separate the term and definition with a dash, tab, colon, equals sign, or pipe.
          </p>
        </div>

        <div className="tool-actions">
          <button className="btn" type="button" onClick={handleImport}>
            Import lines
          </button>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{cards.length}</div>
          <div className="tool-stat-label">Cards</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{knownCount}</div>
          <div className="tool-stat-label">Known</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{cards.length - knownCount}</div>
          <div className="tool-stat-label">To learn</div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-success"
          type="button"
          onClick={() => startStudy(false)}
          disabled={cards.length === 0}
        >
          Study
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => startStudy(true)}
          disabled={cards.length === 0}
        >
          Study (shuffled)
        </button>
        {cards.length > 0 ? (
          <button className="btn" type="button" onClick={handleClearAll}>
            Clear all
          </button>
        ) : null}
      </div>

      {cards.length > 0 ? (
        <div className="tool-field">
          <label className="tool-result-label">Your cards</label>
          <div
            style={{
              border,
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {cards.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.65rem 0.85rem",
                  borderTop: i === 0 ? "none" : "1px solid rgba(128, 128, 128, 0.22)",
                }}
              >
                <div style={{ flex: "0 0 auto", opacity: 0.5, fontVariantNumeric: "tabular-nums", minWidth: "1.6em" }}>
                  {i + 1}.
                </div>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{c.term}</div>
                  <div style={{ opacity: 0.75, wordBreak: "break-word" }}>
                    {c.definition || <span style={{ opacity: 0.6 }}>(no definition)</span>}
                  </div>
                </div>
                <button
                  className="btn"
                  type="button"
                  onClick={() => toggleKnownInList(c.id)}
                  style={{
                    flex: "0 0 auto",
                    padding: "0.25rem 0.6rem",
                    color: c.known ? knownColor : "inherit",
                    borderColor: c.known ? knownColor : undefined,
                  }}
                  aria-pressed={c.known}
                  title={c.known ? "Marked known" : "Mark as known"}
                >
                  {c.known ? "✓ Known" : "Known?"}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  style={{ flex: "0 0 auto", padding: "0.25rem 0.6rem" }}
                  aria-label={`Delete card ${i + 1}`}
                  title="Delete card"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="tool-note">
          Add term/definition pairs above, or paste a whole list, then hit Study to flip through
          them one card at a time.
        </p>
      )}

      <p className="tool-note">
        Build a deck of flashcards, then study them one at a time — click any card to flip between
        the term and its definition, mark the ones you know, and shuffle for a fresh order.
        Everything runs live in your browser, and nothing you type is ever uploaded.
      </p>
    </div>
  );
}
