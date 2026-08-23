"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// International (ITU) Morse code map for letters, digits, and common punctuation.
const TEXT_TO_MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
  6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};

// Reverse lookup for decoding Morse back into text.
const MORSE_TO_TEXT = Object.keys(TEXT_TO_MORSE).reduce((acc, key) => {
  acc[TEXT_TO_MORSE[key]] = key;
  return acc;
}, {});

// Decide whether some input is Morse (dots/dashes/separators) or plain text.
function looksLikeMorse(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[.\-/|\s]+$/.test(trimmed) && /[.\-]/.test(trimmed);
}

function textToMorse(text) {
  const words = text.trim().split(/\s+/);
  return words
    .map((word) =>
      [...word]
        .map((ch) => TEXT_TO_MORSE[ch.toUpperCase()] || "")
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean)
    .join(" / ");
}

function morseToText(code) {
  // Accept | or / as a word separator; collapse spacing.
  const words = code.trim().replace(/\|/g, "/").split(/\s*\/\s*/);
  return words
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((symbol) => MORSE_TO_TEXT[symbol] || "?")
        .join("")
    )
    .join(" ")
    .trim();
}

export default function MorseCodeTranslator() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState("auto"); // auto | toMorse | toText
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);

  // Resolve the effective direction, honoring auto-detect when selected.
  const effective = useMemo(() => {
    if (direction === "toMorse") return "toMorse";
    if (direction === "toText") return "toText";
    return looksLikeMorse(input) ? "toText" : "toMorse";
  }, [direction, input]);

  const output = useMemo(() => {
    if (!input.trim()) return "";
    return effective === "toText" ? morseToText(input) : textToMorse(input);
  }, [input, effective]);

  // The Morse form of the current content, used for audio playback.
  const morseString = useMemo(() => {
    if (effective === "toText") {
      return input.trim().replace(/\|/g, "/");
    }
    return output;
  }, [effective, input, output]);

  const stats = useMemo(() => {
    const chars = input.length;
    const words = input.trim() ? (input.trim().match(/\S+/g) || []).length : 0;
    const signals = (morseString.match(/[.\-]/g) || []).length;
    return { chars, words, signals };
  }, [input, morseString]);

  const fmt = (n) => n.toLocaleString("en-US");

  function stopPlaying() {
    const a = audioRef.current;
    if (a) {
      if (a.timeoutId) clearTimeout(a.timeoutId);
      try {
        a.osc.stop();
      } catch (e) {
        /* already stopped */
      }
      try {
        a.ctx.close();
      } catch (e) {
        /* already closed */
      }
    }
    audioRef.current = null;
    setPlaying(false);
  }

  // Clean up any running audio when the component unmounts.
  useEffect(() => {
    return () => stopPlaying();
  }, []);

  function handlePlay() {
    if (playing) {
      stopPlaying();
      return;
    }
    const morse = morseString;
    if (!morse.trim()) return;

    const Ctx =
      typeof window !== "undefined" &&
      (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return;

    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 600;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const unit = 0.09; // seconds for one dot; dash = 3 units.
    const on = 0.28; // gain level while a tone sounds.
    let t = ctx.currentTime + 0.06;

    const words = morse.trim().split(/\s*\/\s*/);
    words.forEach((word, wi) => {
      const letters = word.split(/\s+/).filter(Boolean);
      letters.forEach((letter, li) => {
        [...letter].forEach((sym) => {
          if (sym !== "." && sym !== "-") return;
          const dur = sym === "-" ? unit * 3 : unit;
          gain.gain.setValueAtTime(on, t);
          t += dur;
          gain.gain.setValueAtTime(0, t);
          t += unit; // inter-symbol gap (1 unit)
        });
        if (li < letters.length - 1) t += unit * 2; // inter-letter gap → 3 units
      });
      if (wi < words.length - 1) t += unit * 6; // inter-word gap → 7 units
    });

    osc.start();
    osc.stop(t + 0.05);

    const totalMs = Math.max(0, (t - ctx.currentTime + 0.12) * 1000);
    const timeoutId = setTimeout(() => stopPlaying(), totalMs);
    audioRef.current = { ctx, osc, gain, timeoutId };
    setPlaying(true);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    setCopied(false);
    if (playing) stopPlaying();
  }

  function handleDirectionChange(e) {
    setDirection(e.target.value);
    setCopied(false);
    if (playing) stopPlaying();
  }

  function handleSwap() {
    // Turn the current output into the new input and flip the direction.
    if (!output) return;
    if (playing) stopPlaying();
    setInput(output);
    setDirection(effective === "toText" ? "toMorse" : "toText");
    setCopied(false);
  }

  function handleClear() {
    if (playing) stopPlaying();
    setInput("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  const inputLabel = effective === "toText" ? "Morse code" : "Text";
  const outputLabel = effective === "toText" ? "Decoded text" : "Morse code";
  const placeholder =
    effective === "toText"
      ? "Paste Morse here, e.g. .... . .-.. .-.. ---"
      : "Type text here, e.g. Hello world";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="mc-direction">
            Direction
          </label>
          <select
            id="mc-direction"
            className="tool-select"
            value={direction}
            onChange={handleDirectionChange}
          >
            <option value="auto">Auto-detect</option>
            <option value="toMorse">Text → Morse</option>
            <option value="toText">Morse → Text</option>
          </select>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="mc-input">
            {inputLabel}
          </label>
          <textarea
            id="mc-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={placeholder}
            rows={6}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSwap} disabled={!output}>
          Swap
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy result"}
            </button>
            <button className="btn" type="button" onClick={handlePlay}>
              {playing ? "Stop" : "Play Morse"}
            </button>
          </div>
          <label className="tool-label" htmlFor="mc-output">
            {outputLabel}
          </label>
          <pre className="tool-output" id="mc-output">
            {output}
          </pre>
        </div>
      ) : null}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.chars)}</div>
          <div className="tool-stat-label">Input characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.signals)}</div>
          <div className="tool-stat-label">Dots &amp; dashes</div>
        </div>
      </div>

      <p className="tool-note">
        Letters are separated by a single space and words by a slash ( / ). Leave
        Direction on Auto-detect to translate either way, or lock it if your text
        looks like Morse. Press Play to hear the code as beeps — a dash lasts
        three times as long as a dot. Everything runs live in your browser, and
        nothing you type is ever uploaded.
      </p>
    </div>
  );
}
