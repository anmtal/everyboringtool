import Link from "next/link";
import { notFound } from "next/navigation";
import { endingWith } from "../../../lib/wordEngine";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

const SEED = ["s", "e", "d", "y", "g", "r", "n", "t", "ing", "ed", "er", "ly", "es", "ion", "ness", "ment", "able", "est"];
export function generateStaticParams() {
  return SEED.map((suffix) => ({ suffix }));
}

function clean(p) { return String(p || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 12); }

export function generateMetadata({ params }) {
  const p = clean(decodeURIComponent(params.suffix || ""));
  if (!p) return { title: "Words That End With…" };
  const up = p.toUpperCase();
  const count = endingWith(p).length;
  return {
    title: `Words that end with ${up} — ${count} words`,
    description: `A complete list of ${count} words that end in ${up}, sorted by length with Scrabble scores. Free — great for Scrabble, Words With Friends and crosswords.`,
    robots: wordRobots(count),
    alternates: { canonical: `/words-ending-with/${p}` },
  };
}

export default function EndingWithPage({ params }) {
  const p = clean(decodeURIComponent(params.suffix || ""));
  if (!p) notFound();
  const up = p.toUpperCase();
  const words = endingWith(p);

  const faq = [
    { q: `How many words end with ${up}?`, a: words.length ? `There are ${words.length} words that end in ${up}.` : `No words end with ${up}.` },
    { q: `What is the shortest word ending in ${up}?`, a: words.length ? `The shortest is "${words[0]}" (${words[0].length} letters).` : `None found.` },
  ];

  return (
    <WordListPage
      crumbs={[{ label: "Home", href: "/" }, { label: "Words Ending With", href: "/words-ending-with" }, { label: up }]}
      h1={`Words that end with “${up}”`}
      lead={words.length ? `${words.length} words end in ${up}, sorted by length.` : `No words end with ${up}.`}
      box={<WordSearchBox basePath="/words-ending-with" initial={p} placeholder="Enter an ending (e.g. ing)" buttonLabel="Find words" allowWild={false} min={1} />}
      words={words}
      faq={faq}
      related={
        <section className="block">
          <h2 className="section-title">Related</h2>
          <p><Link href={`/words-starting-with/${p}`}>Words starting with {up}</Link> · <Link href={`/words-containing/${p}`}>Words containing {up}</Link></p>
        </section>
      }
    />
  );
}
