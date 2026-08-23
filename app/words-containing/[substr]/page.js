import Link from "next/link";
import { notFound } from "next/navigation";
import { containing } from "../../../lib/wordEngine";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

const SEED = ["qu", "zz", "oo", "ee", "th", "ch", "ph", "ck", "sch", "tch", "igh", "eau", "ough"];
export function generateStaticParams() {
  return SEED.map((substr) => ({ substr }));
}

function clean(p) { return String(p || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 12); }

export function generateMetadata({ params }) {
  const p = clean(decodeURIComponent(params.substr || ""));
  if (!p) return { title: "Words Containing…" };
  const up = p.toUpperCase();
  const count = containing(p).length;
  return {
    title: `Words with ${up} in them — ${count} words`,
    description: `A complete list of ${count} words containing the letters ${up}, sorted by length with Scrabble scores. Free — great for Scrabble, Words With Friends and crosswords.`,
    robots: wordRobots(count),
    alternates: { canonical: `/words-containing/${p}` },
  };
}

export default function ContainingPage({ params }) {
  const p = clean(decodeURIComponent(params.substr || ""));
  if (!p) notFound();
  const up = p.toUpperCase();
  const words = containing(p);

  const faq = [
    { q: `How many words contain ${up}?`, a: words.length ? `There are ${words.length} words that contain the letters ${up}.` : `No words contain ${up}.` },
    { q: `Where can I use these?`, a: `Words containing a specific sequence are handy for crosswords, Scrabble, Words With Friends and word puzzles where part of the answer is already filled in.` },
  ];

  return (
    <WordListPage
      crumbs={[{ label: "Home", href: "/" }, { label: "Words Containing", href: "/words-containing" }, { label: up }]}
      h1={`Words containing “${up}”`}
      lead={words.length ? `${words.length} words contain ${up}, sorted by length.` : `No words contain ${up}.`}
      box={<WordSearchBox basePath="/words-containing" initial={p} placeholder="Enter letters to find inside words" buttonLabel="Find words" allowWild={false} min={1} />}
      words={words}
      faq={faq}
      related={
        <section className="block">
          <h2 className="section-title">Related</h2>
          <p><Link href={`/words-starting-with/${p}`}>Words starting with {up}</Link> · <Link href={`/words-ending-with/${p}`}>Words ending with {up}</Link></p>
        </section>
      }
    />
  );
}
