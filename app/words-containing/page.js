import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: "Words Containing… — free word finder by letters inside",
  description: "Find every word that contains a sequence of letters, like QU or OUGH. Free lists sorted by length with Scrabble scores for Scrabble, Words With Friends and crosswords.",
  alternates: { canonical: "/words-containing" },
};

const SEEDS = ["qu", "zz", "oo", "ee", "th", "ch", "ph", "ck", "sch", "tch", "igh", "eau", "ough", "x", "z", "j"];

export default function ContainingHub() {
  return (
    <>
      <nav className="breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Words Containing</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🔍</span> Words Containing…</h1>
        <p>Type a sequence of letters to see every word that contains it anywhere — handy for crosswords, Scrabble and Words With Friends.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/words-containing" placeholder="Enter letters to find inside words" buttonLabel="Find words" allowWild={false} min={1} /></div>
      <section className="block">
        <h2 className="section-title">Popular searches</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SEEDS.map((l) => (<Link key={l} href={`/words-containing/${l}`} className="badge" style={{ textDecoration: "none" }}>{l.toUpperCase()}</Link>))}
        </div>
      </section>
    </>
  );
}
