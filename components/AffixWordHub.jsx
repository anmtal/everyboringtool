import Link from "next/link";
import { cache } from "react";
import WordSearchBox from "./WordSearchBox";
import WordListPage from "./WordListPage";
import { startingWith, endingWith, containing } from "../lib/wordEngine";
import { hasQuery, parseAffix, wordHref } from "../lib/wordQuery";

// The three "words … with" hubs share one shape: the plain tool, or (with ?q=)
// the result list for that query. Result views are noindexed — see
// app/unscramble/page.js.

const FAMILIES = {
  "/words-starting-with": {
    find: startingWith,
    crumb: "Words Starting With",
    emoji: "🔠",
    h1: "Words That Start With…",
    intro: <>Type a starting letter, or the first few letters, to see every word that begins with them — sorted by length with Scrabble scores.</>,
    placeholder: "Enter a starting letter or letters",
    meta: {
      title: { absolute: "Words That Start With… — free word finder by first letters" },
      description: "Find every word that starts with any letter or letters. Free lists sorted by length with Scrabble scores — great for Scrabble, Words With Friends and crosswords.",
    },
    title: (up, n) => `Words that start with ${up} — ${n} words`,
    resultH1: (up) => `Words that start with “${up}”`,
    lead: (up, n) => `${n} words start with ${up}, sorted by length.`,
    faq: (up, w) => [
      { q: `How many words start with ${up}?`, a: `There are ${w.length} words that start with ${up}, from ${w[0].length} letters up to ${w[w.length - 1].length} letters long.` },
      { q: `What is the shortest word starting with ${up}?`, a: `The shortest is "${w[0]}" (${w[0].length} letters).` },
    ],
  },
  "/words-ending-with": {
    find: endingWith,
    crumb: "Words Ending With",
    emoji: "🔡",
    h1: "Words That End With…",
    intro: <>Type an ending — like <strong>ing</strong>, <strong>ed</strong> or <strong>tion</strong> — to see every word that ends with it, sorted by length with Scrabble scores.</>,
    placeholder: "Enter an ending (e.g. ing)",
    meta: {
      title: { absolute: "Words That End With… — free word finder by ending" },
      description: "Find every word that ends with any letters — like -ing, -ed or -tion. Free lists sorted by length with Scrabble scores for Scrabble, Words With Friends and crosswords.",
    },
    title: (up, n) => `Words that end with ${up} — ${n} words`,
    resultH1: (up) => `Words that end with “${up}”`,
    lead: (up, n) => `${n} words end in ${up}, sorted by length.`,
    faq: (up, w) => [
      { q: `How many words end with ${up}?`, a: `There are ${w.length} words that end in ${up}.` },
      { q: `What is the shortest word ending in ${up}?`, a: `The shortest is "${w[0]}" (${w[0].length} letters).` },
    ],
  },
  "/words-containing": {
    find: containing,
    crumb: "Words Containing",
    emoji: "🔍",
    h1: "Words Containing…",
    intro: <>Type a sequence of letters to see every word that contains it anywhere — handy for crosswords, Scrabble and Words With Friends.</>,
    placeholder: "Enter letters to find inside words",
    meta: {
      title: { absolute: "Words Containing… — free word finder by letters inside" },
      description: "Find every word that contains a sequence of letters, like QU or OUGH. Free lists sorted by length with Scrabble scores for Scrabble, Words With Friends and crosswords.",
    },
    title: (up, n) => `Words with ${up} in them — ${n} words`,
    resultH1: (up) => `Words containing “${up}”`,
    lead: (up, n) => `${n} words contain ${up}, sorted by length.`,
    faq: (up, w) => [
      { q: `How many words contain ${up}?`, a: `There are ${w.length} words that contain the letters ${up}.` },
      { q: `Where can I use these?`, a: `Words containing a specific sequence are handy for crosswords, Scrabble, Words With Friends and word puzzles where part of the answer is already filled in.` },
    ],
  },
};

const LABELS = { "/words-starting-with": "Words starting with", "/words-ending-with": "Words ending with", "/words-containing": "Words containing" };

const findWords = cache((base, q) => FAMILIES[base].find(q));

export function affixMetadata(base, searchParams) {
  const f = FAMILIES[base];
  const meta = { ...f.meta, alternates: { canonical: base } };
  if (!hasQuery(searchParams)) return meta;
  const q = parseAffix(searchParams.q);
  const n = q ? findWords(base, q).length : 0;
  return {
    ...meta,
    title: n ? { absolute: f.title(q.toUpperCase(), n) } : meta.title,
    robots: { index: false, follow: true },
  };
}

export default function AffixWordHub({ base, searchParams }) {
  const f = FAMILIES[base];
  const asked = hasQuery(searchParams);
  const q = asked ? parseAffix(searchParams.q) : null;
  const words = q ? findWords(base, q) : [];
  const box = { basePath: base, placeholder: f.placeholder, buttonLabel: "Find words", allowWild: false, min: 1 };

  if (words.length) {
    const up = q.toUpperCase();
    const others = Object.keys(LABELS).filter((b) => b !== base);
    return (
      <WordListPage
        crumbs={[{ label: "Home", href: "/" }, { label: f.crumb, href: base }, { label: up }]}
        h1={f.resultH1(up)}
        lead={f.lead(up, words.length)}
        box={<WordSearchBox key={q} {...box} initial={q} />}
        words={words}
        faq={f.faq(up, words)}
        related={
          <section className="block">
            <h2 className="section-title">Related</h2>
            <p>
              {others.map((b, i) => (
                <span key={b}>
                  {i > 0 && " · "}
                  <Link href={wordHref(b, q)} prefetch={false} rel="nofollow">{LABELS[b]} {up}</Link>
                </span>
              ))}
            </p>
          </section>
        }
      />
    );
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>{f.crumb}</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">{f.emoji}</span> {f.h1}</h1>
        <p>{f.intro}</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}>
        <WordSearchBox {...box} />
        {asked && <p className="tool-note" role="status">No words found{q ? <> for <strong>{q.toUpperCase()}</strong></> : null}. Enter 1–15 letters.</p>}
      </div>
    </>
  );
}
