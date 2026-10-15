import Link from "next/link";
import WordSearchBox from "../../components/WordSearchBox";

export const metadata = {
  title: { absolute: "Words That Start With… — free word finder by first letters" },
  description: "Find every word that starts with any letter or letters. Free lists sorted by length with Scrabble scores — great for Scrabble, Words With Friends and crosswords.",
  alternates: { canonical: "/words-starting-with" },
};

export default function StartingWithHub() {
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep">/</span><span>Words Starting With</span></nav>
      <header className="page-head">
        <h1><span aria-hidden="true">🔠</span> Words That Start With…</h1>
        <p>Type a starting letter, or the first few letters, to see every word that begins with them — sorted by length with Scrabble scores.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}><WordSearchBox basePath="/words-starting-with" placeholder="Enter a starting letter or letters" buttonLabel="Find words" allowWild={false} min={1} /></div>
    </>
  );
}
