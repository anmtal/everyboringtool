import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: "Words That Start With… — free word finder by first letters",
  description: "Find every word that starts with any letter or letters. Free lists sorted by length with Scrabble scores — great for Scrabble, Words With Friends and crosswords.",
  alternates: { canonical: "/words-starting-with" },
};

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

export default function StartingWithHub() {
  return (
    <>
      <nav className="breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Words Starting With</span></nav>
      <header className="page-head">
        <h1>🔠 Words That Start With…</h1>
        <p>Pick a starting letter, or type the first few letters, to see every word that begins with them — sorted by length with Scrabble scores.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/words-starting-with" placeholder="Enter a starting letter or letters" buttonLabel="Find words" allowWild={false} min={1} /></div>
      <section className="block">
        <h2 className="section-title">Browse by first letter</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALPHA.map((l) => (<Link key={l} href={`/words-starting-with/${l}`} className="badge" style={{ textDecoration: "none" }}>{l.toUpperCase()}</Link>))}
        </div>
      </section>
    </>
  );
}
