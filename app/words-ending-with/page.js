import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: { absolute: "Words That End With… — free word finder by ending" },
  description: "Find every word that ends with any letters — like -ing, -ed or -tion. Free lists sorted by length with Scrabble scores for Scrabble, Words With Friends and crosswords.",
  alternates: { canonical: "/words-ending-with" },
};

export default function EndingWithHub() {
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Words Ending With</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🔡</span> Words That End With…</h1>
        <p>Type an ending — like <strong>ing</strong>, <strong>ed</strong> or <strong>tion</strong> — to see every word that ends with it, sorted by length with Scrabble scores.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/words-ending-with" placeholder="Enter an ending (e.g. ing)" buttonLabel="Find words" allowWild={false} min={1} /></div>
    </>
  );
}
