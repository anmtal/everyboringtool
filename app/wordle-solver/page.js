import Link from "next/link";
import WordleSolver from "../../components/WordleSolver";

export const metadata = {
  title: "Wordle Solver — free Wordle helper & answer finder",
  description: "Solve today's Wordle. Enter your green, yellow and grey clues and instantly see every possible 5-letter answer. Free, no sign-up, runs in your browser.",
  alternates: { canonical: "/wordle-solver" },
};

const faq = [
  { q: "How does the Wordle solver work?", a: "Type the clues from your guesses — green for a correct letter in the right spot, yellow for a letter that's in the word but the wrong spot, and grey for letters that aren't in the word. It filters an 8,600-word list down to every remaining possibility." },
  { q: "Is it cheating?", a: "It's a helper — use it to learn, to get unstuck, or to keep your streak alive. It only narrows the possibilities; you still choose the answer." },
  { q: "Is it free?", a: "Yes — completely free, no sign-up, and it runs entirely in your browser, so your guesses never leave your device." },
];

export default function WordleSolverPage() {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav className="breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Wordle Solver</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🟩</span> Wordle Solver</h1>
        <p>Stuck on today's Wordle? Enter your green, yellow and grey clues and see every possible answer instantly.</p>
      </header>
      <WordleSolver />
      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (<div key={i} style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p><p className="muted" style={{ margin: 0 }}>{f.a}</p></div>))}
      </section>
      <section className="block">
        <h2 className="section-title">More word games</h2>
        <p><Link href="/unscramble">Word Unscrambler</Link> · <Link href="/anagram">Anagram Solver</Link> · <Link href="/words-starting-with">Words starting with…</Link></p>
      </section>
    </>
  );
}
