import { cache } from "react";
import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";
import WordListPage from "../../components/WordListPage";
import { anagrams } from "../../lib/wordEngine";
import { hasQuery, parseRack, wordHref } from "../../lib/wordQuery";

// Results render per request from ?q=, so the hub is never prerendered.
export const dynamic = "force-dynamic";

const BASE = {
  title: { absolute: "Anagram Solver — free anagram generator & finder" },
  description: "Find every anagram of your letters instantly. A free anagram solver for Scrabble, crosswords and word puzzles — enter letters and get all the words that use them.",
  alternates: { canonical: "/anagram" },
};

const find = cache((letters) => anagrams(letters));

// Result views (?q=) are noindexed — see app/unscramble/page.js.
export function generateMetadata({ searchParams }) {
  if (!hasQuery(searchParams)) return BASE;
  const letters = parseRack(searchParams.q);
  const count = letters ? find(letters).length : 0;
  return {
    ...BASE,
    title: count ? { absolute: `Anagrams of ${letters.toUpperCase()} — ${count} words` } : BASE.title,
    robots: { index: false, follow: true },
  };
}

const faq = [
  { q: "What is an anagram solver?", a: "An anagram solver rearranges a set of letters into every valid word that uses all of them. It's the quickest way to crack anagram puzzles or find a word hidden in a jumble." },
  { q: "Is it free?", a: "Yes — completely free, with no sign-up and no limits." },
  { q: "How is this different from the word unscrambler?", a: "The anagram solver only returns words that use every letter. The unscrambler also finds shorter words made from some of the letters." },
];

const BOX = { basePath: "/anagram", placeholder: "Enter letters to find anagrams", buttonLabel: "Solve", min: 2 };

export default function AnagramHub({ searchParams }) {
  const asked = hasQuery(searchParams);
  const letters = asked ? parseRack(searchParams.q) : null;
  const words = letters ? find(letters) : [];

  if (words.length) {
    const up = letters.toUpperCase();
    const n = words.length;
    return (
      <WordListPage
        crumbs={[{ label: "Home", href: "/" }, { label: "Anagram Solver", href: "/anagram" }, { label: up }]}
        h1={`Anagrams of “${up}”`}
        lead={`${n} anagram${n === 1 ? "" : "s"} use every letter of ${up}.`}
        box={<WordSearchBox key={letters} {...BOX} initial={letters} />}
        words={words}
        faq={[
          { q: `How many anagrams does ${up} have?`, a: `${up} has ${n} anagram${n === 1 ? "" : "s"} — word${n === 1 ? "" : "s"} that use all of its letters exactly once.` },
          { q: `What's the difference between an anagram and unscrambling?`, a: `An anagram uses every letter exactly once, so it's the same length as your input. Unscrambling also finds shorter words that use only some of the letters.` },
        ]}
        related={
          <section className="block">
            <h2 className="section-title">Also try</h2>
            <p><Link href={wordHref("/unscramble", letters)} prefetch={false} rel="nofollow">Unscramble {up}</Link> to also find shorter words you can make from these letters.</p>
          </section>
        }
      />
    );
  }

  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      {!asked && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Anagram Solver</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🔀</span> Anagram Solver</h1>
        <p>Enter your letters and find every anagram — the words that use all of them. Free, for Scrabble, crosswords and word puzzles.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}>
        <WordSearchBox {...BOX} />
        {asked && <p className="tool-note" role="status">No anagrams found{letters ? <> for <strong>{letters.toUpperCase()}</strong></> : null}. Enter 2–15 letters (use ? for a blank tile).</p>}
      </div>
      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (<div key={i} style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p><p className="muted" style={{ margin: 0 }}>{f.a}</p></div>))}
      </section>
    </>
  );
}
