import { cache } from "react";
import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";
import WordListPage from "../../components/WordListPage";
import { matchPattern } from "../../lib/wordEngine";
import { hasQuery, parsePattern, wordHref } from "../../lib/wordQuery";

// Results render per request from ?q=, so the hub is never prerendered.
export const dynamic = "force-dynamic";

const BASE = {
  title: { absolute: "Crossword Solver — free crossword clue & pattern finder" },
  description: "Solve any crossword. Enter the letters you know and underscores for the blanks (like c_t) and get every word that fits. Free, with Scrabble scores, runs in your browser.",
  alternates: { canonical: "/crossword-solver" },
};

const find = cache((p) => matchPattern(p));
const show = (p) => p.replace(/-/g, "_").toUpperCase();

// Result views (?q=) are noindexed — see app/unscramble/page.js.
export function generateMetadata({ searchParams }) {
  if (!hasQuery(searchParams)) return BASE;
  const p = parsePattern(searchParams.q);
  const count = p ? find(p).length : 0;
  return {
    ...BASE,
    title: count ? { absolute: `Crossword answers for ${show(p)} — ${count} words` } : BASE.title,
    robots: { index: false, follow: true },
  };
}

const faq = [
  { q: "How does the crossword solver work?", a: "Type the letters you already have and an underscore ( _ ) for each empty square. For example c_t returns cat, cot and cut. It checks every word of that exact length against your pattern." },
  { q: "Is it free?", a: "Yes — completely free, no sign-up, and it runs in your browser." },
  { q: "Can I use it for any word length?", a: "Yes, from 2 up to 15 letters. Just add one underscore for each blank square in the answer." },
];

const EXAMPLES = ["c-t", "-at", "s--e", "c--se", "p--nt", "w-rd", "-ing"];
const BOX = { basePath: "/crossword-solver", placeholder: "Enter a pattern, e.g. c_t", buttonLabel: "Solve", pattern: true };

export default function CrosswordHub({ searchParams }) {
  const asked = hasQuery(searchParams);
  const p = asked ? parsePattern(searchParams.q) : null;
  const words = p ? find(p) : [];

  if (words.length) {
    const shown = show(p);
    return (
      <WordListPage
        crumbs={[{ label: "Home", href: "/" }, { label: "Crossword Solver", href: "/crossword-solver" }, { label: shown }]}
        h1={`Crossword answers for “${shown}”`}
        lead={`${words.length} words fit the pattern ${shown} (${p.length} letters).`}
        box={<WordSearchBox key={p} {...BOX} initial={p.replace(/-/g, "_")} />}
        words={words}
        faq={[
          { q: `What words fit the pattern ${shown}?`, a: `${words.length} words fit ${shown}: for example ${words.slice(0, 5).join(", ")}.` },
          { q: `How do I enter a crossword pattern?`, a: `Type the letters you know and an underscore ( _ ) for each blank square. For example c_t finds cat, cot and cut.` },
        ]}
      />
    );
  }

  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      {!asked && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Crossword Solver</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">✏️</span> Crossword Solver</h1>
        <p>Enter the letters you know and an underscore ( _ ) for each blank — like <strong>c_t</strong> — to find every word that fits.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}>
        <WordSearchBox {...BOX} />
        {asked && <p className="tool-note" role="status">No words fit{p ? <> <strong>{show(p)}</strong></> : null}. Use letters and an underscore for each blank, 2–15 squares.</p>}
      </div>
      <section className="block">
        <h2 className="section-title">Example patterns</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLES.map((e) => (<Link key={e} href={wordHref("/crossword-solver", e)} prefetch={false} rel="nofollow" className="badge" style={{ textDecoration: "none" }}>{show(e)}</Link>))}
        </div>
      </section>
      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (<div key={i} style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p><p className="muted" style={{ margin: 0 }}>{f.a}</p></div>))}
      </section>
    </>
  );
}
