import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: "Crossword Solver — free crossword clue & pattern finder",
  description: "Solve any crossword. Enter the letters you know and underscores for the blanks (like c_t) and get every word that fits. Free, with Scrabble scores, runs in your browser.",
  alternates: { canonical: "/crossword-solver" },
};

const faq = [
  { q: "How does the crossword solver work?", a: "Type the letters you already have and an underscore ( _ ) for each empty square. For example c_t returns cat, cot and cut. It checks every word of that exact length against your pattern." },
  { q: "Is it free?", a: "Yes — completely free, no sign-up, and it runs in your browser." },
  { q: "Can I use it for any word length?", a: "Yes, from 2 up to 15 letters. Just add one underscore for each blank square in the answer." },
];

const EXAMPLES = ["c-t", "-at", "s--e", "c--se", "p--nt", "w-rd", "-ing"];

export default function CrosswordHub() {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav className="breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Crossword Solver</span></nav>
      <header className="page-head">
        <h1>✏️ Crossword Solver</h1>
        <p>Enter the letters you know and an underscore ( _ ) for each blank — like <strong>c_t</strong> — to find every word that fits.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/crossword-solver" placeholder="Enter a pattern, e.g. c_t" buttonLabel="Solve" pattern /></div>
      <section className="block">
        <h2 className="section-title">Example patterns</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLES.map((p) => (<Link key={p} href={`/crossword-solver/${p}`} className="badge" style={{ textDecoration: "none" }}>{p.replace(/-/g, "_").toUpperCase()}</Link>))}
        </div>
      </section>
      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (<div key={i} style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p><p className="muted" style={{ margin: 0 }}>{f.a}</p></div>))}
      </section>
    </>
  );
}
