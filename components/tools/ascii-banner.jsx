"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// A hand-built 5x7 bitmap font. Each glyph is 7 rows of 5 columns, where "#"
// means a filled pixel and "." means empty. The banner is rendered by walking
// each of the 7 rows across every character, swapping "#" for the chosen fill
// character and "." for the background character (a space by default). This is
// the same idea as classic FIGlet "banner" fonts, done entirely in the browser
// with no external font files or network calls.
const FONT = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["#####", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "(": ["..##.", ".#...", ".#...", ".#...", ".#...", ".#...", "..##."],
  ")": [".##..", "...#.", "...#.", "...#.", "...#.", "...#.", ".##.."],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
};

const ROWS = 7;
const GLYPH_WIDTH = 5;

const FILL_OPTIONS = [
  { id: "hash", label: "# hash", char: "#" },
  { id: "block", label: "█ block", char: "█" },
  { id: "star", label: "* star", char: "*" },
  { id: "at", label: "@ at", char: "@" },
  { id: "dollar", label: "$ dollar", char: "$" },
  { id: "o", label: "O letter", char: "O" },
  { id: "custom", label: "Custom…", char: "" },
];

function renderBanner(text, fillChar, bgChar, letterGap) {
  const chars = [];
  for (const raw of text) {
    const key = raw === " " ? " " : raw.toUpperCase();
    if (FONT[key]) chars.push(FONT[key]);
    else if (raw !== "\n" && raw !== "\r") chars.push(FONT[" "]); // unknown -> blank space
  }
  if (chars.length === 0) return "";

  const between = " ".repeat(Math.max(0, letterGap));
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    const parts = chars.map((glyph) =>
      glyph[r].replace(/#/g, fillChar).replace(/\./g, bgChar)
    );
    lines.push(parts.join(between).replace(/\s+$/g, ""));
  }
  return lines.join("\n");
}

export default function AsciiBanner() {
  const [text, setText] = useState("HELLO");
  const [fillId, setFillId] = useState("hash");
  const [customFill, setCustomFill] = useState("$");
  const [gap, setGap] = useState(1);
  const [copied, setCopied] = useState(false);

  const fillChar = useMemo(() => {
    if (fillId === "custom") {
      const c = Array.from(customFill)[0];
      return c || "#";
    }
    return FILL_OPTIONS.find((f) => f.id === fillId)?.char || "#";
  }, [fillId, customFill]);

  // A single visible line of input maps to one 7-row banner block. We support
  // multiple input lines by stacking their banner blocks with a blank line
  // between them.
  const banner = useMemo(() => {
    const inputLines = text.split(/\r?\n/);
    const blocks = inputLines.map((line) =>
      renderBanner(line, fillChar, " ", gap)
    );
    return blocks.join("\n\n");
  }, [text, fillChar, gap]);

  const trimmedForCount = text.replace(/\n/g, "");
  const supported = useMemo(() => {
    let ok = 0;
    let total = 0;
    for (const ch of trimmedForCount) {
      if (ch === " ") continue;
      total++;
      if (FONT[ch.toUpperCase()]) ok++;
    }
    return { ok, total };
  }, [trimmedForCount]);

  const hasBanner = banner.trim().length > 0;

  async function handleCopy() {
    if (!hasBanner) return;
    try {
      await copyText(banner);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!hasBanner) return;
    const blob = new Blob([banner + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe =
      (text.replace(/\n/g, " ").trim().slice(0, 24).replace(/[^a-z0-9]+/gi, "-") ||
        "banner").replace(/^-+|-+$/g, "") || "banner";
    a.download = `${safe}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ab-text">
            Banner text
          </label>
          <textarea
            id="ab-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopied(false);
            }}
            placeholder="Type text to turn into an ASCII banner…"
            rows={2}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ab-fill">
              Fill character
            </label>
            <select
              id="ab-fill"
              className="tool-select"
              value={fillId}
              onChange={(e) => {
                setFillId(e.target.value);
                setCopied(false);
              }}
            >
              {FILL_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {fillId === "custom" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="ab-custom">
                Custom character
              </label>
              <input
                id="ab-custom"
                className="tool-input"
                type="text"
                value={customFill}
                maxLength={2}
                onChange={(e) => {
                  setCustomFill(e.target.value);
                  setCopied(false);
                }}
                placeholder="#"
              />
            </div>
          )}

          <div className="tool-field">
            <label className="tool-label" htmlFor="ab-gap">
              Letter spacing
            </label>
            <select
              id="ab-gap"
              className="tool-select"
              value={String(gap)}
              onChange={(e) => {
                setGap(Number(e.target.value));
                setCopied(false);
              }}
            >
              <option value="1">Normal</option>
              <option value="2">Wide</option>
              <option value="3">Extra wide</option>
              <option value="0">Tight</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className={copied ? "btn btn-success" : "btn btn-primary"}
          type="button"
          onClick={handleCopy}
          disabled={!hasBanner}
        >
          {copied ? "Copied!" : "Copy banner"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={handleDownload}
          disabled={!hasBanner}
        >
          Download .txt
        </button>
      </div>

      {hasBanner ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">ASCII banner</p>
          <pre className="tool-output">{banner}</pre>
        </div>
      ) : (
        <p className="tool-note" role="status" aria-live="polite">
          Type some text above (letters, numbers, and common punctuation) to see
          it rendered as a large ASCII-art banner you can copy or download.
        </p>
      )}

      {supported.total > 0 && supported.ok < supported.total && (
        <p className="tool-note">
          {supported.total - supported.ok} character
          {supported.total - supported.ok === 1 ? " is" : "s are"} not in the
          font and were rendered as blank space.
        </p>
      )}

      <p className="tool-note">
        Each character is drawn from a built-in 5x7 pixel font, so every letter is
        seven lines tall. Paste the result into a monospace context — a terminal,
        code comment, README, chat, or plain-text email — so the columns line up.
        Everything runs in your browser; nothing you type is uploaded.
      </p>
    </div>
  );
}
