"use client";

import { useMemo, useState } from "react";

// A curated, family-friendly Gen Z / internet slang glossary. Each entry maps the
// slang term to a plain-English meaning. Deliberately excludes crude/sexual terms
// so the tool stays ad-safe and all-ages. Multi-word phrases are matched first.
const SLANG = [
  { gz: "no cap", en: "no lie, seriously" },
  { gz: "cap", en: "a lie, not true" },
  { gz: "fr", en: "for real, honestly" },
  { gz: "frfr", en: "for real for real, seriously" },
  { gz: "ngl", en: "not gonna lie, honestly" },
  { gz: "tbh", en: "to be honest" },
  { gz: "iykyk", en: "if you know, you know" },
  { gz: "deadass", en: "seriously, I mean it" },
  { gz: "lowkey", en: "kind of, secretly" },
  { gz: "highkey", en: "very much, openly" },
  { gz: "bussin", en: "really good (usually food)" },
  { gz: "slaps", en: "is excellent (usually music)" },
  { gz: "fire", en: "amazing, excellent" },
  { gz: "goated", en: "the greatest of all time" },
  { gz: "mid", en: "mediocre, average" },
  { gz: "based", en: "confidently being yourself" },
  { gz: "sus", en: "suspicious, sketchy" },
  { gz: "rizz", en: "charm, flirting skill" },
  { gz: "slay", en: "to do something amazingly" },
  { gz: "ate", en: "did it perfectly, nailed it" },
  { gz: "delulu", en: "delusional, unrealistic" },
  { gz: "bet", en: "okay, sure, agreed" },
  { gz: "say less", en: "understood, I'm on it" },
  { gz: "vibe", en: "mood, feeling, atmosphere" },
  { gz: "vibing", en: "relaxing and enjoying it" },
  { gz: "vibe check", en: "a check on someone's mood or energy" },
  { gz: "salty", en: "bitter or annoyed" },
  { gz: "shook", en: "shocked, stunned" },
  { gz: "pressed", en: "upset or bothered" },
  { gz: "flex", en: "to show off" },
  { gz: "flexing", en: "showing off" },
  { gz: "drip", en: "stylish clothes or style" },
  { gz: "fit", en: "outfit" },
  { gz: "glow up", en: "a big improvement in looks or life" },
  { gz: "snatched", en: "looking really good, on point" },
  { gz: "boujee", en: "fancy, high-class" },
  { gz: "extra", en: "over the top, dramatic" },
  { gz: "ghosted", en: "suddenly stopped all contact" },
  { gz: "ghost", en: "to disappear on someone" },
  { gz: "tea", en: "gossip, the latest news" },
  { gz: "spill the tea", en: "share the gossip" },
  { gz: "stan", en: "a devoted fan, or to be one" },
  { gz: "clout", en: "fame or influence" },
  { gz: "simp", en: "someone overly eager to please a crush" },
  { gz: "ick", en: "a sudden turn-off about someone" },
  { gz: "fam", en: "close friends" },
  { gz: "bestie", en: "best friend" },
  { gz: "finna", en: "going to, about to" },
  { gz: "cook", en: "to do something impressively" },
  { gz: "let him cook", en: "let them do their thing" },
  { gz: "cooked", en: "in big trouble, done for" },
  { gz: "yeet", en: "to throw hard, or an excited yell" },
  { gz: "periodt", en: "and that's final" },
  { gz: "hits different", en: "feels uniquely good" },
  { gz: "main character", en: "the center of attention" },
  { gz: "npc", en: "someone acting without any individuality" },
  { gz: "rent free", en: "constantly on your mind" },
  { gz: "touch grass", en: "go outside and take a break" },
  { gz: "brainrot", en: "low-quality, addictive online content" },
  { gz: "it's giving", en: "it has the vibe of" },
  { gz: "understood the assignment", en: "did exactly what was needed" },
  { gz: "caught in 4k", en: "caught clearly in the act" },
  { gz: "ratio", en: "a reply that beats the original in likes" },
  { gz: "aura", en: "coolness or presence" },
  { gz: "glaze", en: "to over-praise someone" },
  { gz: "gng", en: "the group, the friends" },
  { gz: "opp", en: "an enemy or rival" },
  { gz: "wyd", en: "what are you doing?" },
  { gz: "hbu", en: "how about you?" },
  { gz: "istg", en: "I swear to god" },
  { gz: "fomo", en: "fear of missing out" },
  { gz: "goat", en: "greatest of all time" },
];

// Reverse (English -> Gen Z): a curated subset where a clean slang word exists.
const REVERSE = [
  { en: "for real", gz: "fr" },
  { en: "honestly", gz: "ngl" },
  { en: "seriously", gz: "deadass" },
  { en: "no lie", gz: "no cap" },
  { en: "a lie", gz: "cap" },
  { en: "lying", gz: "capping" },
  { en: "really good", gz: "fire" },
  { en: "amazing", gz: "fire" },
  { en: "excellent", gz: "goated" },
  { en: "the best", gz: "goated" },
  { en: "delicious", gz: "bussin" },
  { en: "mediocre", gz: "mid" },
  { en: "average", gz: "mid" },
  { en: "suspicious", gz: "sus" },
  { en: "charm", gz: "rizz" },
  { en: "showing off", gz: "flexing" },
  { en: "show off", gz: "flex" },
  { en: "gossip", gz: "tea" },
  { en: "outfit", gz: "fit" },
  { en: "style", gz: "drip" },
  { en: "best friend", gz: "bestie" },
  { en: "friends", gz: "the gng" },
  { en: "going to", gz: "finna" },
  { en: "about to", gz: "finna" },
  { en: "annoyed", gz: "salty" },
  { en: "upset", gz: "pressed" },
  { en: "shocked", gz: "shook" },
  { en: "fancy", gz: "boujee" },
  { en: "over the top", gz: "extra" },
  { en: "a devoted fan", gz: "a stan" },
  { en: "okay", gz: "bet" },
  { en: "understood", gz: "say less" },
  { en: "kind of", gz: "lowkey" },
  { en: "point of view", gz: "pov" },
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, (m) => "\\" + m); }

// Build one case-insensitive regex from a list of phrases, longest first so the
// longest match wins, with word boundaries. Returns { re, map }.
function buildMatcher(pairs, keyField, valField) {
  const usable = pairs.filter((p) => p[keyField].length >= 2);
  const sorted = [...usable].sort((a, b) => b[keyField].length - a[keyField].length);
  const map = {};
  for (const p of sorted) map[p[keyField].toLowerCase()] = p[valField];
  const alt = sorted.map((p) => escapeRe(p[keyField])).join("|");
  const re = new RegExp("(?<![\\w])(" + alt + ")(?![\\w])", "gi");
  return { re, map };
}

export default function GenZTranslator() {
  const [dir, setDir] = useState("gz2en"); // gz2en | en2gz
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");

  const gz = useMemo(() => buildMatcher(SLANG, "gz", "en"), []);
  const en = useMemo(() => buildMatcher(REVERSE, "en", "gz"), []);

  const output = useMemo(() => {
    const t = text;
    if (!t.trim()) return "";
    const { re, map } = dir === "gz2en" ? gz : en;
    let hit = false;
    const out = t.replace(re, (m) => {
      const v = map[m.toLowerCase()];
      if (v == null) return m;
      hit = true;
      return v;
    });
    return hit ? out : out; // out unchanged if nothing matched
  }, [text, dir, gz, en]);

  const nothingMatched = text.trim() !== "" && output === text;

  const glossary = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? SLANG.filter((s) => s.gz.includes(q) || s.en.toLowerCase().includes(q)) : SLANG;
    return list;
  }, [query]);

  function copyOut() {
    try {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Translation direction" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={dir === "gz2en"}
          className={`seg-btn ${dir === "gz2en" ? "is-active" : ""}`} onClick={() => setDir("gz2en")}>
          Gen Z → English
        </button>
        <button type="button" role="tab" aria-selected={dir === "en2gz"}
          className={`seg-btn ${dir === "en2gz" ? "is-active" : ""}`} onClick={() => setDir("en2gz")}>
          English → Gen Z
        </button>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="gz-in">
            {dir === "gz2en" ? "Paste the Gen Z text" : "Paste your plain English"}
          </label>
          <textarea id="gz-in" className="tool-textarea" rows={4}
            placeholder={dir === "gz2en" ? "ngl this fit is fire, no cap 🔥" : "Honestly, this outfit is amazing, no lie."}
            value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">{dir === "gz2en" ? "In plain English" : "In Gen Z"}</p>
        <div style={{ fontSize: 16, lineHeight: 1.5, minHeight: 24, whiteSpace: "pre-wrap" }}>
          {output || <span style={{ color: "var(--muted, #888)" }}>Your translation appears here.</span>}
        </div>
        {output && (
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-sm" onClick={copyOut}>{copied ? "Copied!" : "Copy"}</button>
          </div>
        )}
        {nothingMatched && (
          <p className="tool-note">No known slang found to swap — check the glossary below, or it may already be plain English.</p>
        )}
      </div>

      <p className="tool-note">
        This is a slang dictionary and swapper, not an AI — it translates the terms it knows word-for-word,
        so freeform sentences stay mostly intact with the slang swapped in or out. Slang shifts fast and
        varies by group, so treat it as a fun guide. Everything runs in your browser; nothing you type is uploaded.
      </p>

      <div className="tool-field" style={{ marginTop: 18 }}>
        <label className="tool-label" htmlFor="gz-glossary">Slang glossary ({SLANG.length} terms)</label>
        <input id="gz-glossary" className="tool-input" type="search" placeholder="Search a term…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8, marginTop: 10 }}>
        {glossary.map((s) => (
          <div key={s.gz} style={{ border: "1px solid var(--border, #e2e6ea)", borderRadius: 8, padding: "8px 11px", background: "var(--surface-2, #f4f6f8)" }}>
            <strong style={{ textTransform: "none" }}>{s.gz}</strong>
            <div style={{ fontSize: 13, color: "var(--muted, #5b6570)", marginTop: 2 }}>{s.en}</div>
          </div>
        ))}
        {glossary.length === 0 && <p className="tool-note">No term matches “{query}”.</p>}
      </div>
    </div>
  );
}
