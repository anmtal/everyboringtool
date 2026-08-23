import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: "Words That End With… — free word finder by ending",
  description: "Find every word that ends with any letters — like -ing, -ed or -tion. Free lists sorted by length with Scrabble scores for Scrabble, Words With Friends and crosswords.",
  alternates: { canonical: "/words-ending-with" },
};

const ENDINGS = ["s", "e", "d", "y", "g", "r", "n", "t", "ing", "ed", "er", "ly", "es", "ion", "ness", "ment", "able", "est", "ous", "ful"];

export default function EndingWithHub() {
  return (
    <>
      <nav className="breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Words Ending With</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🔡</span> Words That End With…</h1>
        <p>Type an ending — like <strong>ing</strong>, <strong>ed</strong> or <strong>tion</strong> — to see every word that ends with it, sorted by length with Scrabble scores.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/words-ending-with" placeholder="Enter an ending (e.g. ing)" buttonLabel="Find words" allowWild={false} min={1} /></div>
      <section className="block">
        <h2 className="section-title">Popular endings</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ENDINGS.map((l) => (<Link key={l} href={`/words-ending-with/${l}`} className="badge" style={{ textDecoration: "none" }}>-{l.toUpperCase()}</Link>))}
        </div>
      </section>
    </>
  );
}
