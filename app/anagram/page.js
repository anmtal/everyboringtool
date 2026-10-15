import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: { absolute: "Anagram Solver — free anagram generator & finder" },
  description: "Find every anagram of your letters instantly. A free anagram solver for Scrabble, crosswords and word puzzles — enter letters and get all the words that use them.",
  alternates: { canonical: "/anagram" },
};

const faq = [
  { q: "What is an anagram solver?", a: "An anagram solver rearranges a set of letters into every valid word that uses all of them. It's the quickest way to crack anagram puzzles or find a word hidden in a jumble." },
  { q: "Is it free?", a: "Yes — completely free, with no sign-up and no limits." },
  { q: "How is this different from the word unscrambler?", a: "The anagram solver only returns words that use every letter. The unscrambler also finds shorter words made from some of the letters." },
];

export default function AnagramHub() {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Anagram Solver</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🔀</span> Anagram Solver</h1>
        <p>Enter your letters and find every anagram — the words that use all of them. Free, for Scrabble, crosswords and word puzzles.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/anagram" placeholder="Enter letters to find anagrams" buttonLabel="Solve" min={2} /></div>
      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (<div key={i} style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p><p className="muted" style={{ margin: 0 }}>{f.a}</p></div>))}
      </section>
    </>
  );
}
