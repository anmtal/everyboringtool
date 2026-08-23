"use client";

import { useMemo, useState } from "react";

// Common spam-trigger words / phrases. Kept inline (no libraries).
// Matched case-insensitively against the subject line.
const SPAM_WORDS = [
  "free", "buy now", "buy direct", "order now", "click here", "click below",
  "act now", "apply now", "sign up free", "limited time", "urgent", "don't delete",
  "guarantee", "guaranteed", "100% free", "100% satisfied", "risk-free", "no risk",
  "no cost", "no fees", "no catch", "no obligation", "cash", "cash bonus", "cheap",
  "discount", "best price", "lowest price", "price", "save big", "save up to",
  "extra income", "make money", "earn money", "earn extra cash", "double your",
  "income", "investment", "million dollars", "money back", "pure profit",
  "winner", "you're a winner", "congratulations", "you have been selected",
  "prize", "claim your", "exclusive deal", "special promotion", "promo",
  "offer expires", "instant", "amazing", "incredible deal", "once in a lifetime",
  "while supplies last", "increase sales", "increase traffic", "credit card",
  "weight loss", "viagra", "$$$", "!!!", "%off", "% off",
];

// Merge-tag / personalization-token patterns used by common ESPs.
const MERGE_TAG_PATTERNS = [
  /\{\{[^}]+\}\}/, // {{first_name}}, Handlebars
  /\{[^}\s][^}]*\}/, // {FirstName}
  /\*\|[^|]+\|\*/, // *|FNAME|*  Mailchimp
  /%[A-Za-z_]+%/, // %NAME%
  /\[\[?[A-Za-z_][\w\s-]*\]?\]/, // [Name] / [[name]]
];

const EMOJI_RE = /\p{Extended_Pictographic}/gu;

export default function EmailSubjectLineTester() {
  const [subject, setSubject] = useState("");

  const analysis = useMemo(() => {
    const raw = subject || "";
    const value = raw.replace(/\r\n|\r|\n/g, " ").trim();
    const isEmpty = value === "";

    // Character count with correct emoji / surrogate-pair handling.
    const chars = Array.from(value).length;
    const words = isEmpty ? 0 : value.split(/\s+/).filter(Boolean).length;

    // Emoji presence.
    const emojiMatches = value.match(EMOJI_RE) || [];
    const emojiCount = emojiMatches.length;

    // ALL-CAPS shouting detection: words of 3+ letters that are fully uppercase.
    const wordTokens = isEmpty ? [] : value.split(/\s+/).filter(Boolean);
    const capsWords = wordTokens.filter((w) => {
      const letters = w.replace(/[^A-Za-z]/g, "");
      return letters.length >= 3 && letters === letters.toUpperCase();
    });
    const strongCaps =
      capsWords.some((w) => w.replace(/[^A-Za-z]/g, "").length >= 4) ||
      capsWords.length >= 2;

    // Excessive punctuation: repeated !/? or more than one of them.
    const exclamations = (value.match(/!/g) || []).length;
    const questions = (value.match(/\?/g) || []).length;
    const repeatedPunct = /[!?]{2,}/.test(value);
    const excessivePunct = repeatedPunct || exclamations >= 2 || (exclamations + questions) >= 3;

    // Spam-trigger words.
    const lower = value.toLowerCase();
    const foundSpam = [];
    for (const phrase of SPAM_WORDS) {
      const p = phrase.toLowerCase();
      // Word-boundary match for alphabetic phrases; substring for symbol phrases.
      const isAlpha = /^[a-z0-9][a-z0-9\s'%-]*$/.test(p);
      let hit = false;
      if (isAlpha) {
        const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        hit = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(value);
      } else {
        hit = lower.includes(p);
      }
      if (hit) foundSpam.push(phrase);
    }

    // Personalization detection.
    const hasMergeTag = MERGE_TAG_PATTERNS.some((re) => re.test(value));
    const hasYou = /(^|[^a-z])(you|your|you're|youre)([^a-z]|$)/i.test(value);
    const personalized = hasMergeTag ? "strong" : hasYou ? "light" : "none";

    // Numbers (a light positive signal, tip only).
    const hasNumber = /\d/.test(value);

    // --- Scoring out of 100 ---
    let score = 100;
    const deductions = [];

    if (!isEmpty) {
      // Length band.
      if (chars >= 21 && chars <= 50) {
        // ideal, no deduction
      } else if (chars >= 51 && chars <= 60) {
        score -= 4;
        deductions.push("A bit long (51-60)");
      } else if (chars >= 61 && chars <= 70) {
        score -= 10;
        deductions.push("Too long (61-70)");
      } else if (chars >= 71) {
        score -= 18;
        deductions.push("Way too long (71+)");
      } else if (chars >= 11 && chars <= 20) {
        score -= 4;
        deductions.push("A little short");
      } else {
        // 1-10
        score -= 12;
        deductions.push("Very short");
      }

      if (strongCaps) {
        score -= 12;
        deductions.push("ALL-CAPS shouting");
      }
      if (excessivePunct) {
        score -= 10;
        deductions.push("Excessive punctuation");
      }
      if (foundSpam.length > 0) {
        score -= Math.min(28, foundSpam.length * 7);
        deductions.push(`${foundSpam.length} spam-trigger word${foundSpam.length === 1 ? "" : "s"}`);
      }
      if (emojiCount > 3) {
        score -= 8;
        deductions.push("Too many emoji");
      }
      if (personalized === "strong") score += 6;
      else if (personalized === "light") score += 3;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isEmpty,
      chars,
      words,
      emojiCount,
      capsWords,
      strongCaps,
      excessivePunct,
      exclamations,
      questions,
      foundSpam,
      personalized,
      hasNumber,
      score: Math.round(score),
      deductions,
    };
  }, [subject]);

  const fmt = (n) => n.toLocaleString("en-US");

  // Length classification for the character-count line.
  const lengthStatus = (() => {
    const c = analysis.chars;
    if (analysis.isEmpty) return { tone: "info", text: "Type a subject line to analyze it." };
    if (c >= 30 && c <= 50)
      return { tone: "good", text: "In the sweet spot (about 30-50 characters)." };
    if (c < 30)
      return { tone: "warn", text: "Short — fine for punchy lines, but you have room for more detail." };
    if (c <= 60)
      return { tone: "warn", text: "Slightly long — most inboxes still show it, mobile may clip the end." };
    return { tone: "bad", text: "Long — likely truncated in most inboxes, especially on mobile." };
  })();

  const scoreColor =
    analysis.isEmpty
      ? undefined
      : analysis.score >= 80
      ? "#16a34a"
      : analysis.score >= 60
      ? "#d97706"
      : "#dc2626";

  const scoreLabel =
    analysis.isEmpty
      ? "—"
      : analysis.score >= 80
      ? "Strong"
      : analysis.score >= 60
      ? "Needs work"
      : "Weak";

  // Build the check rows.
  const checks = analysis.isEmpty
    ? []
    : [
        {
          status:
            analysis.chars >= 30 && analysis.chars <= 50
              ? "good"
              : analysis.chars > 60
              ? "bad"
              : "warn",
          label: "Length",
          detail: `${fmt(analysis.chars)} character${analysis.chars === 1 ? "" : "s"} · ${lengthStatus.text}`,
        },
        {
          status: analysis.chars > 40 ? "warn" : "good",
          label: "Mobile preview",
          detail:
            analysis.chars > 40
              ? "Phones often show only the first ~30-40 characters — put the important words first."
              : "Fits comfortably in mobile inbox previews (~30-40 characters).",
        },
        {
          status: analysis.strongCaps ? "bad" : "good",
          label: "Capitalization",
          detail: analysis.strongCaps
            ? `ALL-CAPS words look like shouting to spam filters: ${analysis.capsWords.join(", ")}`
            : "No shouty ALL-CAPS words.",
        },
        {
          status: analysis.excessivePunct ? "bad" : "good",
          label: "Punctuation",
          detail: analysis.excessivePunct
            ? "Too many exclamation/question marks — reads as spammy. Keep it to at most one."
            : "Clean, restrained punctuation.",
        },
        {
          status: analysis.foundSpam.length > 0 ? "bad" : "good",
          label: "Spam-trigger words",
          detail:
            analysis.foundSpam.length > 0
              ? `Found ${analysis.foundSpam.length}: ${analysis.foundSpam.join(", ")}`
              : "None of the common spam-trigger words detected.",
        },
        {
          status:
            analysis.personalized === "strong"
              ? "good"
              : analysis.personalized === "light"
              ? "info"
              : "warn",
          label: "Personalization",
          detail:
            analysis.personalized === "strong"
              ? "Uses a merge tag / recipient token — personalized subject lines lift open rates."
              : analysis.personalized === "light"
              ? "Speaks to the reader (\"you\"/\"your\"). Adding their name or a merge tag can help even more."
              : "No personalization. Try a merge tag like {{first_name}} or address the reader directly.",
        },
        {
          status: analysis.emojiCount === 0 ? "info" : analysis.emojiCount <= 3 ? "good" : "bad",
          label: "Emoji",
          detail:
            analysis.emojiCount === 0
              ? "No emoji. One well-placed emoji can help a line stand out — optional."
              : analysis.emojiCount <= 3
              ? `${analysis.emojiCount} emoji — a light touch that can boost visibility.`
              : `${analysis.emojiCount} emoji is a lot — too many can trip spam filters and look cluttered.`,
        },
      ];

  // Actionable tips.
  const tips = (() => {
    if (analysis.isEmpty) return [];
    const t = [];
    if (analysis.chars > 60)
      t.push("Trim the subject to about 30-50 characters so it isn't cut off in the inbox.");
    if (analysis.chars > 40 && analysis.chars <= 60)
      t.push("Front-load the key words — mobile inboxes may hide anything past ~40 characters.");
    if (analysis.chars > 0 && analysis.chars < 20)
      t.push("Very short lines can feel vague. A little more context often earns more opens.");
    if (analysis.strongCaps) t.push("Swap ALL-CAPS for normal case; use one strong word instead of shouting.");
    if (analysis.excessivePunct) t.push("Use at most one exclamation or question mark.");
    if (analysis.foundSpam.length > 0)
      t.push(`Rephrase spam-trigger words where you can: ${analysis.foundSpam.join(", ")}.`);
    if (analysis.emojiCount > 3) t.push("Cut back to one emoji at most.");
    if (analysis.personalized === "none")
      t.push("Add personalization — a name merge tag or a direct \"you\" — to lift open rates.");
    if (!analysis.hasNumber && analysis.chars > 0)
      t.push("Consider a specific number or timeframe (e.g. \"3 tips\", \"ends Friday\") — concrete beats vague.");
    if (t.length === 0)
      t.push("This subject line is in good shape. A/B test a curiosity-driven variant to squeeze out more opens.");
    return t;
  })();

  const dotColor = (status) =>
    status === "good"
      ? "#16a34a"
      : status === "warn"
      ? "#d97706"
      : status === "bad"
      ? "#dc2626"
      : "currentColor";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="eslt-subject">
            Email subject line
          </label>
          <input
            id="eslt-subject"
            className="tool-input"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Your April invoice is ready, {{first_name}}"
            autoComplete="off"
            spellCheck="true"
          />
        </div>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">Subject line score</p>
        <div className="tool-result-value" style={scoreColor ? { color: scoreColor } : undefined}>
          {analysis.isEmpty ? "—" : `${analysis.score}/100`}
        </div>
        <p className="tool-note" style={{ marginTop: "0.35rem" }}>
          {analysis.isEmpty
            ? "Start typing to see a live score and tips."
            : `${scoreLabel}${analysis.deductions.length ? " · " + analysis.deductions.join(", ") : ""}`}
        </p>

        {!analysis.isEmpty && (
          <div
            aria-hidden="true"
            style={{
              marginTop: "0.75rem",
              height: "8px",
              borderRadius: "999px",
              background: "rgba(128,128,128,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${analysis.score}%`,
                height: "100%",
                borderRadius: "999px",
                background: scoreColor || "currentColor",
                transition: "width 0.15s ease",
              }}
            />
          </div>
        )}
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={
              !analysis.isEmpty && analysis.chars > 60
                ? { color: "#dc2626" }
                : undefined
            }
          >
            {analysis.isEmpty ? "—" : fmt(analysis.chars)}
          </div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{analysis.isEmpty ? "—" : fmt(analysis.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{analysis.isEmpty ? "—" : fmt(analysis.emojiCount)}</div>
          <div className="tool-stat-label">Emoji</div>
        </div>
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={
              !analysis.isEmpty && analysis.foundSpam.length > 0
                ? { color: "#dc2626" }
                : undefined
            }
          >
            {analysis.isEmpty ? "—" : fmt(analysis.foundSpam.length)}
          </div>
          <div className="tool-stat-label">Spam words</div>
        </div>
      </div>

      {!analysis.isEmpty && (
        <div className="tool-output" style={{ display: "grid", gap: "0.6rem" }}>
          {checks.map((c) => (
            <div key={c.label} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  marginTop: "0.35rem",
                  width: "0.6rem",
                  height: "0.6rem",
                  borderRadius: "999px",
                  background: dotColor(c.status),
                }}
              />
              <span style={{ flex: "1 1 auto" }}>
                <strong style={{ fontWeight: 600 }}>{c.label}:</strong>{" "}
                <span style={{ opacity: 0.85 }}>{c.detail}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="tool-note" style={{ display: "grid", gap: "0.35rem" }}>
          <strong style={{ fontWeight: 600 }}>Tips</strong>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="tool-note">
        The score rewards a scannable length (about 30-50 characters), clean punctuation and
        personalization, and it flags ALL-CAPS shouting, spam-trigger words and emoji overload.
        Use it as a guide alongside real A/B tests — no score guarantees an open.
      </p>
      <p className="tool-note">
        Everything runs live in your browser as you type. Your subject lines are never uploaded or
        stored.
      </p>
    </div>
  );
}
