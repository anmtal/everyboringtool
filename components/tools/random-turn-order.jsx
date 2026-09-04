"use client";

import { useCallback, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const TWO_32 = 0x100000000; // 2^32

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(TWO_32 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// Fisher-Yates shuffle built on randInt, returning a new array.
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// Ordinal label for a 1-based position: 1 -> "1st", 22 -> "22nd", 113 -> "113th".
function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export default function RandomTurnOrder() {
  const [text, setText] = useState("");
  const [order, setOrder] = useState([]);
  const [copied, setCopied] = useState(false);

  const names = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [text]);

  const canShuffle = names.length >= 2;

  const runShuffle = useCallback(() => {
    setCopied(false);
    if (!canShuffle) {
      setOrder([]);
      return;
    }
    setOrder(shuffle(names));
  }, [canShuffle, names]);

  const clearAll = useCallback(() => {
    setText("");
    setOrder([]);
    setCopied(false);
  }, []);

  const joined = useMemo(() => {
    return order.map((name, i) => `${i + 1}. ${name}`).join("\n");
  }, [order]);

  async function handleCopy() {
    if (order.length === 0) return;
    try {
      await copyText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rto-list">
            Names (one per line)
          </label>
          <textarea
            id="rto-list"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Alice\nBob\nCharlie\nDana\n…"}
            rows={10}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={runShuffle}
          disabled={!canShuffle}
        >
          {order.length > 0 ? "Re-shuffle order" : "Shuffle order"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={order.length === 0}
        >
          {copied ? "Copied!" : "Copy order"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={clearAll}
          disabled={text === "" && order.length === 0}
        >
          Clear
        </button>
      </div>

      {names.length < 2 ? (
        <p className="tool-note">
          Add at least two names above — one per line. Then press
          &ldquo;Shuffle order&rdquo; to set a random turn order.
        </p>
      ) : order.length === 0 ? (
        <p className="tool-note">
          {names.length.toLocaleString("en-US")} names ready. Press
          &ldquo;Shuffle order&rdquo; to randomize who goes first.
        </p>
      ) : (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{order[0]}</div>
              <div className="tool-stat-label">Goes first</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {order.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">In the order</div>
            </div>
          </div>

          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">Turn order</p>
            <ol style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none" }}>
              {order.map((name, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.75rem",
                    padding: "0.35rem 0",
                    borderBottom:
                      i < order.length - 1
                        ? "1px solid var(--border, #e2e2e2)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      minWidth: "3.2rem",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      opacity: 0.7,
                    }}
                  >
                    {ordinal(i + 1)}
                  </span>
                  <span
                    style={{
                      wordBreak: "break-word",
                      fontSize: "1.05rem",
                    }}
                  >
                    {name}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      <p className="tool-note">
        The order is set with your browser&apos;s built-in cryptographic random
        generator (crypto.getRandomValues), so every arrangement is equally
        likely. Everything runs locally — your names never leave your browser.
      </p>
    </div>
  );
}
