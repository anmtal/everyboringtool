import { cache } from "react";
import Link from "next/link";
import UnscrambleBox from "../../components/UnscrambleBox";
import WordListPage from "../../components/WordListPage";
import { unscramble, scrabbleScore } from "../../lib/wordEngine";
import { hasQuery, parseRack } from "../../lib/wordQuery";

// Results render per request from ?q=, so the hub is never prerendered.
export const dynamic = "force-dynamic";

const BASE = {
  title: { absolute: "Word Unscrambler — free anagram & Scrabble word finder" },
  description: "Unscramble letters into words instantly. A free word unscrambler and anagram solver for Scrabble, Words With Friends and crosswords — enter your letters and get every word, with scores. No sign-up.",
  alternates: { canonical: "/unscramble" },
};

const find = cache((letters) => unscramble(letters));

// Result views (?q=) are for visitors, never the index: one URL per query is the
// unbounded thin-page pattern the old /unscramble/<letters> pages were retired for.
export function generateMetadata({ searchParams }) {
  if (!hasQuery(searchParams)) return BASE;
  const letters = parseRack(searchParams.q);
  const count = letters ? find(letters).length : 0;
  const up = letters ? letters.toUpperCase() : "";
  return {
    ...BASE,
    title: count ? { absolute: `Unscramble ${up} — ${count} words made from these letters` } : BASE.title,
    robots: { index: false, follow: true },
  };
}

const faq = [
  { q: "What is a word unscrambler?", a: "A word unscrambler takes a set of jumbled or random letters and finds every valid word you can spell with them. It's the fastest way to solve anagrams or find high-scoring plays in Scrabble and Words With Friends." },
  { q: "Is it free?", a: "Yes — completely free, with no sign-up, no app to install, and no limits on how many searches you make." },
  { q: "How many letters can I enter?", a: "You can enter up to 15 letters at once. The unscrambler finds every valid word from two letters up to the full length of what you type." },
  { q: "Does it work for Scrabble and Words With Friends?", a: "Yes. Results are sorted from longest to shortest and show each word's Scrabble score, so you can quickly spot the best play." },
];

export default function UnscrambleHub({ searchParams }) {
  const asked = hasQuery(searchParams);
  const letters = asked ? parseRack(searchParams.q) : null;
  const words = letters ? find(letters) : [];

  if (words.length) {
    const up = letters.toUpperCase();
    const best = words[0];
    return (
      <WordListPage
        crumbs={[{ label: "Home", href: "/" }, { label: "Word Unscrambler", href: "/unscramble" }, { label: up }]}
        h1={`Words made from “${up}”`}
        lead={`We found ${words.length} words you can make from the letters ${up}.`}
        box={<UnscrambleBox key={letters} initial={letters} />}
        words={words}
        faq={[
          { q: `How many words can you make from ${up}?`, a: `You can make ${words.length} valid words from the letters ${up}, ranging from 2 letters up to ${best.length} letters long.` },
          { q: `What is the longest word from ${up}?`, a: `The longest word is "${best}" (${best.length} letters), worth ${scrabbleScore(best)} points in Scrabble.` },
        ]}
      />
    );
  }

  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      {!asked && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span><span>Word Unscrambler</span>
      </nav>

      <header className="page-head">
        <h1><span aria-hidden="true">🔤</span> Word Unscrambler</h1>
        <p>Enter your letters and instantly find every word you can make — sorted by length, with Scrabble scores. Free, and great for anagrams, Scrabble, Words With Friends and crosswords.</p>
      </header>

      <div className="block" style={{ marginTop: 0 }}>
        <UnscrambleBox />
        {asked && <p className="tool-note" role="status">No words found{letters ? <> for <strong>{letters.toUpperCase()}</strong></> : null}. Enter 2–15 letters (use ? for a blank tile).</p>}
      </div>

      <section className="block">
        <h2 className="section-title">How it works</h2>
        <p>
          Type up to 15 letters and the unscrambler checks them against a dictionary of
          over 168,000 words, returning every word you can spell — longest first, each with its Scrabble value. Tap any
          result to unscramble <em>its</em> letters too. It all runs instantly, free, with no sign-up.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p>
            <p className="muted" style={{ margin: 0 }}>{f.a}</p>
          </div>
        ))}
      </section>
    </>
  );
}
