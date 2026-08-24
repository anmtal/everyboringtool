import Link from "next/link";
import UnscrambleBox from "../../components/UnscrambleBox";
import { POPULAR } from "../../lib/wordPopular";

export const metadata = {
  title: { absolute: "Word Unscrambler — free anagram & Scrabble word finder" },
  description: "Unscramble letters into words instantly. A free word unscrambler and anagram solver for Scrabble, Words With Friends and crosswords — enter your letters and get every word, with scores. No sign-up.",
  alternates: { canonical: "/unscramble" },
};

const faq = [
  { q: "What is a word unscrambler?", a: "A word unscrambler takes a set of jumbled or random letters and finds every valid word you can spell with them. It's the fastest way to solve anagrams or find high-scoring plays in Scrabble and Words With Friends." },
  { q: "Is it free?", a: "Yes — completely free, with no sign-up, no app to install, and no limits on how many searches you make." },
  { q: "How many letters can I enter?", a: "You can enter up to 15 letters at once. The unscrambler finds every valid word from two letters up to the full length of what you type." },
  { q: "Does it work for Scrabble and Words With Friends?", a: "Yes. Results are sorted from longest to shortest and show each word's Scrabble score, so you can quickly spot the best play." },
];

export default function UnscrambleHub() {
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <nav className="breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span><span>Word Unscrambler</span>
      </nav>

      <header className="page-head">
        <h1><span aria-hidden="true">🔤</span> Word Unscrambler</h1>
        <p>Enter your letters and instantly find every word you can make — sorted by length, with Scrabble scores. Free, and great for anagrams, Scrabble, Words With Friends and crosswords.</p>
      </header>

      <div className="block" style={{ marginTop: 0 }}>
        <UnscrambleBox />
      </div>

      <section className="block">
        <h2 className="section-title">Popular searches</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {POPULAR.slice(0, 40).map((l) => (
            <Link key={l} href={`/unscramble/${l}`} className="badge" style={{ textDecoration: "none" }}>{l.toUpperCase()}</Link>
          ))}
        </div>
      </section>

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
