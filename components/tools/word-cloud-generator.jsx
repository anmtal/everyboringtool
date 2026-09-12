"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// 100% client-side word cloud generator. The pasted text is tokenized and counted
// in this browser, then drawn straight onto a <canvas> with a greedy Archimedean-spiral
// placement (measure each word, walk outward from the centre, skip on a bounding-box
// collision). Nothing is ever uploaded. Settings + text persist to localStorage.

const LS_KEY = "ebt-word-cloud-generator";

const DEFAULT_TEXT = `A word cloud turns plain text into a picture. Paste any text and the word cloud generator counts how often every word appears, then draws each word at a size that matches its frequency. The most common words grow large; rare words stay small. Word clouds, sometimes called tag clouds, are a fast, free way to see the themes hiding inside survey answers, reviews, essays, meeting notes, lyrics, or a whole book. Create a word cloud, tweak the colors, shuffle the layout, and download the image as a PNG. This free word cloud tool runs entirely in your browser, so your text never leaves your device. Word cloud, tag cloud, free word cloud, create a word cloud in seconds.`;

// A compact but useful English stop-word list (articles, pronouns, prepositions,
// auxiliaries, conjunctions, single letters). Toggle removes these so the cloud
// surfaces meaningful words instead of "the / and / of".
const STOP_WORDS = new Set(
  ("a about above after again against all am an and any are aren't as at be because been before being below " +
    "between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each " +
    "few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself " +
    "him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't " +
    "my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd " +
    "she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's " +
    "these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll " +
    "we're we've were weren't what what's when when's where where's which while who who's whom why why's will with " +
    "won't would wouldn't you you'd you'll you're you've your yours yourself yourselves us also get got just like " +
    "make made many much may might well even still back one two three "
  ).split(/\s+/).filter(Boolean)
);

const PALETTES = {
  ember: { name: "Ember", bg: "#0b0d12", colors: ["#ff7a59", "#ffb454", "#ffd166", "#f95d6a", "#ff9f1c", "#ffe08a"] },
  aqua: { name: "Aqua", bg: "#07131a", colors: ["#43d9c9", "#4cc9f0", "#4895ef", "#56cfe1", "#64dfdf", "#80ffdb"] },
  neon: { name: "Neon", bg: "#06070d", colors: ["#f72585", "#b5179e", "#7cf03c", "#4cc9f0", "#ffd60a", "#ff5ca8"] },
  forest: { name: "Forest", bg: "#0a130d", colors: ["#74c69d", "#52b788", "#95d5b2", "#b7e4c7", "#40916c", "#d8f3dc"] },
  grape: { name: "Grape", bg: "#0d0a15", colors: ["#c77dff", "#9d4edd", "#e0aaff", "#7b2cbf", "#b298dc", "#f0a6ff"] },
  mono: { name: "Mono", bg: "#0b0d12", colors: ["#ffffff", "#d5d8e0", "#aeb3c2", "#8b90a2", "#e8eaf0", "#c2c6d2"] },
  paper: { name: "Paper", bg: "#f7f6f3", colors: ["#14130f", "#b91c1c", "#1d4ed8", "#7e22ce", "#0f766e", "#b45309"] },
};
const PALETTE_ORDER = ["ember", "aqua", "neon", "forest", "grape", "mono", "paper"];

const FONTS = {
  sans: { name: "Sans", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', weight: 700 },
  serif: { name: "Serif", stack: 'Georgia, "Times New Roman", serif', weight: 700 },
  slab: { name: "Mono", stack: '"Courier New", ui-monospace, monospace', weight: 700 },
  display: { name: "Rounded", stack: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif', weight: 700 },
};
const FONT_ORDER = ["sans", "serif", "display", "slab"];

// Logical drawing surface. Backing store is scaled by devicePixelRatio for crisp
// display + a high-resolution PNG export.
const CW = 1200;
const CH = 720;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Small deterministic PRNG so a given layout seed reproduces the same arrangement
// (changing only the palette or font keeps words where they are).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenize(text) {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
  return matches || [];
}

export default function WordCloudGenerator() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [removeStop, setRemoveStop] = useState(true);
  const [maxWords, setMaxWords] = useState(90);
  const [paletteKey, setPaletteKey] = useState("ember");
  const [fontKey, setFontKey] = useState("sans");
  const [words, setWords] = useState([]); // [{ word, count }] already truncated to maxWords
  const [totals, setTotals] = useState({ total: 0, unique: 0 });
  const [seed, setSeed] = useState(1);
  const [placedCount, setPlacedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const canvasRef = useRef(null);

  const palette = PALETTES[paletteKey] || PALETTES.ember;
  const font = FONTS[fontKey] || FONTS.sans;

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.text === "string") setText(s.text);
        if (typeof s.removeStop === "boolean") setRemoveStop(s.removeStop);
        if (Number.isFinite(s.maxWords)) setMaxWords(clamp(Math.round(s.maxWords), 20, 150));
        if (s.paletteKey && PALETTES[s.paletteKey]) setPaletteKey(s.paletteKey);
        if (s.fontKey && FONTS[s.fontKey]) setFontKey(s.fontKey);
      }
    } catch (e) {
      /* private mode / blocked storage — just use defaults */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ text, removeStop, maxWords, paletteKey, fontKey })
      );
    } catch (e) {
      /* ignore */
    }
  }, [text, removeStop, maxWords, paletteKey, fontKey, loaded]);

  // ---- count words + (re)build the cloud ----
  const buildCloud = useCallback(() => {
    const counts = new Map();
    let total = 0;
    for (const raw of tokenize(text)) {
      const w = raw.replace(/^['’\-]+|['’\-]+$/g, "");
      if (!w) continue;
      if (removeStop && STOP_WORDS.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
      total += 1;
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, maxWords)
      .map(([word, count]) => ({ word, count }));

    setTotals({ total, unique: counts.size });
    setWords(sorted);
    setSeed((s) => s + 1); // fresh layout on every generate
  }, [text, removeStop, maxWords]);

  // Build an initial cloud from the default text once settings have loaded.
  useEffect(() => {
    if (!loaded) return;
    buildCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const regenerate = useCallback(() => {
    if (words.length === 0) return;
    setSeed((s) => s + 1);
  }, [words.length]);

  // ---- draw to canvas whenever the word set / seed / palette / font changes ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    canvas.width = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (words.length === 0) {
      ctx.fillStyle = paletteKey === "paper" ? "#6a6862" : "rgba(255,255,255,0.45)";
      ctx.font = `600 26px ${font.stack}`;
      ctx.fillText("No words to show — paste some text and press Generate.", CW / 2, CH / 2);
      setPlacedCount(0);
      return;
    }

    const rng = mulberry32(seed * 2654435761 + words.length);
    const maxCount = words[0].count;
    const minCount = words[words.length - 1].count;
    const range = Math.max(1, maxCount - minCount);

    const MAX_FONT = 128;
    const MIN_FONT = 15;
    const cx = CW / 2;
    const cy = CH / 2;
    const placed = []; // bounding boxes: { x, y, w, h }

    function collides(x, y, w, h) {
      if (x < 3 || y < 3 || x + w > CW - 3 || y + h > CH - 3) return true;
      for (let i = 0; i < placed.length; i++) {
        const o = placed[i];
        if (x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y) return true;
      }
      return false;
    }

    // Greedy Archimedean spiral: start at the centre and walk outward until the
    // word's box fits without overlapping an already-placed word.
    function findSpot(boxW, boxH) {
      const start = rng() * Math.PI * 2;
      const step = 0.26;
      const growth = 4.2;
      const stretchX = 1.55; // fill the wide canvas horizontally
      const stretchY = 0.92;
      const maxT = 46 * Math.PI * 2;
      for (let t = 0; t < maxT; t += step) {
        const r = growth * t;
        const px = cx + Math.cos(t + start) * r * stretchX;
        const py = cy + Math.sin(t + start) * r * stretchY;
        const x = px - boxW / 2;
        const y = py - boxH / 2;
        if (!collides(x, y, boxW, boxH)) return { x, y, px, py };
      }
      return null;
    }

    let drawn = 0;
    words.forEach((item, idx) => {
      const frac = (item.count - minCount) / range;
      let size = Math.round(MIN_FONT + Math.pow(frac, 0.72) * (MAX_FONT - MIN_FONT));
      size = clamp(size, MIN_FONT, MAX_FONT);

      ctx.font = `${font.weight} ${size}px ${font.stack}`;
      let textW = ctx.measureText(item.word).width;

      // Shrink over-wide words so even the biggest term always fits on the canvas.
      const fitW = CW * 0.94;
      if (textW > fitW) {
        size = Math.max(10, Math.floor(size * (fitW / textW)));
        ctx.font = `${font.weight} ${size}px ${font.stack}`;
        textW = ctx.measureText(item.word).width;
      }
      const textH = size * 1.04;
      const padX = Math.max(4, size * 0.12);
      const padY = Math.max(3, size * 0.16);

      // Rotate a minority of smaller words 90° for a fuller, more organic look —
      // never the top few (keep the headline words horizontal + readable).
      const canRotate = idx >= 3 && textW + padX * 2 <= CH * 0.88;
      const rotated = canRotate && rng() < 0.2;

      const boxW = rotated ? textH + padY * 2 : textW + padX * 2;
      const boxH = rotated ? textW + padX * 2 : textH + padY * 2;

      const spot = findSpot(boxW, boxH);
      if (!spot) return; // couldn't fit — drop it rather than overlap

      placed.push({ x: spot.x, y: spot.y, w: boxW, h: boxH });

      ctx.save();
      ctx.fillStyle = palette.colors[Math.floor(rng() * palette.colors.length)];
      ctx.font = `${font.weight} ${size}px ${font.stack}`;
      ctx.translate(spot.px, spot.py);
      if (rotated) ctx.rotate(-Math.PI / 2);
      ctx.fillText(item.word, 0, 0);
      ctx.restore();
      drawn += 1;
    });

    setPlacedCount(drawn);
  }, [words, seed, paletteKey, fontKey, palette, font]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || words.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const name = `word-cloud-${stamp}.png`;
    try {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
        }, "image/png");
      } else {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = name;
        a.click();
      }
    } catch (e) {
      /* export blocked (rare) — nothing else to do */
    }
  }, [words.length]);

  const fmt = (n) => n.toLocaleString("en-US");
  const ariaLabel = useMemo(
    () =>
      words.length
        ? `Word cloud. Top words: ${words.slice(0, 8).map((w) => w.word).join(", ")}.`
        : "Empty word cloud",
    [words]
  );

  return (
    <div className="tool wcg">
      <style>{`
        .wcg .wcg-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;}
        .wcg .wcg-ctl{display:flex;flex-direction:column;gap:5px;min-width:150px;flex:1;}
        .wcg .wcg-ctl label{font-size:13px;font-weight:600;color:var(--muted);}
        .wcg .wcg-ctl input[type=range]{width:100%;accent-color:var(--text);}
        .wcg .wcg-select{padding:9px 10px;border:1px solid var(--border);border-radius:var(--r-sm);
          background:var(--surface);color:var(--text);font:inherit;font-size:14px;min-height:40px;}
        .wcg .wcg-select:focus{outline:none;border-color:var(--text);box-shadow:var(--shadow-sm);}
        .wcg .wcg-toggles{display:flex;gap:18px;flex-wrap:wrap;align-items:center;}
        .wcg .wcg-check{display:flex;gap:7px;align-items:center;font-size:14px;cursor:pointer;color:var(--text);}
        .wcg .wcg-swatches{display:flex;gap:8px;flex-wrap:wrap;}
        .wcg .wcg-swatch{width:34px;height:34px;border-radius:9px;cursor:pointer;padding:0;
          border:2px solid transparent;background:var(--surface);position:relative;overflow:hidden;
          display:inline-flex;transition:transform 120ms ease-out,border-color 120ms ease-out;}
        .wcg .wcg-swatch:hover{transform:translateY(-1px);}
        .wcg .wcg-swatch.is-active{border-color:var(--text);}
        .wcg .wcg-swatch span{flex:1;}
        .wcg .wcg-swatch:focus-visible{outline:2px solid var(--text);outline-offset:2px;}
        .wcg .wcg-canvas-wrap{margin-top:4px;border:1px solid var(--border);border-radius:12px;
          overflow:hidden;background:#0b0d12;box-shadow:var(--shadow-sm);}
        .wcg .wcg-canvas{display:block;width:100%;height:auto;aspect-ratio:${CW} / ${CH};}
        .wcg .wcg-fieldrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
        .wcg .wcg-hint{font-size:12px;color:var(--faint);font-weight:500;}
      `}</style>

      <div className="tool-field">
        <div className="wcg-fieldrow">
          <label className="tool-label" htmlFor="wcg-text">Your text or word list</label>
          <span className="wcg-hint">{fmt(text.length)} characters</span>
        </div>
        <textarea
          id="wcg-text"
          className="tool-textarea"
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste an article, survey answers, reviews, or a list of words…"
          spellCheck={true}
        />
      </div>

      <div className="wcg-controls">
        <div className="wcg-ctl">
          <label htmlFor="wcg-max">Max words — {maxWords}</label>
          <input
            id="wcg-max"
            type="range"
            min={20}
            max={150}
            step={5}
            value={maxWords}
            onChange={(e) => setMaxWords(Number(e.target.value))}
          />
        </div>
        <div className="wcg-ctl" style={{ flex: "none", minWidth: 130 }}>
          <label htmlFor="wcg-font">Font</label>
          <select
            id="wcg-font"
            className="wcg-select"
            value={fontKey}
            onChange={(e) => setFontKey(e.target.value)}
          >
            {FONT_ORDER.map((k) => (
              <option key={k} value={k}>{FONTS[k].name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="wcg-ctl" style={{ minWidth: "100%" }}>
        <label>Color palette</label>
        <div className="wcg-swatches" role="radiogroup" aria-label="Color palette">
          {PALETTE_ORDER.map((k) => {
            const p = PALETTES[k];
            const grad = `linear-gradient(135deg, ${p.colors.slice(0, 4).join(", ")})`;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={paletteKey === k}
                title={p.name}
                className={paletteKey === k ? "wcg-swatch is-active" : "wcg-swatch"}
                onClick={() => setPaletteKey(k)}
              >
                <span style={{ background: grad }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="wcg-toggles">
        <label className="wcg-check">
          <input
            type="checkbox"
            checked={removeStop}
            onChange={(e) => setRemoveStop(e.target.checked)}
          />
          Remove common words (the, and, of…)
        </label>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={buildCloud}>
          Generate word cloud
        </button>
        <button type="button" className="btn" onClick={regenerate} disabled={words.length === 0}>
          Shuffle layout
        </button>
        <button type="button" className="btn" onClick={download} disabled={words.length === 0}>
          Download PNG
        </button>
      </div>

      <div className="wcg-canvas-wrap">
        <canvas ref={canvasRef} className="wcg-canvas" role="img" aria-label={ariaLabel} />
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(placedCount)}</div>
          <div className="tool-stat-label">Words shown</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(totals.unique)}</div>
          <div className="tool-stat-label">Unique words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(totals.total)}</div>
          <div className="tool-stat-label">Words counted</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{words[0] ? fmt(words[0].count) : "0"}</div>
          <div className="tool-stat-label">Top word count</div>
        </div>
      </div>

      <p className="tool-note">
        Paste text, press <strong>Generate word cloud</strong>, then pick a palette and shuffle the
        layout until it looks right. Every word is counted and drawn right here in your browser —
        your text is never uploaded — and <strong>Download PNG</strong> saves the image to your device.
      </p>
    </div>
  );
}
